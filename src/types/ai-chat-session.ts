import type { AiChatAttachmentKind } from "@/constants/ai-chat";
import type { DiagramFormat } from "@/constants/diagram-format-ids";

/** Файл, прикреплённый к сообщению. Байты картинки здесь не хранятся. */
export interface AiChatAttachment {
  name: string;
  kind: AiChatAttachmentKind;
  mimeType: string;
  textExcerpt?: string;
}

export type AiChatIntent = "create" | "edit" | "explain" | "free";

export type AiProposalStatus = "pending" | "applied" | "rejected" | "stale";

export interface AiChatProposal {
  id: string;
  /** Исходник, на котором построено предложение: если текущий source ушёл от него — предложение stale. */
  baseSource: string;
  proposedSource: string;
  explanation: string;
  status: AiProposalStatus;
}

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: AiChatAttachment[];
  proposal?: AiChatProposal;
  clarificationQuestions?: string[];
  /** Подсказки «Что дальше» от модели: каждая — готовое следующее сообщение пользователя. */
  nextSteps?: string[];
  createdAt: string;
  /** Фактический провайдер/модель ответа ассистента, если известны. */
  model?: string;
}

export interface AiChatSession {
  id: string;
  documentKey: string;
  title: string;
  pinned: boolean;
  intent: AiChatIntent;
  diagramFormat: DiagramFormat;
  messages: AiChatMessage[];
  summary?: string;
  createdAt: string;
  updatedAt: string;
}

/** Снимок сессии для кнопки «Поделиться» (серверный или файловый). */
export interface AiChatShareSnapshot {
  kind: "ai-chat-session";
  version: 1;
  title: string;
  diagramFormat: DiagramFormat;
  source: string;
  messages: Array<{
    role: AiChatMessage["role"];
    content: string;
    createdAt: string;
  }>;
  sharedAt: string;
}
