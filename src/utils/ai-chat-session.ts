import {
  AI_CHAT_SECRET_SCAN_MIN_TOKEN_LENGTH,
  AI_CHAT_TITLE_MAX_CHARS,
} from "@/constants/ai-chat";
import type {
  AiChatMessage,
  AiChatSession,
  AiChatShareSnapshot,
} from "@/types/ai-chat-session";
import type { DiagramFormat } from "@/constants/diagram-format-ids";

export function createAiChatMessageId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createAiChatSession(input: {
  documentKey: string;
  diagramFormat: DiagramFormat;
  title: string;
}): AiChatSession {
  const now = new Date().toISOString();
  return {
    id: createAiChatMessageId(),
    documentKey: input.documentKey,
    title: input.title,
    pinned: false,
    intent: "free",
    diagramFormat: input.diagramFormat,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Заголовок сессии из первого сообщения пользователя. */
export function deriveAiChatSessionTitle(firstMessage: string): string {
  const singleLine = firstMessage.trim().replace(/\s+/g, " ");
  if (!singleLine) {
    return "";
  }
  return singleLine.length > AI_CHAT_TITLE_MAX_CHARS
    ? `${singleLine.slice(0, AI_CHAT_TITLE_MAX_CHARS - 1)}…`
    : singleLine;
}

/** Закреплённые сверху, затем по дате последнего изменения. */
export function sortAiChatSessions(sessions: AiChatSession[]): AiChatSession[] {
  return [...sessions].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function filterAiChatSessions(
  sessions: AiChatSession[],
  query: string,
): AiChatSession[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return sessions;
  }
  return sessions.filter(
    (session) =>
      session.title.toLowerCase().includes(needle) ||
      session.messages.some((message) =>
        message.content.toLowerCase().includes(needle),
      ),
  );
}

export function buildAiChatTranscriptMarkdown(
  session: AiChatSession,
  labels: { user: string; assistant: string },
): string {
  const lines = [`# ${session.title}`, ""];
  for (const message of session.messages) {
    lines.push(`## ${message.role === "user" ? labels.user : labels.assistant}`);
    lines.push("");
    lines.push(message.content);
    if (message.proposal) {
      lines.push("");
      lines.push("```");
      lines.push(message.proposal.proposedSource);
      lines.push("```");
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function buildAiChatShareSnapshot(
  session: AiChatSession,
  source: string,
): AiChatShareSnapshot {
  return {
    kind: "ai-chat-session",
    version: 1,
    title: session.title,
    diagramFormat: session.diagramFormat,
    source,
    messages: session.messages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
    sharedAt: new Date().toISOString(),
  };
}

const SECRET_KEYWORD_PATTERN =
  /(api[_-]?key|access[_-]?token|password|passwd|secret)\s*[:=]\s*\S+/i;
const LONG_TOKEN_PATTERN = new RegExp(
  `\\b[A-Za-z0-9+/=_-]{${AI_CHAT_SECRET_SCAN_MIN_TOKEN_LENGTH},}\\b`,
);

/** Эвристика перед шарингом: фрагменты, похожие на секреты. Не гарантия, а предупреждение. */
export function findSecretLikeFragments(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(new RegExp(SECRET_KEYWORD_PATTERN, "gi"))) {
    found.add(match[0].slice(0, 40));
  }
  for (const match of text.matchAll(new RegExp(LONG_TOKEN_PATTERN, "g"))) {
    const token = match[0];
    // Длинный токен считаем подозрительным только рядом с ключевым словом секрета.
    const windowStart = Math.max(0, (match.index ?? 0) - 40);
    const context = text.slice(windowStart, (match.index ?? 0) + token.length);
    if (SECRET_KEYWORD_PATTERN.test(context)) {
      found.add(token.slice(0, 40));
    }
  }
  return [...found];
}

export function countAiChatMessages(sessions: AiChatSession[]): number {
  return sessions.reduce((total, session) => total + session.messages.length, 0);
}

export function isProposalStale(
  message: AiChatMessage,
  currentSource: string,
): boolean {
  return Boolean(
    message.proposal &&
      message.proposal.status === "pending" &&
      message.proposal.baseSource !== currentSource,
  );
}
