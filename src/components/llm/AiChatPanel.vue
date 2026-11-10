<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import type { LayoutEngine } from "@/constants";
import {
  AI_CHAT_APPLY_MODE_STORAGE_KEY,
  AI_CHAT_DEFAULT_APPLY_MODE,
  AI_CHAT_MESSAGE_MAX_CHARS,
  type AiChatApplyMode,
} from "@/constants/ai-chat";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import type { RenderMode } from "@/constants/render-settings";
import { readStorageItem, writeStorageItem } from "@/core/safe-storage";
import { useAppDialog } from "@/composables/useAppDialog";
import { useAiChatSessions } from "@/composables/useAiChatSessions";
import { useLocale } from "@/composables/useLocale";
import { sendAiChatMessage } from "@/services/llm/ai-chat-client";
import {
  createAiChatShareLink,
  isAiChatShareServerAvailable,
  revokeAiChatShareLink,
} from "@/services/library/api/ai-chat-share";
import { buildSimpleDiffPreview } from "@/utils/llm-preview";
import {
  buildAiChatShareSnapshot,
  buildAiChatTranscriptMarkdown,
  countAiChatMessages,
  createAiChatMessageId,
  filterAiChatSessions,
  findSecretLikeFragments,
} from "@/utils/ai-chat-session";
import type { AiChatMessage, AiChatSession } from "@/types/ai-chat-session";

const props = defineProps<{
  source: string;
  diagramFormat: DiagramFormat;
  documentKey: string;
  layout: LayoutEngine;
  renderMode: RenderMode;
  diagramDarkMode: boolean;
  renderError?: string;
}>();

const emit = defineEmits<{
  applySource: [payload: { source: string; label: string }];
  openSettings: [];
}>();

const { t } = useLocale();
const { confirm } = useAppDialog();

const documentKeyRef = computed(() => props.documentKey);
const formatRef = computed(() => props.diagramFormat);
const sessionsApi = useAiChatSessions(documentKeyRef, formatRef, () =>
  t("aiChat.defaultSessionTitle"),
);
const {
  sessions,
  activeSession,
  activeSessionId,
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
} = sessionsApi;

const draft = ref("");
const isBusy = ref(false);
const errorMessage = ref("");
const historyOpen = ref(false);
const historyQuery = ref("");
const selectedIds = ref<Set<string>>(new Set());
const shareOpen = ref(false);
const shareUrl = ref("");
const shareToken = ref("");
const shareError = ref("");
const isSharing = ref(false);
const diffOpenFor = ref<Set<string>>(new Set());
const renameDraft = ref("");
const renamingId = ref<string | null>(null);

const storedApplyMode = readStorageItem(AI_CHAT_APPLY_MODE_STORAGE_KEY);
const applyMode = ref<AiChatApplyMode>(
  storedApplyMode === "immediate" ? "immediate" : AI_CHAT_DEFAULT_APPLY_MODE,
);
watch(applyMode, (mode) => writeStorageItem(AI_CHAT_APPLY_MODE_STORAGE_KEY, mode));

let generationToken = 0;

const filteredSessions = computed(() =>
  filterAiChatSessions(sessions.value, historyQuery.value),
);
const totalMessages = computed(() => countAiChatMessages(sessions.value));
const canSend = computed(
  () => draft.value.trim().length > 0 && !isBusy.value,
);
const serverShareAvailable = computed(() => isAiChatShareServerAvailable());

const secretWarnings = computed(() => {
  if (!activeSession.value) {
    return [];
  }
  const transcript = buildAiChatTranscriptMarkdown(activeSession.value, {
    user: t("llm.chat.roleUser"),
    assistant: t("llm.chat.roleAssistant"),
  });
  return findSecretLikeFragments(`${transcript}\n${props.source}`);
});

/** Подсказки «Что дальше»: от модели, а до первого ответа — стартовые по состоянию диаграммы. */
const nextStepSuggestions = computed<string[]>(() => {
  const session = activeSession.value;
  const lastAssistant = [...(session?.messages ?? [])]
    .reverse()
    .find((message) => message.role === "assistant");
  if (lastAssistant?.nextSteps && lastAssistant.nextSteps.length > 0) {
    return lastAssistant.nextSteps;
  }
  if (!session || session.messages.length === 0) {
    return props.source.trim()
      ? [t("aiChat.starterEdit"), t("aiChat.starterExplain")]
      : [t("aiChat.starterCreate"), t("aiChat.starterExplain")];
  }
  return props.source.trim()
    ? [t("aiChat.starterEdit"), t("aiChat.starterExplain")]
    : [t("aiChat.starterCreate")];
});

onMounted(() => {
  void load();
});

watch(documentKeyRef, () => {
  selectedIds.value = new Set();
  void load();
});

function toggleSelected(id: string, checked: boolean): void {
  const next = new Set(selectedIds.value);
  if (checked) {
    next.add(id);
  } else {
    next.delete(id);
  }
  selectedIds.value = next;
}

async function onDeleteSelected(): Promise<void> {
  const ids = [...selectedIds.value];
  if (ids.length === 0) {
    return;
  }
  const ok = await confirm({
    title: t("aiChat.confirmDeleteTitle"),
    message: t("aiChat.confirmDeleteMany", { count: ids.length }),
    confirmLabel: t("aiChat.delete"),
    cancelLabel: t("app.cancel"),
  });
  if (!ok) {
    return;
  }
  await removeSessions(ids);
  selectedIds.value = new Set();
}

async function onDeleteSession(session: AiChatSession): Promise<void> {
  const ok = await confirm({
    title: t("aiChat.confirmDeleteTitle"),
    message: t("aiChat.confirmDeleteOne", { title: session.title }),
    confirmLabel: t("aiChat.delete"),
    cancelLabel: t("app.cancel"),
  });
  if (ok) {
    await removeSessions([session.id]);
  }
}

async function onDeleteAllUnpinned(): Promise<void> {
  const count = sessions.value.filter((session) => !session.pinned).length;
  if (count === 0) {
    return;
  }
  const ok = await confirm({
    title: t("aiChat.confirmDeleteTitle"),
    message: t("aiChat.confirmDeleteMany", { count }),
    confirmLabel: t("aiChat.delete"),
    cancelLabel: t("app.cancel"),
  });
  if (ok) {
    await removeAllUnpinned();
    selectedIds.value = new Set();
  }
}

function startRename(session: AiChatSession): void {
  renamingId.value = session.id;
  renameDraft.value = session.title;
}

async function commitRename(session: AiChatSession): Promise<void> {
  await renameSession(session.id, renameDraft.value);
  renamingId.value = null;
}

function isStale(message: AiChatMessage): boolean {
  return Boolean(
    message.proposal &&
      message.proposal.status === "pending" &&
      message.proposal.baseSource !== props.source,
  );
}

function toggleDiff(messageId: string): void {
  const next = new Set(diffOpenFor.value);
  if (next.has(messageId)) {
    next.delete(messageId);
  } else {
    next.add(messageId);
  }
  diffOpenFor.value = next;
}

async function applyProposal(message: AiChatMessage): Promise<void> {
  const session = activeSession.value;
  if (!session || !message.proposal || isStale(message)) {
    return;
  }
  message.proposal.status = "applied";
  emit("applySource", {
    source: message.proposal.proposedSource,
    label: t("aiChat.historyLabel", {
      prompt: (session.messages.find((entry) => entry.role === "user")?.content ?? "").slice(0, 40),
    }),
  });
  await persist(session);
}

async function rejectProposal(message: AiChatMessage): Promise<void> {
  const session = activeSession.value;
  if (!session || !message.proposal) {
    return;
  }
  message.proposal.status = "rejected";
  await persist(session);
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore
  }
}

function editAndResend(message: AiChatMessage): void {
  const session = activeSession.value;
  if (!session || isBusy.value) {
    return;
  }
  const index = session.messages.findIndex((entry) => entry.id === message.id);
  if (index < 0) {
    return;
  }
  draft.value = message.content;
  session.messages = session.messages.slice(0, index);
  void persist(session);
}

async function regenerate(): Promise<void> {
  const session = activeSession.value;
  if (!session || isBusy.value) {
    return;
  }
  const lastUser = [...session.messages]
    .reverse()
    .find((message) => message.role === "user");
  if (!lastUser) {
    return;
  }
  session.messages = session.messages.filter(
    (message) => message.createdAt <= lastUser.createdAt,
  );
  await persist(session);
  await runSend(lastUser.content, { skipUserAppend: true });
}

function stopGeneration(): void {
  generationToken += 1;
  isBusy.value = false;
}

async function onSend(content?: string): Promise<void> {
  const text = (content ?? draft.value).trim().slice(0, AI_CHAT_MESSAGE_MAX_CHARS);
  if (!text || isBusy.value) {
    return;
  }
  draft.value = "";
  await runSend(text);
}

async function runSend(
  text: string,
  options: { skipUserAppend?: boolean } = {},
): Promise<void> {
  const session = await ensureActiveSession();
  const token = ++generationToken;
  isBusy.value = true;
  errorMessage.value = "";

  if (!options.skipUserAppend) {
    session.messages.push({
      id: createAiChatMessageId(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    });
    applyDerivedTitle(session);
    await persist(session);
  }

  const historyBefore = session.messages.slice(0, -1);

  try {
    const result = await sendAiChatMessage({
      history: options.skipUserAppend ? session.messages.slice(0, -1) : historyBefore,
      userContent: text,
      format: props.diagramFormat,
      source: props.source,
      renderError: props.renderError,
      summary: session.summary,
      layout: props.layout,
      diagramDarkMode: props.diagramDarkMode,
      renderMode: props.renderMode,
      handlers: { openSettings: () => emit("openSettings"), silent: false },
    });

    if (token !== generationToken) {
      return; // Пользователь нажал «Остановить» — ответ отбрасываем.
    }

    const assistant: AiChatMessage = {
      id: createAiChatMessageId(),
      role: "assistant",
      content: result.message,
      clarificationQuestions:
        result.kind === "clarification" ? result.questions : undefined,
      nextSteps: result.nextSteps,
      createdAt: new Date().toISOString(),
      model: `${result.providerId}/${result.model}`,
    };

    if (result.proposal?.source) {
      assistant.proposal = {
        id: createAiChatMessageId(),
        baseSource: props.source,
        proposedSource: result.proposal.source,
        explanation: result.proposal.explanation ?? result.message,
        status: "pending",
      };
    }

    session.messages.push(assistant);
    await persist(session);

    if (
      assistant.proposal &&
      applyMode.value === "immediate" &&
      assistant.proposal.proposedSource !== props.source
    ) {
      await applyProposal(assistant);
    }

    void maybeSummarize(session);
  } catch (error) {
    if (token !== generationToken) {
      return;
    }
    errorMessage.value =
      error instanceof Error ? error.message : t("aiChat.generateError");
  } finally {
    if (token === generationToken) {
      isBusy.value = false;
    }
  }
}

function onComposerKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    void onSend();
  }
}

async function onShareCreate(): Promise<void> {
  const session = activeSession.value;
  if (!session) {
    return;
  }
  isSharing.value = true;
  shareError.value = "";
  try {
    const snapshot = buildAiChatShareSnapshot(session, props.source);
    const created = await createAiChatShareLink(snapshot);
    shareToken.value = created.token;
    shareUrl.value = created.url;
  } catch {
    shareError.value = t("aiChat.shareError");
  } finally {
    isSharing.value = false;
  }
}

async function onShareRevoke(): Promise<void> {
  if (!shareToken.value) {
    return;
  }
  try {
    await revokeAiChatShareLink(shareToken.value);
  } catch {
    // Ссылка могла уже истечь — для пользователя результат тот же.
  }
  shareToken.value = "";
  shareUrl.value = "";
}

function onShareExport(): void {
  const session = activeSession.value;
  if (!session) {
    return;
  }
  const markdown = buildAiChatTranscriptMarkdown(session, {
    user: t("llm.chat.roleUser"),
    assistant: t("llm.chat.roleAssistant"),
  });
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${session.title.replace(/[^\p{L}\p{N}-]+/gu, "-") || "ai-chat"}.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function onShareCopyTranscript(): Promise<void> {
  const session = activeSession.value;
  if (!session) {
    return;
  }
  await copyText(
    buildAiChatTranscriptMarkdown(session, {
      user: t("llm.chat.roleUser"),
      assistant: t("llm.chat.roleAssistant"),
    }),
  );
}
</script>

<template>
  <div class="ai-chat-panel">
    <div class="ai-chat-panel__toolbar">
      <button class="btn" type="button" @click="historyOpen = !historyOpen">
        {{ t("aiChat.history") }}
      </button>
      <button class="btn" type="button" @click="createSession()">
        {{ t("aiChat.newSession") }}
      </button>
      <span class="ai-chat-panel__title">{{ activeSession?.title }}</span>
      <button
        class="btn"
        type="button"
        :disabled="!activeSession"
        @click="shareOpen = !shareOpen"
      >
        {{ t("aiChat.share") }}
      </button>
    </div>

    <div v-if="shareOpen && activeSession" class="ai-chat-panel__share">
      <p>{{ serverShareAvailable ? t("aiChat.shareServerHint") : t("aiChat.shareOfflineHint") }}</p>
      <p v-if="secretWarnings.length > 0" class="ai-chat-panel__warning" role="alert">
        {{ t("aiChat.shareWarningSecrets", { fragments: secretWarnings.join(", ") }) }}
      </p>
      <div class="ai-chat-panel__share-actions">
        <button
          v-if="serverShareAvailable && !shareUrl"
          class="btn btn-primary"
          type="button"
          :disabled="isSharing"
          @click="onShareCreate"
        >
          {{ t("aiChat.shareCreateLink") }}
        </button>
        <template v-if="shareUrl">
          <input class="select" type="text" readonly :value="shareUrl" />
          <button class="btn" type="button" @click="copyText(shareUrl)">
            {{ t("aiChat.shareCopyLink") }}
          </button>
          <button class="btn" type="button" @click="onShareRevoke">
            {{ t("aiChat.shareRevoke") }}
          </button>
        </template>
        <button class="btn" type="button" @click="onShareExport">
          {{ t("aiChat.shareExportFile") }}
        </button>
        <button class="btn" type="button" @click="onShareCopyTranscript">
          {{ t("aiChat.shareCopyTranscript") }}
        </button>
      </div>
      <p v-if="shareError" class="ai-chat-panel__warning" role="alert">{{ shareError }}</p>
    </div>

    <div v-if="historyOpen" class="ai-chat-panel__history">
      <input
        v-model="historyQuery"
        class="select"
        type="search"
        :placeholder="t('aiChat.searchPlaceholder')"
      />
      <p class="ai-chat-panel__count">
        {{ t("aiChat.sessionsCount", { sessions: sessions.length, messages: totalMessages }) }}
      </p>
      <p v-if="filteredSessions.length === 0" class="ai-chat-panel__muted">
        {{ t("aiChat.noSessions") }}
      </p>
      <ul class="ai-chat-panel__session-list">
        <li
          v-for="session in filteredSessions"
          :key="session.id"
          class="ai-chat-panel__session"
          :class="{ 'is-active': session.id === activeSessionId }"
        >
          <input
            type="checkbox"
            :checked="selectedIds.has(session.id)"
            @change="toggleSelected(session.id, ($event.target as HTMLInputElement).checked)"
          />
          <button
            class="ai-chat-panel__session-open"
            type="button"
            @click="selectSession(session.id)"
          >
            <span v-if="session.pinned">📌</span>{{ session.title }}
          </button>
          <template v-if="renamingId === session.id">
            <input v-model="renameDraft" class="select" type="text" />
            <button class="btn" type="button" @click="commitRename(session)">OK</button>
          </template>
          <button class="ai-chat-panel__mini" type="button" @click="togglePin(session.id)">
            {{ session.pinned ? t("aiChat.unpin") : t("aiChat.pin") }}
          </button>
          <button class="ai-chat-panel__mini" type="button" @click="startRename(session)">
            {{ t("aiChat.rename") }}
          </button>
          <button class="ai-chat-panel__mini" type="button" @click="duplicateSession(session.id)">
            {{ t("aiChat.duplicate") }}
          </button>
          <button class="ai-chat-panel__mini" type="button" @click="onDeleteSession(session)">
            {{ t("aiChat.delete") }}
          </button>
        </li>
      </ul>
      <div class="ai-chat-panel__share-actions">
        <button
          class="btn"
          type="button"
          :disabled="selectedIds.size === 0"
          @click="onDeleteSelected"
        >
          {{ t("aiChat.deleteSelected", { count: selectedIds.size }) }}
        </button>
        <button class="btn" type="button" @click="onDeleteAllUnpinned">
          {{ t("aiChat.deleteAllUnpinned") }}
        </button>
      </div>
    </div>

    <div class="ai-chat-panel__messages">
      <p v-if="!activeSession || activeSession.messages.length === 0" class="ai-chat-panel__muted">
        {{ t("aiChat.empty") }}
      </p>
      <article
        v-for="message in activeSession?.messages ?? []"
        :key="message.id"
        class="ai-chat-panel__message"
        :class="`ai-chat-panel__message--${message.role}`"
      >
        <strong>{{
          message.role === "user" ? t("llm.chat.roleUser") : t("llm.chat.roleAssistant")
        }}</strong>
        <p class="ai-chat-panel__content">{{ message.content }}</p>

        <ul v-if="message.clarificationQuestions?.length" class="ai-chat-panel__questions">
          <li v-for="(question, index) in message.clarificationQuestions" :key="index">
            {{ question }}
          </li>
        </ul>

        <div v-if="message.proposal" class="ai-chat-panel__proposal">
          <strong>{{ t("aiChat.proposalTitle") }}</strong>
          <p>{{ message.proposal.explanation }}</p>
          <p v-if="isStale(message)" class="ai-chat-panel__warning">
            {{ t("aiChat.proposalStale") }}
          </p>
          <p v-else-if="message.proposal.status === 'applied'" class="ai-chat-panel__muted">
            {{ t("aiChat.proposalApplied") }}
          </p>
          <p v-else-if="message.proposal.status === 'rejected'" class="ai-chat-panel__muted">
            {{ t("aiChat.proposalRejected") }}
          </p>
          <div class="ai-chat-panel__share-actions">
            <button
              v-if="message.proposal.status === 'pending'"
              class="btn btn-primary"
              type="button"
              :disabled="isStale(message)"
              @click="applyProposal(message)"
            >
              {{ t("aiChat.proposalApply") }}
            </button>
            <button
              v-if="message.proposal.status === 'pending'"
              class="btn"
              type="button"
              @click="rejectProposal(message)"
            >
              {{ t("aiChat.proposalReject") }}
            </button>
            <button class="btn" type="button" @click="toggleDiff(message.id)">
              {{ diffOpenFor.has(message.id) ? t("aiChat.proposalHideDiff") : t("aiChat.proposalDiff") }}
            </button>
          </div>
          <pre v-if="diffOpenFor.has(message.id)" class="ai-chat-panel__diff">{{ buildSimpleDiffPreview(message.proposal.baseSource, message.proposal.proposedSource) }}</pre>
        </div>

        <div class="ai-chat-panel__message-actions">
          <button class="ai-chat-panel__mini" type="button" @click="copyText(message.content)">
            {{ t("aiChat.copyMessage") }}
          </button>
          <button
            v-if="message.role === 'user'"
            class="ai-chat-panel__mini"
            type="button"
            @click="editAndResend(message)"
          >
            {{ t("aiChat.editResend") }}
          </button>
          <button
            v-if="message.role === 'assistant'"
            class="ai-chat-panel__mini"
            type="button"
            @click="regenerate"
          >
            {{ t("aiChat.regenerate") }}
          </button>
        </div>
      </article>
      <p v-if="isBusy" class="ai-chat-panel__muted">{{ t("llm.chat.thinking") }}</p>
    </div>

    <div v-if="nextStepSuggestions.length > 0" class="ai-chat-panel__next">
      <span class="ai-chat-panel__muted">{{ t("aiChat.nextSteps") }}</span>
      <button
        v-for="(step, index) in nextStepSuggestions"
        :key="index"
        class="ai-chat-panel__chip"
        type="button"
        :disabled="isBusy"
        @click="onSend(step)"
      >
        {{ step }}
      </button>
    </div>

    <p v-if="errorMessage" class="ai-chat-panel__warning" role="alert">{{ errorMessage }}</p>

    <div class="ai-chat-panel__composer">
      <p class="ai-chat-panel__muted">
        {{ source.trim() ? t("aiChat.contextDiagram", { format: diagramFormat }) : t("aiChat.contextEmpty") }}
      </p>
      <label class="ai-chat-panel__apply-mode">
        <span>{{ t("aiChat.applyMode") }}</span>
        <select v-model="applyMode" class="select">
          <option value="proposal">{{ t("aiChat.applyModeProposal") }}</option>
          <option value="immediate">{{ t("aiChat.applyModeImmediate") }}</option>
        </select>
      </label>
      <textarea
        v-model="draft"
        class="ai-chat-panel__input"
        rows="3"
        :placeholder="t('aiChat.inputPlaceholder')"
        :disabled="isBusy"
        @keydown="onComposerKeydown"
      />
      <div class="ai-chat-panel__share-actions">
        <button
          v-if="isBusy"
          class="btn"
          type="button"
          @click="stopGeneration"
        >
          {{ t("aiChat.stop") }}
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="!canSend"
          @click="onSend()"
        >
          {{ t("aiChat.send") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-chat-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

.ai-chat-panel__toolbar,
.ai-chat-panel__share-actions,
.ai-chat-panel__message-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.ai-chat-panel__title {
  flex: 1;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-chat-panel__messages {
  flex: 1;
  min-height: 120px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
}

.ai-chat-panel__message {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ai-chat-panel__content {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.45;
  font-size: 0.88rem;
}

.ai-chat-panel__proposal {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--surface);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-chat-panel__proposal p {
  margin: 0;
}

.ai-chat-panel__diff {
  max-height: 180px;
  overflow: auto;
  white-space: pre-wrap;
  font-size: 0.78rem;
  margin: 0;
}

.ai-chat-panel__history,
.ai-chat-panel__share {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow: auto;
}

.ai-chat-panel__session-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-chat-panel__session {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.ai-chat-panel__session.is-active .ai-chat-panel__session-open {
  font-weight: 700;
}

.ai-chat-panel__session-open {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text);
  text-align: left;
}

.ai-chat-panel__mini {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: var(--text-muted);
  font-size: 0.78rem;
  text-decoration: underline;
}

.ai-chat-panel__next {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.ai-chat-panel__chip {
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  padding: 4px 10px;
  cursor: pointer;
  font-size: 0.82rem;
}

.ai-chat-panel__chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-chat-panel__composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-chat-panel__apply-mode {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.84rem;
  color: var(--text-muted);
}

.ai-chat-panel__input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text);
  resize: vertical;
}

.ai-chat-panel__muted {
  color: var(--text-muted);
  font-size: 0.84rem;
  margin: 0;
}

.ai-chat-panel__warning {
  color: var(--danger);
  font-size: 0.84rem;
  margin: 0;
}

.ai-chat-panel__questions {
  margin: 0;
  padding-left: 18px;
}
</style>
