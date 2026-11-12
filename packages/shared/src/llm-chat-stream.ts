/** Минимум токенов ответа, чтобы рассуждение не съело видимый текст. */
export const REASONING_COMPLETION_TOKEN_FLOOR = 16_000;

export const REASONING_EFFORT_LOW = "low";

/** Как провайдер принимает ограничение рассуждения. */
export type LlmReasoningStyle = "moonshot" | "openrouter";

export type LlmCompletionTokenField = "max_tokens" | "max_completion_tokens";

export interface LlmTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatStreamState {
  content: string;
  reasoningContent: string;
  finishReason?: string;
  usage?: LlmTokenUsage;
}

export interface ChatCompletionResult {
  content: string;
  reasoningContent?: string;
  usage?: LlmTokenUsage;
  finishReason?: string;
}

const REASONING_MODEL_ID = /kimi|thinking|reasoner|(?:^|[/:])o1|(?:^|[/:])o3|gpt-5/i;

export function modelUsesReasoningBudget(model: string): boolean {
  return REASONING_MODEL_ID.test(model);
}

export function createChatStreamState(): ChatStreamState {
  return { content: "", reasoningContent: "" };
}

export function readMessageText(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }
      if (!part || typeof part !== "object") {
        return "";
      }
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join("");
}

function readNonNegativeInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  return Math.floor(value);
}

export function readTokenUsage(raw: unknown): LlmTokenUsage | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const record = raw as Record<string, unknown>;
  const promptTokens = readNonNegativeInt(record.prompt_tokens ?? record.promptTokenCount);
  const completionTokens = readNonNegativeInt(
    record.completion_tokens ?? record.candidatesTokenCount,
  );
  const totalTokens = readNonNegativeInt(record.total_tokens ?? record.totalTokenCount);

  if (promptTokens === undefined && completionTokens === undefined && totalTokens === undefined) {
    return undefined;
  }

  const prompt = promptTokens ?? 0;
  const completion = completionTokens ?? 0;
  return {
    promptTokens: prompt,
    completionTokens: completion,
    totalTokens: totalTokens ?? prompt + completion,
  };
}

export function addTokenUsage(
  left: LlmTokenUsage | undefined,
  right: LlmTokenUsage | undefined,
): LlmTokenUsage | undefined {
  if (!left) {
    return right;
  }
  if (!right) {
    return left;
  }
  return {
    promptTokens: left.promptTokens + right.promptTokens,
    completionTokens: left.completionTokens + right.completionTokens,
    totalTokens: left.totalTokens + right.totalTokens,
  };
}

function appendUnique(current: string, next: string): string {
  if (!next) {
    return current;
  }
  if (!current) {
    return next;
  }
  if (next.startsWith(current)) {
    return next;
  }
  return current + next;
}

function readReasoningText(record: Record<string, unknown>): string {
  const reasoningContent = record.reasoning_content;
  if (typeof reasoningContent === "string") {
    return reasoningContent;
  }
  const reasoning = record.reasoning;
  if (typeof reasoning === "string") {
    return reasoning;
  }
  return "";
}

function consumeMessage(state: ChatStreamState, message: Record<string, unknown>, replace: boolean): void {
  const text = readMessageText(message.content);
  const reasoning = readReasoningText(message);
  if (replace) {
    if (text) {
      state.content = text;
    }
    if (reasoning) {
      state.reasoningContent = reasoning;
    }
    return;
  }
  state.content = appendUnique(state.content, text);
  state.reasoningContent = appendUnique(state.reasoningContent, reasoning);
}

/** Один объект Chat Completions: полный ответ или чанк SSE. Рассуждение в ответ не подставляется. */
export function consumeChatCompletionPayload(state: ChatStreamState, payload: unknown): void {
  if (!payload || typeof payload !== "object") {
    return;
  }

  const record = payload as Record<string, unknown>;
  const usage = readTokenUsage(record.usage);
  if (usage) {
    state.usage = usage;
  }

  const choices = record.choices;
  if (!Array.isArray(choices)) {
    return;
  }

  const choice = choices[0];
  if (!choice || typeof choice !== "object") {
    return;
  }

  const choiceRecord = choice as Record<string, unknown>;
  if (typeof choiceRecord.finish_reason === "string" && choiceRecord.finish_reason) {
    state.finishReason = choiceRecord.finish_reason;
  }

  const delta = choiceRecord.delta;
  if (delta && typeof delta === "object") {
    consumeMessage(state, delta as Record<string, unknown>, false);
  }

  const message = choiceRecord.message;
  if (message && typeof message === "object") {
    consumeMessage(state, message as Record<string, unknown>, true);
  }
}

export function completionFromState(state: ChatStreamState): ChatCompletionResult {
  return {
    content: state.content,
    ...(state.reasoningContent ? { reasoningContent: state.reasoningContent } : {}),
    ...(state.usage ? { usage: state.usage } : {}),
    ...(state.finishReason ? { finishReason: state.finishReason } : {}),
  };
}

export function applyCompletionTokenLimit(
  body: Record<string, unknown>,
  input: {
    field: LlmCompletionTokenField;
    floor?: number;
  },
): void {
  const currentMaxTokens = readNonNegativeInt(body.max_tokens);
  const currentCompletion = readNonNegativeInt(body.max_completion_tokens);
  const requested = currentMaxTokens ?? currentCompletion;
  const floor = input.floor;
  const limit =
    requested === undefined
      ? floor
      : floor === undefined
        ? requested
        : Math.max(requested, floor);

  delete body.max_tokens;
  delete body.max_completion_tokens;
  if (limit !== undefined) {
    body[input.field] = limit;
  }
}

export function shouldLimitReasoning(input: {
  style?: LlmReasoningStyle;
  model: string;
  forceLowEffort: boolean;
}): boolean {
  if (input.style === "moonshot") {
    return true;
  }
  if (input.style !== "openrouter") {
    return false;
  }
  return input.forceLowEffort || modelUsesReasoningBudget(input.model);
}

/** Поле reasoning у OpenRouter или reasoning_effort у Kimi. Чужим провайдерам ничего не добавляет. */
export function applyReasoningControls(
  body: Record<string, unknown>,
  input: {
    style?: LlmReasoningStyle;
    model: string;
    forceLowEffort: boolean;
    floor: number;
    tokenField: LlmCompletionTokenField;
  },
): void {
  if (!shouldLimitReasoning(input)) {
    return;
  }

  applyCompletionTokenLimit(body, { field: input.tokenField, floor: input.floor });
  if (input.style === "moonshot") {
    body.reasoning_effort = REASONING_EFFORT_LOW;
    return;
  }
  body.reasoning = { effort: REASONING_EFFORT_LOW };
}

export async function* iterateSseData(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value ?? new Uint8Array(), { stream: !chunk.done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const data = sseData(line);
        if (data !== null) {
          yield data;
        }
      }
      if (chunk.done) {
        const data = sseData(buffer);
        if (data !== null) {
          yield data;
        }
        return;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

function sseData(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) {
    return null;
  }
  return trimmed.slice("data:".length).trim();
}

export async function consumeSseChatStream(
  body: ReadableStream<Uint8Array>,
  onUpdate?: (state: ChatStreamState) => void,
): Promise<ChatStreamState> {
  const state = createChatStreamState();
  for await (const data of iterateSseData(body)) {
    if (!data || data === "[DONE]") {
      continue;
    }
    try {
      consumeChatCompletionPayload(state, JSON.parse(data) as unknown);
    } catch {
      continue;
    }
    onUpdate?.(state);
  }
  return state;
}

export function encodeSseEvent(payload: unknown): string {
  return `data: ${JSON.stringify(payload)}\n\n`;
}
