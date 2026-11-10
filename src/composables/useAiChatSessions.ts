import { computed, ref, type Ref } from "vue";
import {
  AI_CHAT_RECENT_MESSAGES,
  AI_CHAT_SUMMARY_TRIGGER_MESSAGES,
} from "@/constants/ai-chat";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { buildAiChatSummaryPrompt } from "@/services/llm/ai-chat-prompts";
import { runAiChatUtilityPrompt } from "@/services/llm/ai-chat-client";
import {
  deleteAiChatSessions,
  deleteUnpinnedAiChatSessions,
  listAiChatSessions,
  putAiChatSession,
} from "@/storage/ai-chat-sessions";
import type { AiChatSession } from "@/types/ai-chat-session";
import {
  createAiChatSession,
  deriveAiChatSessionTitle,
} from "@/utils/ai-chat-session";
import { stripJsonCodeFence } from "@/schemas/plantuml-llm-output";

export function useAiChatSessions(
  documentKey: Ref<string>,
  diagramFormat: Ref<DiagramFormat>,
  defaultTitle: () => string,
) {
  const sessions = ref<AiChatSession[]>([]);
  const activeSessionId = ref<string | null>(null);
  const isLoading = ref(false);

  const activeSession = computed<AiChatSession | null>(
    () =>
      sessions.value.find((session) => session.id === activeSessionId.value) ??
      null,
  );

  async function load(): Promise<void> {
    isLoading.value = true;
    try {
      sessions.value = await listAiChatSessions(documentKey.value || undefined);
      if (
        !activeSessionId.value ||
        !sessions.value.some((session) => session.id === activeSessionId.value)
      ) {
        activeSessionId.value = sessions.value[0]?.id ?? null;
      }
    } finally {
      isLoading.value = false;
    }
  }

  async function persist(session: AiChatSession): Promise<void> {
    session.updatedAt = new Date().toISOString();
    await putAiChatSession(session);
    const index = sessions.value.findIndex((entry) => entry.id === session.id);
    if (index >= 0) {
      sessions.value.splice(index, 1, { ...session });
    } else {
      sessions.value.unshift(session);
    }
    sessions.value = [...sessions.value].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  async function createSession(): Promise<AiChatSession> {
    const session = createAiChatSession({
      documentKey: documentKey.value,
      diagramFormat: diagramFormat.value,
      title: defaultTitle(),
    });
    await persist(session);
    activeSessionId.value = session.id;
    return session;
  }

  async function ensureActiveSession(): Promise<AiChatSession> {
    return activeSession.value ?? createSession();
  }

  function selectSession(id: string): void {
    activeSessionId.value = id;
  }

  async function renameSession(id: string, title: string): Promise<void> {
    const session = sessions.value.find((entry) => entry.id === id);
    if (!session || !title.trim()) {
      return;
    }
    session.title = title.trim();
    await persist(session);
  }

  async function togglePin(id: string): Promise<void> {
    const session = sessions.value.find((entry) => entry.id === id);
    if (!session) {
      return;
    }
    session.pinned = !session.pinned;
    await persist(session);
  }

  async function duplicateSession(id: string): Promise<void> {
    const source = sessions.value.find((entry) => entry.id === id);
    if (!source) {
      return;
    }
    const copy: AiChatSession = {
      ...source,
      id: `${source.id}-copy-${Date.now()}`,
      title: `${source.title} (copy)`,
      pinned: false,
      messages: source.messages.map((message) => ({
        ...message,
        proposal: message.proposal
          ? { ...message.proposal, status: "pending" as const }
          : undefined,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await persist(copy);
    activeSessionId.value = copy.id;
  }

  async function removeSessions(ids: string[]): Promise<void> {
    await deleteAiChatSessions(ids);
    sessions.value = sessions.value.filter(
      (session) => !ids.includes(session.id),
    );
    if (activeSessionId.value && ids.includes(activeSessionId.value)) {
      activeSessionId.value = sessions.value[0]?.id ?? null;
    }
  }

  async function removeAllUnpinned(): Promise<void> {
    await deleteUnpinnedAiChatSessions(documentKey.value || undefined);
    sessions.value = sessions.value.filter((session) => session.pinned);
    if (
      activeSessionId.value &&
      !sessions.value.some((session) => session.id === activeSessionId.value)
    ) {
      activeSessionId.value = sessions.value[0]?.id ?? null;
    }
  }

  /** Заголовок из первого сообщения, если пользователь не переименовал вручную. */
  function applyDerivedTitle(session: AiChatSession): void {
    const firstUser = session.messages.find((message) => message.role === "user");
    if (firstUser && session.title === defaultTitle()) {
      const derived = deriveAiChatSessionTitle(firstUser.content);
      if (derived) {
        session.title = derived;
      }
    }
  }

  /** Свёртка старой части диалога в summary, чтобы длинная сессия не теряла начало. */
  async function maybeSummarize(session: AiChatSession): Promise<void> {
    if (session.messages.length <= AI_CHAT_SUMMARY_TRIGGER_MESSAGES) {
      return;
    }
    const oldPart = session.messages.slice(
      0,
      session.messages.length - AI_CHAT_RECENT_MESSAGES,
    );
    if (oldPart.length === 0) {
      return;
    }
    try {
      const fragment = oldPart
        .map((message) => `${message.role}: ${message.content}`)
        .join("\n");
      const raw = await runAiChatUtilityPrompt(
        buildAiChatSummaryPrompt(fragment),
      );
      const parsed = JSON.parse(stripJsonCodeFence(raw)) as {
        summary?: string;
      };
      if (parsed.summary?.trim()) {
        session.summary = parsed.summary.trim();
        await persist(session);
      }
    } catch {
      // Свёртка — фоновая оптимизация контекста, её сбой не должен ломать чат.
    }
  }

  return {
    sessions,
    activeSession,
    activeSessionId,
    isLoading,
    load,
    persist,
    createSession,
    ensureActiveSession,
    selectSession,
    renameSession,
    togglePin,
    duplicateSession,
    removeSessions,
    removeAllUnpinned,
    applyDerivedTitle,
    maybeSummarize,
  };
}
