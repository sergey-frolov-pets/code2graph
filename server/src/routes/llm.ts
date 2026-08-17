import { Hono } from "hono";
import {
  GEMINI_API_KEY,
  GROQ_API_KEY,
  OPENROUTER_API_KEY,
  LLM_RATE_LIMIT_PER_MINUTE,
} from "../config.js";
import {
  containsForbiddenClientLlmKeyField,
  parseLlmProxyChatBody,
  type LlmChatMessage,
} from "../llm-proxy-request.js";
import {
  FREE_BUILTIN_LLM_PROVIDERS,
  type FreeBuiltinLlmProviderId,
} from "../llm-providers.js";

export type { LlmChatMessage } from "../llm-proxy-request.js";

export interface LlmChatResponseBody {
  content: string;
  providerId: string;
  model: string;
}

type RateLimitEntry = {
  count: number;
  windowStartMs: number;
};

const rateLimitByIp = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW_MS = 60_000;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitByIp.get(ip);

  if (!entry || now - entry.windowStartMs >= RATE_LIMIT_WINDOW_MS) {
    rateLimitByIp.set(ip, { count: 1, windowStartMs: now });
    return false;
  }

  if (entry.count >= LLM_RATE_LIMIT_PER_MINUTE) {
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

async function callGemini(
  apiKey: string,
  model: string,
  messages: LlmChatMessage[],
  jsonMode: boolean,
): Promise<string> {
  const systemMessage = messages.find((message) => message.role === "system");
  const contents = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    }));

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: systemMessage
        ? { parts: [{ text: systemMessage.content }] }
        : undefined,
      contents,
      generationConfig: jsonMode
        ? { responseMimeType: "application/json" }
        : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini API returned empty response");
  }

  return text;
}

async function callOpenAiCompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: LlmChatMessage[],
  jsonMode: boolean,
  extraHeaders?: Record<string, string>,
): Promise<string> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: jsonMode ? { type: "json_object" } : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM API returned empty response");
  }

  return content;
}

async function dispatchLlmChat(
  providerId: FreeBuiltinLlmProviderId,
  messages: LlmChatMessage[],
  jsonMode: boolean,
  apiKey: string,
): Promise<LlmChatResponseBody> {
  const config = FREE_BUILTIN_LLM_PROVIDERS[providerId];

  let content: string;

  switch (providerId) {
    case "google-gemini-free":
      content = await callGemini(apiKey, config.model, messages, jsonMode);
      break;
    case "groq-free":
      content = await callOpenAiCompatible(
        "https://api.groq.com/openai/v1/chat/completions",
        apiKey,
        config.model,
        messages,
        jsonMode,
      );
      break;
    case "openrouter-free":
      content = await callOpenAiCompatible(
        "https://openrouter.ai/api/v1/chat/completions",
        apiKey,
        config.model,
        messages,
        jsonMode,
        {
          "HTTP-Referer": "https://github.com/sergey-frolov-pets/code2graph",
          "X-Title": "Code2Graph",
        },
      );
      break;
    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }

  return {
    content,
    providerId,
    model: config.model,
  };
}

export const llmRouter = new Hono();

llmRouter.post("/chat", async (context) => {
  const clientIp = getClientIp(context.req.raw);

  if (isRateLimited(clientIp)) {
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

  try {
    const result = await dispatchLlmChat(
      body.providerId,
      body.messages,
      body.jsonMode ?? false,
      apiKey,
    );
    return context.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown LLM proxy error";
    return context.json({ error: "llm_upstream_error", message }, 502);
  }
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
