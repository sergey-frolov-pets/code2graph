<script setup lang="ts">
import { Paperclip, Send, X } from "@lucide/vue";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import type { LayoutEngine } from "@/constants";
import {
  AI_CHAT_APPLY_MODE_STORAGE_KEY,
  AI_CHAT_ATTACHMENT_FILE_MAX_BYTES,
  AI_CHAT_CONTEXT_MODE_DEFAULT,
  AI_CHAT_CONTEXT_MODE_STORAGE_KEY,
  AI_CHAT_DEFAULT_APPLY_MODE,
  AI_CHAT_MAX_ATTACHMENTS,
  AI_CHAT_MAX_IMAGE_ATTACHMENTS,
  AI_CHAT_MESSAGE_MAX_CHARS,
  BYTES_PER_MEGABYTE,
  type AiChatApplyMode,
  type AiChatAttachmentKind,
  type AiChatContextMode,
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
import type { LlmChatImagePart } from "@/services/llm/llm-types";
import type { AiChatAttachment, AiChatMessage, AiChatSession } from "@/types/ai-chat-session";
import {
  AI_CHAT_ATTACHMENT_ACCEPT,
  classifyAiChatFile,
  readAiChatAttachment,
  type AiChatReadAttachment,
} from "@/utils/ai-chat-attachments";

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
const pendingAttachments = ref<Array<AiChatReadAttachment & { id: string }>>([]);
const attachmentNotice = ref("");
const fileInputRef = ref<HTMLInputElement | null>(null);
const isBusy = ref(false);
const threadRef = ref<HTMLElement | null>(null);
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

const storedContextMode = readStorageItem(AI_CHAT_CONTEXT_MODE_STORAGE_KEY);
const contextMode = ref<AiChatContextMode>(
  storedContextMode === "new" ? "new" : AI_CHAT_CONTEXT_MODE_DEFAULT,
);
watch(contextMode, (mode) => writeStorageItem(AI_CHAT_CONTEXT_MODE_STORAGE_KEY, mode));

const attachmentAccept = AI_CHAT_ATTACHMENT_ACCEPT;
const attachmentMaxMb = AI_CHAT_ATTACHMENT_FILE_MAX_BYTES / BYTES_PER_MEGABYTE;

let generationToken = 0;

const filteredSessions = computed(() =>
  filterAiChatSessions(sessions.value, historyQuery.value),
);
const totalMessages = computed(() => countAiChatMessages(sessions.value));
const canSend = computed(
  () =>
    (draft.value.trim().length > 0 || pendingAttachments.value.length > 0) && !isBusy.value,
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
  const attachmentText = [
    ...activeSession.value.messages.flatMap((message) => message.attachments ?? []),
    ...pendingAttachments.value,
  ]
    .map((attachment) => attachment.textExcerpt ?? "")
    .join("\n");
  return findSecretLikeFragments(`${transcript}\n${props.source}\n${attachmentText}`);
});

/**
 * Подсказки «Что дальше»: от модели, а до первого ответа — стартовые по состоянию диаграммы.
 * В вёрстке блок стоит под полем ввода, а не между перепиской и композером.
 */
const nextStepSuggestions = computed<string[]>(() => {
  const session = activeSession.value;
  const lastAssistant = [...(session?.messages ?? [])]
    .reverse()
    .find((message) => message.role === "assistant");
  if (lastAssistant?.nextSteps && lastAssistant.nextSteps.length > 0) {
    return lastAssistant.nextSteps;
  }
  const editingCurrentDiagram =
    contextMode.value === "current" && props.source.trim().length > 0;
  if (!session || session.messages.length === 0) {
    return editingCurrentDiagram
      ? [t("aiChat.starterEdit"), t("aiChat.starterExplain")]
      : [t("aiChat.starterCreate"), t("aiChat.starterExplain")];
  }
  return editingCurrentDiagram
    ? [t("aiChat.starterEdit"), t("aiChat.starterExplain")]
    : [t("aiChat.starterCreate")];
});

function scrollThreadToEnd(): void {
  const thread = threadRef.value;
  if (!thread) {
    return;
  }
  thread.scrollTop = thread.scrollHeight;
}

onMounted(() => {
  void load();
});

watch(
  () => [activeSession.value?.messages.length ?? 0, isBusy.value] as const,
  async () => {
    await nextTick();
    scrollThreadToEnd();
  },
);

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
  await runSend(lastUser.content, {
    skipUserAppend: true,
    attachments: lastUser.attachments,
  });
}

function stopGeneration(): void {
  generationToken += 1;
  isBusy.value = false;
}

function attachmentKindLabel(attachment: { name: string; kind: AiChatAttachmentKind }): string {
  const lowerName = attachment.name.toLowerCase();
  if (lowerName.endsWith(".md") || lowerName.endsWith(".markdown")) {
    return t("aiChat.attachmentMarkdown");
  }
  switch (attachment.kind) {
    case "diagram":
      return t("aiChat.attachmentDiagram");
    case "text":
      return t("aiChat.attachmentText");
    case "pdf":
      return t("aiChat.attachmentPdf");
    case "spreadsheet":
      return t("aiChat.attachmentSpreadsheet");
    case "image":
      return t("aiChat.attachmentImage");
  }
}

function openAttachmentPicker(): void {
  fileInputRef.value?.click();
}

function removeAttachment(id: string): void {
  pendingAttachments.value = pendingAttachments.value.filter((item) => item.id !== id);
}

async function onFilesSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = "";
  if (files.length === 0 || isBusy.value) {
    return;
  }

  const room = AI_CHAT_MAX_ATTACHMENTS - pendingAttachments.value.length;
  let notice = "";
  if (room <= 0) {
    attachmentNotice.value = t("aiChat.attachmentLimit", { count: AI_CHAT_MAX_ATTACHMENTS });
    return;
  }
  if (files.length > room) {
    notice = t("aiChat.attachmentLimit", { count: AI_CHAT_MAX_ATTACHMENTS });
  }

  let imageCount = pendingAttachments.value.filter((item) => item.kind === "image").length;
  const next = [...pendingAttachments.value];
  for (const file of files.slice(0, room)) {
    const kind = classifyAiChatFile(file.name, file.type);
    if (kind === "image" && imageCount >= AI_CHAT_MAX_IMAGE_ATTACHMENTS) {
      if (!notice) {
        notice = t("aiChat.attachmentImageLimit", { count: AI_CHAT_MAX_IMAGE_ATTACHMENTS });
      }
      continue;
    }
    const result = await readAiChatAttachment(file);
    if (!result.ok) {
      if (!notice) {
        notice =
          result.reason === "too-large"
            ? t("aiChat.attachmentTooLarge", { name: file.name, maxMb: attachmentMaxMb })
            : result.reason === "unsupported"
              ? t("aiChat.attachmentUnsupported", { name: file.name })
              : t("aiChat.attachmentReadError", { name: file.name });
      }
      continue;
    }
    next.push({ ...result.attachment, id: createAiChatMessageId() });
    if (result.attachment.kind === "image") {
      imageCount += 1;
    }
  }
  pendingAttachments.value = next;
  attachmentNotice.value = notice;
}

function storedAttachments(items: Array<AiChatReadAttachment & { id: string }>): AiChatAttachment[] {
  return items.map((item) => ({
    name: item.name,
    kind: item.kind,
    mimeType: item.mimeType,
    textExcerpt: item.textExcerpt,
  }));
}

function liveImages(items: Array<AiChatReadAttachment & { id: string }>): LlmChatImagePart[] {
  return items
    .filter(
      (item): item is AiChatReadAttachment & { id: string; imageBase64: string } =>
        item.kind === "image" && typeof item.imageBase64 === "string" && item.imageBase64.length > 0,
    )
    .slice(0, AI_CHAT_MAX_IMAGE_ATTACHMENTS)
    .map((item) => ({ mimeType: item.mimeType, dataBase64: item.imageBase64 }));
}

async function onSend(content?: string): Promise<void> {
  const typed = (content ?? draft.value).trim().slice(0, AI_CHAT_MESSAGE_MAX_CHARS);
  const pending = pendingAttachments.value;
  if ((typed.length === 0 && pending.length === 0) || isBusy.value) {
    return;
  }
  const text = typed || t("aiChat.attachmentsOnlyPrompt");
  const attachments = storedAttachments(pending);
  const images = liveImages(pending);
  draft.value = "";
  pendingAttachments.value = [];
  attachmentNotice.value = "";
  await runSend(text, { attachments, images });
}

async function runSend(
  text: string,
  options: {
    skipUserAppend?: boolean;
    attachments?: AiChatAttachment[];
    images?: LlmChatImagePart[];
  } = {},
): Promise<void> {
  const session = await ensureActiveSession();
  const token = ++generationToken;
  isBusy.value = true;
  errorMessage.value = "";

  try {
    if (!options.skipUserAppend) {
      session.messages.push({
        id: createAiChatMessageId(),
        role: "user",
        content: text,
        attachments: options.attachments?.length ? options.attachments : undefined,
        createdAt: new Date().toISOString(),
      });
      applyDerivedTitle(session);
      await persist(session);
    }

    const historyBefore = session.messages.slice(0, -1);

    const result = await sendAiChatMessage({
      history: options.skipUserAppend ? session.messages.slice(0, -1) : historyBefore,
      userContent: text,
      format: props.diagramFormat,
      source: props.source,
      contextMode: contextMode.value,
      attachments: options.attachments,
      images: options.images,
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
      <button
        class="btn"
        type="button"
        :class="{ 'is-active': historyOpen }"
        :aria-pressed="historyOpen"
        @click="historyOpen = !historyOpen"
      >
        {{ t("aiChat.history") }}
      </button>
      <button class="btn" type="button" @click="createSession()">
        {{ t("aiChat.newSession") }}
      </button>
      <span class="ai-chat-panel__title">{{ activeSession?.title }}</span>
      <button
        class="btn"
        type="button"
        :class="{ 'is-active': shareOpen }"
        :aria-pressed="shareOpen"
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

    <div
      ref="threadRef"
      class="ai-chat-panel__messages"
      data-testid="ai-chat-messages"
      role="log"
    >
      <p
        v-if="!activeSession || activeSession.messages.length === 0"
        class="ai-chat-panel__empty"
      >
        {{ t("aiChat.empty") }}
      </p>
      <article
        v-for="message in activeSession?.messages ?? []"
        :key="message.id"
        class="ai-chat-panel__message"
        :class="`ai-chat-panel__message--${message.role}`"
      >
        <span class="ai-chat-panel__role">{{
          message.role === "user" ? t("llm.chat.roleUser") : t("llm.chat.roleAssistant")
        }}</span>
        <p class="ai-chat-panel__content">{{ message.content }}</p>
        <ul
          v-if="message.attachments?.length"
          class="ai-chat-panel__message-files"
        >
          <li
            v-for="(file, index) in message.attachments"
            :key="`${message.id}-${index}`"
          >
            {{ attachmentKindLabel(file) }}: {{ file.name }}
          </li>
        </ul>

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
      <p
        v-if="isBusy"
        class="ai-chat-panel__thinking"
      >
        {{ t("llm.chat.thinking") }}
      </p>
    </div>

    <div class="ai-chat-panel__dock">
      <p
        v-if="errorMessage"
        class="ai-chat-panel__warning"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <form
        class="ai-chat-panel__composer"
        data-testid="ai-chat-composer"
        @submit.prevent="onSend()"
      >
        <p
          v-if="attachmentNotice"
          class="ai-chat-panel__warning"
        >
          {{ attachmentNotice }}
        </p>
        <ul
          v-if="pendingAttachments.length > 0"
          class="ai-chat-panel__attachments"
          data-testid="ai-chat-attachments"
        >
          <li
            v-for="item in pendingAttachments"
            :key="item.id"
            class="ai-chat-panel__attachment"
          >
            <span class="ai-chat-panel__attachment-kind">{{ attachmentKindLabel(item) }}</span>
            <span class="ai-chat-panel__attachment-name">{{ item.name }}</span>
            <button
              class="ai-chat-panel__attachment-remove"
              type="button"
              :aria-label="t('aiChat.removeAttachment', { name: item.name })"
              :disabled="isBusy"
              @click="removeAttachment(item.id)"
            >
              <X
                :size="14"
                :stroke-width="1.8"
                aria-hidden="true"
              />
            </button>
          </li>
        </ul>
        <div class="ai-chat-panel__composer-box">
          <input
            ref="fileInputRef"
            class="ai-chat-panel__file-input"
            data-testid="ai-chat-file-input"
            type="file"
            multiple
            :accept="attachmentAccept"
            @change="onFilesSelected"
          >
          <button
            class="ai-chat-panel__attach"
            type="button"
            data-testid="ai-chat-attach"
            :aria-label="t('aiChat.attach')"
            :title="t('aiChat.attachHint')"
            :disabled="isBusy || pendingAttachments.length >= AI_CHAT_MAX_ATTACHMENTS"
            @click="openAttachmentPicker"
          >
            <Paperclip
              :size="18"
              :stroke-width="1.8"
              aria-hidden="true"
            />
          </button>
          <textarea
            v-model="draft"
            class="ai-chat-panel__input"
            rows="2"
            enterkeyhint="send"
            :aria-label="t('aiChat.inputPlaceholder')"
            :placeholder="t('aiChat.inputPlaceholder')"
            :disabled="isBusy"
            @keydown="onComposerKeydown"
          />
          <div class="ai-chat-panel__composer-actions">
            <button
              v-if="isBusy"
              class="btn ai-chat-panel__send"
              type="button"
              @click="stopGeneration"
            >
              {{ t("aiChat.stop") }}
            </button>
            <button
              v-else
              class="btn btn-primary ai-chat-panel__send"
              type="submit"
              data-testid="ai-chat-send"
              :disabled="!canSend"
            >
              <Send
                :size="18"
                :stroke-width="1.8"
                aria-hidden="true"
              />
              <span class="ai-chat-panel__send-label">{{ t("aiChat.send") }}</span>
            </button>
          </div>
        </div>

        <div class="ai-chat-panel__meta">
          <label class="ai-chat-panel__context">
            <span>{{ t("aiChat.context") }}</span>
            <select
              v-model="contextMode"
              class="select"
              data-testid="ai-chat-context-mode"
            >
              <option value="current">{{ t("aiChat.contextCurrent") }}</option>
              <option value="new">{{ t("aiChat.contextNew") }}</option>
            </select>
          </label>
          <label class="ai-chat-panel__apply-mode">
            <span>{{ t("aiChat.applyMode") }}</span>
            <select
              v-model="applyMode"
              class="select"
            >
              <option value="proposal">{{ t("aiChat.applyModeProposal") }}</option>
              <option value="immediate">{{ t("aiChat.applyModeImmediate") }}</option>
            </select>
          </label>
        </div>
      </form>

      <div
        v-if="nextStepSuggestions.length > 0"
        class="ai-chat-panel__next"
        data-testid="ai-chat-next"
      >
        <span class="ai-chat-panel__next-label">{{ t("aiChat.nextSteps") }}</span>
        <div class="ai-chat-panel__chips">
          <button
            v-for="(step, index) in nextStepSuggestions"
            :key="index"
            class="ai-chat-panel__chip"
            type="button"
            :title="step"
            :disabled="isBusy"
            @click="onSend(step)"
          >
            {{ step }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-chat-panel {
  --ai-chat-gap: 8px;
  --ai-chat-sheet-max-height: 12rem;
  /* Зазор под плавающую «Показать превью»: она fixed в правом нижнем углу редактора. */
  --ai-chat-preview-fab-clearance: calc(var(--btn-touch, 44px) + 0.25rem);
  --ai-chat-bubble-radius: 14px;

  display: flex;
  flex-direction: column;
  gap: var(--ai-chat-gap);
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ai-chat-panel__toolbar,
.ai-chat-panel__share-actions,
.ai-chat-panel__message-actions,
.ai-chat-panel__composer-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ai-chat-panel__toolbar {
  flex: 0 0 auto;
  flex-wrap: nowrap;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.ai-chat-panel__toolbar::-webkit-scrollbar {
  display: none;
}

.ai-chat-panel__toolbar .btn {
  flex: 0 0 auto;
  min-height: 36px;
  padding: 6px 10px;
  font-size: 0.82rem;
}

.ai-chat-panel__toolbar .btn.is-active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
}

.ai-chat-panel__share-actions,
.ai-chat-panel__message-actions {
  flex-wrap: wrap;
}

.ai-chat-panel__title {
  flex: 1 1 0;
  min-width: 0;
  font-weight: 600;
  font-size: 0.84rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-chat-panel__messages {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 2px 2px 0;
}

.ai-chat-panel__message-actions .ai-chat-panel__mini {
  min-height: 0;
  padding-block: 2px;
}

.ai-chat-panel__empty,
.ai-chat-panel__thinking {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.84rem;
  line-height: 1.45;
  text-align: center;
}

.ai-chat-panel__empty {
  margin-top: auto;
  margin-bottom: auto;
  padding: 12px 16px;
}

.ai-chat-panel__message {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: min(100%, 36rem);
  padding: 4px 10px;
  border-radius: var(--ai-chat-bubble-radius);
}

.ai-chat-panel__message--user {
  align-self: flex-end;
  margin-inline-start: 2rem;
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  border-end-end-radius: 4px;
}

.ai-chat-panel__message--assistant {
  align-self: flex-start;
  margin-inline-end: 1.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-end-start-radius: 4px;
}

.ai-chat-panel__role {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
}

.ai-chat-panel__content {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.45;
  font-size: 0.88rem;
}

.ai-chat-panel__proposal {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--surface-muted);
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
  flex: 0 1 auto;
  min-height: 0;
  max-height: var(--ai-chat-sheet-max-height);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
  background: var(--surface);
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
  text-align: start;
}

.ai-chat-panel__mini {
  background: none;
  border: none;
  min-height: 32px;
  padding: 0 2px;
  cursor: pointer;
  color: var(--accent);
  font-size: 0.78rem;
}

.ai-chat-panel__dock {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--ai-chat-gap);
  min-width: 0;
}

.ai-chat-panel__composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  margin: 0;
}

.ai-chat-panel__composer-box {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: 8px;
  min-width: 0;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
}

.ai-chat-panel__composer-box:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
}

.ai-chat-panel__input {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
  margin: 0;
  padding: 10px 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  resize: none;
  min-height: var(--btn-touch, 44px);
  max-height: 8.5rem;
  line-height: 1.4;
  overflow-y: auto;
  field-sizing: content;
}

.ai-chat-panel__input:focus {
  outline: none;
}

.ai-chat-panel__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.ai-chat-panel__attach {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--btn-touch, 44px);
  height: var(--btn-touch, 44px);
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.ai-chat-panel__attach:hover:not(:disabled) {
  color: var(--text);
  background: var(--surface-muted);
}

.ai-chat-panel__attach:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-chat-panel__attachments,
.ai-chat-panel__message-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ai-chat-panel__attachment,
.ai-chat-panel__message-files li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 32px;
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-muted);
  color: var(--text);
  font-size: 0.75rem;
}

.ai-chat-panel__attachment-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 12rem;
}

.ai-chat-panel__attachment-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.ai-chat-panel__composer-actions {
  flex: 0 0 auto;
  padding-bottom: 2px;
}

.ai-chat-panel__send {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 0 0 auto;
  min-width: var(--btn-touch, 44px);
  min-height: var(--btn-touch, 44px);
  padding: 8px 14px;
  border-radius: 12px;
  white-space: nowrap;
  touch-action: manipulation;
}

.ai-chat-panel__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  min-width: 0;
}

.ai-chat-panel__context {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1 1 12rem;
  min-width: 0;
  margin: 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.ai-chat-panel__context .select {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
  min-height: 32px;
  max-width: 100%;
  font-size: 0.75rem;
}

.ai-chat-panel__apply-mode {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 1 auto;
  min-width: 0;
  max-width: 100%;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.ai-chat-panel__apply-mode .select {
  flex: 0 1 17rem;
  width: 17rem;
  min-width: 0;
  min-height: 32px;
  max-width: 100%;
  font-size: 0.75rem;
}

.ai-chat-panel__next {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.ai-chat-panel__next-label {
  flex: 0 0 auto;
  color: var(--text-muted);
  font-size: 0.75rem;
}

.ai-chat-panel__chips {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: nowrap;
  gap: 6px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: thin;
  padding-bottom: 2px;
}

.ai-chat-panel__chip {
  flex: 0 0 auto;
  max-width: 16rem;
  min-height: 36px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  padding: 6px 12px;
  cursor: pointer;
  font-size: 0.8rem;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  touch-action: manipulation;
}

.ai-chat-panel__chip:hover:not(:disabled) {
  border-color: var(--accent);
}

.ai-chat-panel__chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  padding-inline-start: 18px;
}

@media (max-width: 900px) {
  .ai-chat-panel__dock {
    padding-bottom: var(--ai-chat-preview-fab-clearance);
  }

  .ai-chat-panel__send-label {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .ai-chat-panel__composer-actions .btn-primary.ai-chat-panel__send {
    width: var(--btn-touch, 44px);
    padding: 0;
  }

  .ai-chat-panel__input {
    min-height: 2.5rem;
    max-height: 2.75rem;
    padding-top: 8px;
    padding-bottom: 8px;
  }

  .ai-chat-panel__meta {
    flex-direction: column;
    align-items: stretch;
  }

  .ai-chat-panel__composer,
  .ai-chat-panel__meta,
  .ai-chat-panel__next {
    flex: 0 0 auto;
  }

  .ai-chat-panel__context,
  .ai-chat-panel__apply-mode {
    flex: 1 1 auto;
    width: 100%;
  }

  .ai-chat-panel__context .select,
  .ai-chat-panel__apply-mode .select {
    flex: 1 1 auto;
    width: auto;
  }
}
</style>
