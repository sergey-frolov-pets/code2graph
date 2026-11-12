import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import { getRequestUser, type AuthVariables } from "../auth/context.js";
import { BILLING_LLM_TOKEN_COST } from "../billing/constants.js";
import { llmAccessFor } from "../billing/limits.js";
import { debitTokens, readBalances } from "../billing/service.js";
import { getDb } from "../db.js";
import { userAllowsLlmProxy } from "../services/subscription-feature-access.js";
import {
  GEMINI_API_KEY,
  GROQ_API_KEY,
  OPENROUTER_API_KEY,
  LLM_RATE_LIMIT_PER_MINUTE,
  LLM_MAX_OUTPUT_TOKENS,
} from "../config.js";
import { encodeSseEvent } from "../../../packages/shared/src/llm-chat-stream.js";
import {
  containsForbiddenClientLlmKeyField,
  parseLlmProxyChatBody,
} from "../llm-proxy-request.js";
import {
  FREE_BUILTIN_LLM_PROVIDERS,
  type FreeBuiltinLlmProviderId,
} from "../llm-providers.js";
import { dispatchLlmChat } from "../llm-upstream.js";

export type { LlmChatMessage } from "../llm-proxy-request.js";

export interface LlmChatResponseBody {
  content: string;
  providerId: string;
  model: string;
}

/** Пока апстрим молчит, шлём ping, чтобы шлюз не оборвал ожидание. */
const PROXY_PING_INTERVAL_MS = 15_000;

type RateLimitEntry = {
  count: number;
  windowStartMs: number;
};

const rateLimitByIp = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  const entry = rateLimitByIp.get(key);

  if (!entry || now - entry.windowStartMs >= RATE_LIMIT_WINDOW_MS) {
    rateLimitByIp.set(key, { count: 1, windowStartMs: now });
    return false;
  }

  if (entry.count >= limit) {
    return true;
  }

  entry.count += 1;
  return false;
}

function resolveProviderApiKey(
  providerId: FreeBuiltinLlmProviderId,
): string | undefined {
  const config = FREE_BUILTIN_LLM_PROVIDERS[providerId];

  switch (config.envKey) {
    case "GEMINI_API_KEY":
      return GEMINI_API_KEY;
    case "GROQ_API_KEY":
      return GROQ_API_KEY;
    case "OPENROUTER_API_KEY":
      return OPENROUTER_API_KEY;
    default:
      return undefined;
  }
}

export const llmRouter = new Hono<{ Variables: AuthVariables }>();

llmRouter.post("/chat", async (context) => {
  const user = getRequestUser(context);
  if (!user) {
    return context.json({ error: "unauthorized" }, 401);
  }

  const database = getDb();
  if (!userAllowsLlmProxy(database, user)) {
    return context.json(
      {
        error: "forbidden",
        message: "LLM proxy is not included in your subscription",
      },
      403,
    );
  }

  const access = llmAccessFor(database, user.id);
  if (isRateLimited(user.id, access.ratePerMinute)) {
    return context.json(
      { error: "rate_limit", message: "Too many LLM requests. Try again later." },
      429,
    );
  }

  let rawBody: unknown;

  try {
    rawBody = await context.req.json();
  } catch {
    return context.json({ error: "invalid_json", message: "Invalid JSON body" }, 400);
  }

  if (containsForbiddenClientLlmKeyField(rawBody)) {
    return context.json(
      {
        error: "user_api_key_forbidden",
        message:
          "BYOK LLM API keys must not be sent to this server. Configure keys in the browser only.",
      },
      400,
    );
  }

  const body = parseLlmProxyChatBody(rawBody);
  if (!body) {
    return context.json(
      {
        error: "invalid_body",
        message: "Expected providerId (free_builtin) and non-empty messages",
      },
      400,
    );
  }

  const apiKey = resolveProviderApiKey(body.providerId);
  if (!apiKey) {
    return context.json(
      {
        error: "provider_not_configured",
        message: `Server API key is not configured for ${body.providerId}`,
        providerId: body.providerId,
      },
      503,
    );
  }

  const balances = readBalances(database, user.id);
  if (balances.included + balances.purchased < BILLING_LLM_TOKEN_COST) {
    return context.json(
      { error: "insufficient_tokens", message: "Недостаточно токенов для серверного AI" },
      402,
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const write = (payload: unknown) => {
        if (closed) {
          return;
        }
        controller.enqueue(encoder.encode(encodeSseEvent(payload)));
      };
      const ping = setInterval(() => write({ type: "ping" }), PROXY_PING_INTERVAL_MS);
      try {
        const result = await dispatchLlmChat(
          body.providerId,
          body.messages,
          body.jsonMode ?? false,
          apiKey,
          access.maxOutputTokens,
          {
            onDelta: (content) => write({ type: "delta", content }),
            onWaiting: () => write({ type: "ping" }),
          },
        );
        debitTokens(database, user.id, BILLING_LLM_TOKEN_COST, randomUUID());
        write({
          type: "done",
          content: result.content,
          providerId: result.providerId,
          model: result.model,
          ...(result.usage ? { usage: result.usage } : {}),
          ...(result.reasoningContent ? { reasoningContent: result.reasoningContent } : {}),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown LLM proxy error";
        write({ type: "error", message });
      } finally {
        clearInterval(ping);
        closed = true;
        controller.close();
      }
    },
  });

  return context.body(stream, 200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });
});

llmRouter.get("/status", (context) => {
  const providers = Object.values(FREE_BUILTIN_LLM_PROVIDERS).map((provider) => ({
    id: provider.id,
    model: provider.model,
    configured: Boolean(resolveProviderApiKey(provider.id)),
  }));

  return context.json({
    ok: true,
    rateLimitPerMinute: LLM_RATE_LIMIT_PER_MINUTE,
    providers,
  });
});
