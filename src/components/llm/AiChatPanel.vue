<script setup lang="ts">
import {
  Check,
  ClipboardCopy,
  Copy,
  Download,
  Eye,
  FileCode,
  FilePlus,
  GitCompare,
  History,
  Link2,
  Link2Off,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Send,
  Share2,
  Square,
  Trash2,
  X,
  Zap,
} from "@lucide/vue";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { isAgentDiagramType } from "@shared/agent-diagram";
import AppModal from "@/components/AppModal.vue";
import IconButton from "@/components/IconButton.vue";
import type { LayoutEngine } from "@/constants";
import {
  AI_CHAT_APPLY_MODE_STORAGE_KEY,
  AI_CHAT_ATTACHMENT_FILE_MAX_BYTES,
  AI_CHAT_COMPOSER_ROWS,
  AI_CHAT_CONTEXT_MODE_DEFAULT,
  AI_CHAT_CONTEXT_MODE_STORAGE_KEY,
  AI_CHAT_DEFAULT_APPLY_MODE,
  AI_CHAT_MAX_ATTACHMENTS,
  AI_CHAT_MAX_IMAGE_ATTACHMENTS,
  AI_CHAT_MESSAGE_MAX_CHARS,
  AI_CHAT_SUGGESTION_VISIBLE_LINES,
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
import { useChatLlmSelection } from "@/composables/useChatLlmSelection";
import { useLocale } from "@/composables/useLocale";
import { getLanguageModule } from "@/languages/registry";
import { isLocaleKey } from "@/locales/types";
import { resolveDiagramFileName } from "@/utils/diagram-files";
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
const {
  options: chatProviderOptions,
  selectedId: chatProviderId,
  onChange: onChatProviderChange,
} = useChatLlmSelection();

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
 * В списке видно две строки; клик открывает полный текст, отправка — только по «Спросить».
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
      ? [t("aiChat.starterEdit"), t("aiChat.starterSwitch"), t("aiChat.starterExplain")]
      : [t("aiChat.starterCreate"), t("aiChat.starterSwitch"), t("aiChat.starterExplain")];
  }
  return editingCurrentDiagram
    ? [t("aiChat.starterEdit"), t("aiChat.starterSwitch")]
    : [t("aiChat.starterCreate"), t("aiChat.starterSwitch")];
});

const previewSuggestion = ref<string | null>(null);

const suggestionPreviewStyle = {
  "--ai-chat-chip-lines": String(AI_CHAT_SUGGESTION_VISIBLE_LINES),
  "--ai-chat-composer-rows": String(AI_CHAT_COMPOSER_ROWS),
};

function openSuggestion(step: string): void {
  if (isBusy.value) {
    return;
  }
  previewSuggestion.value = step;
}

function closeSuggestion(): void {
  previewSuggestion.value = null;
}

async function askSuggestion(): Promise<void> {
  const step = previewSuggestion.value;
  if (!step || isBusy.value) {
    return;
  }
  previewSuggestion.value = null;
  await onSend(step);
}

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
  const proposal = message.proposal;
  if (!proposal || proposal.status !== "pending") {
    return false;
  }
  if (proposal.baseSource !== props.source) {
    return true;
  }
  const baseFormat = proposal.baseFormat ?? props.diagramFormat;
  const targetFormat = proposal.format ?? baseFormat;
  return props.diagramFormat !== baseFormat && props.diagramFormat !== targetFormat;
}

function proposalTargetLabel(message: AiChatMessage): string {
  const proposal = message.proposal;
  if (!proposal) {
    return "";
  }
  const formatLabel = proposal.format
    ? t(getLanguageModule(proposal.format).labelKey)
    : "";
  const typeKey = proposal.diagramType ? `llm.wizard.type.${proposal.diagramType}` : "";
  const typeLabel = typeKey && isLocaleKey(typeKey) ? t(typeKey) : "";
  if (!formatLabel && !typeLabel) {
    return "";
  }
  if (formatLabel && typeLabel) {
    return `${formatLabel} · ${typeLabel}`;
  }
  return formatLabel || typeLabel;
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
  const nextFormat = message.proposal.format;
  message.proposal.status = "applied";
  if (nextFormat) {
    session.diagramFormat = nextFormat;
    if (nextFormat !== props.diagramFormat && props.documentKey) {
      session.documentKey = resolveDiagramFileName(props.documentKey, nextFormat);
    }
  }
  await persist(session);
  emit("applySource", {
    source: message.proposal.proposedSource,
    label: t("aiChat.historyLabel", {
      prompt: (session.messages.find((entry) => entry.role === "user")?.content ?? "").slice(0, 40),
    }),
    ...(nextFormat ? { format: nextFormat } : {}),
  });
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
      const diagramType = result.proposal.diagramType;
      assistant.proposal = {
        id: createAiChatMessageId(),
        baseSource: props.source,
        baseFormat: props.diagramFormat,
        proposedSource: result.proposal.source,
        explanation: result.proposal.explanation ?? result.message,
        status: "pending",
        ...(result.proposal.format ? { format: result.proposal.format } : {}),
        ...(diagramType && isAgentDiagramType(diagramType) ? { diagramType } : {}),
      };
    }

    session.messages.push(assistant);
    await persist(session);

    if (
      assistant.proposal &&
      applyMode.value === "immediate" &&
      (assistant.proposal.proposedSource !== props.source ||
        (assistant.proposal.format !== undefined &&
          assistant.proposal.format !== props.diagramFormat))
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
  <div
    class="ai-chat-panel"
    :style="suggestionPreviewStyle"
  >
    <div class="ai-chat-panel__toolbar">
      <IconButton
        :label="t('aiChat.history')"
        :title="t('aiChat.history')"
        :pressed="historyOpen"
        extra-class="ai-chat-panel__tool"
        data-testid="ai-chat-history"
        @click="historyOpen = !historyOpen"
      >
        <History
          :size="16"
          :stroke-width="1.8"
          aria-hidden="true"
        />
      </IconButton>
      <IconButton
        :label="t('aiChat.newSession')"
        :title="t('aiChat.newSession')"
        extra-class="ai-chat-panel__tool"
        @click="createSession()"
      >
        <Plus
          :size="16"
          :stroke-width="1.8"
          aria-hidden="true"
        />
      </IconButton>
      <span class="ai-chat-panel__title">{{ activeSession?.title }}</span>
      <label class="ai-chat-panel__provider">
        <span class="sr-only">{{ t("aiChat.provider") }}</span>
        <select
          class="select ai-chat-panel__provider-select"
          data-testid="ai-chat-provider"
          :value="chatProviderId"
          :disabled="chatProviderOptions.length === 0 || isBusy"
          :aria-label="t('aiChat.provider')"
          @change="onChatProviderChange"
        >
          <option
            v-if="chatProviderOptions.length === 0"
            value=""
          >
            {{ t("aiChat.providerNone") }}
          </option>
          <option
            v-for="option in chatProviderOptions"
            :key="option.id"
            :value="option.id"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
      <IconButton
        :label="t('aiChat.share')"
        :title="t('aiChat.share')"
        :pressed="shareOpen"
        :disabled="!activeSession"
        extra-class="ai-chat-panel__tool"
        @click="shareOpen = !shareOpen"
      >
        <Share2
          :size="16"
          :stroke-width="1.8"
          aria-hidden="true"
        />
      </IconButton>
    </div>

    <div
      v-if="shareOpen && activeSession"
      class="ai-chat-panel__share"
    >
      <p>{{ serverShareAvailable ? t("aiChat.shareServerHint") : t("aiChat.shareOfflineHint") }}</p>
      <p
        v-if="secretWarnings.length > 0"
        class="ai-chat-panel__warning"
        role="alert"
      >
        {{ t("aiChat.shareWarningSecrets", { fragments: secretWarnings.join(", ") }) }}
      </p>
      <div class="ai-chat-panel__share-actions">
        <IconButton
          v-if="serverShareAvailable && !shareUrl"
          :label="t('aiChat.shareCreateLink')"
          :title="t('aiChat.shareCreateLink')"
          :disabled="isSharing"
          primary
          extra-class="ai-chat-panel__tool"
          @click="onShareCreate"
        >
          <Link2
            :size="16"
            :stroke-width="1.8"
            aria-hidden="true"
          />
        </IconButton>
        <template v-if="shareUrl">
          <input
            class="select"
            type="text"
            readonly
            :value="shareUrl"
          >
          <IconButton
            :label="t('aiChat.shareCopyLink')"
            :title="t('aiChat.shareCopyLink')"
            extra-class="ai-chat-panel__tool"
            @click="copyText(shareUrl)"
          >
            <Copy
              :size="16"
              :stroke-width="1.8"
              aria-hidden="true"
            />
          </IconButton>
          <IconButton
            :label="t('aiChat.shareRevoke')"
            :title="t('aiChat.shareRevoke')"
            extra-class="ai-chat-panel__tool"
            @click="onShareRevoke"
          >
            <Link2Off
              :size="16"
              :stroke-width="1.8"
              aria-hidden="true"
            />
          </IconButton>
        </template>
        <IconButton
          :label="t('aiChat.shareExportFile')"
          :title="t('aiChat.shareExportFile')"
          extra-class="ai-chat-panel__tool"
          @click="onShareExport"
        >
          <Download
            :size="16"
            :stroke-width="1.8"
            aria-hidden="true"
          />
        </IconButton>
        <IconButton
          :label="t('aiChat.shareCopyTranscript')"
          :title="t('aiChat.shareCopyTranscript')"
          extra-class="ai-chat-panel__tool"
          @click="onShareCopyTranscript"
        >
          <ClipboardCopy
            :size="16"
            :stroke-width="1.8"
            aria-hidden="true"
          />
        </IconButton>
      </div>
      <p
        v-if="shareError"
        class="ai-chat-panel__warning"
        role="alert"
      >
        {{ shareError }}
      </p>
    </div>

    <div
      v-if="historyOpen"
      class="ai-chat-panel__history"
    >
      <input
        v-model="historyQuery"
        class="select"
        type="search"
        :placeholder="t('aiChat.searchPlaceholder')"
      >
      <p class="ai-chat-panel__count">
        {{ t("aiChat.sessionsCount", { sessions: sessions.length, messages: totalMessages }) }}
      </p>
      <p
        v-if="filteredSessions.length === 0"
        class="ai-chat-panel__muted"
      >
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
          >
          <button
            class="ai-chat-panel__session-open"
            type="button"
            @click="selectSession(session.id)"
          >
            <span v-if="session.pinned">📌</span>{{ session.title }}
          </button>
          <template v-if="renamingId === session.id">
            <input
              v-model="renameDraft"
              class="select"
              type="text"
            >
            <IconButton
              :label="t('aiChat.rename')"
              :title="t('aiChat.rename')"
              extra-class="ai-chat-panel__tool"
              @click="commitRename(session)"
            >
              <Check
                :size="16"
                :stroke-width="1.8"
                aria-hidden="true"
              />
            </IconButton>
          </template>
          <IconButton
            :label="session.pinned ? t('aiChat.unpin') : t('aiChat.pin')"
            :title="session.pinned ? t('aiChat.unpin') : t('aiChat.pin')"
            :pressed="session.pinned"
            extra-class="ai-chat-panel__tool"
            @click="togglePin(session.id)"
          >
            <PinOff
              v-if="session.pinned"
              :size="16"
              :stroke-width="1.8"
              aria-hidden="true"
            />
            <Pin
              v-else
              :size="16"
              :stroke-width="1.8"
              aria-hidden="true"
            />
          </IconButton>
          <IconButton
            :label="t('aiChat.rename')"
            :title="t('aiChat.rename')"
            extra-class="ai-chat-panel__tool"
            @click="startRename(session)"
          >
            <Pencil
              :size="16"
              :stroke-width="1.8"
              aria-hidden="true"
            />
          </IconButton>
          <IconButton
            :label="t('aiChat.duplicate')"
            :title="t('aiChat.duplicate')"
            extra-class="ai-chat-panel__tool"
            @click="duplicateSession(session.id)"
          >
            <Copy
              :size="16"
              :stroke-width="1.8"
              aria-hidden="true"
            />
          </IconButton>
          <IconButton
            :label="t('aiChat.delete')"
            :title="t('aiChat.delete')"
            extra-class="ai-chat-panel__tool"
            @click="onDeleteSession(session)"
          >
            <Trash2
              :size="16"
              :stroke-width="1.8"
              aria-hidden="true"
            />
          </IconButton>
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
        <button
          class="btn"
          type="button"
          @click="onDeleteAllUnpinned"
        >
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
        <p class="ai-chat-panel__content">
          {{ message.content }}
        </p>
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

        <ul
          v-if="message.clarificationQuestions?.length"
          class="ai-chat-panel__questions"
        >
          <li
            v-for="(question, index) in message.clarificationQuestions"
            :key="index"
          >
            {{ question }}
          </li>
        </ul>

        <div
          v-if="message.proposal"
          class="ai-chat-panel__proposal"
        >
          <strong>{{ t("aiChat.proposalTitle") }}</strong>
          <p
            v-if="proposalTargetLabel(message)"
            class="ai-chat-panel__target"
          >
            {{ proposalTargetLabel(message) }}
          </p>
          <p>{{ message.proposal.explanation }}</p>
          <p
            v-if="isStale(message)"
            class="ai-chat-panel__warning"
          >
            {{ t("aiChat.proposalStale") }}
          </p>
          <p
            v-else-if="message.proposal.status === 'applied'"
            class="ai-chat-panel__muted"
          >
            {{ t("aiChat.proposalApplied") }}
          </p>
          <p
            v-else-if="message.proposal.status === 'rejected'"
            class="ai-chat-panel__muted"
          >
            {{ t("aiChat.proposalRejected") }}
          </p>
          <div class="ai-chat-panel__share-actions">
            <IconButton
              v-if="message.proposal.status === 'pending'"
              :label="t('aiChat.proposalApply')"
              :title="t('aiChat.proposalApply')"
              :disabled="isStale(message)"
              primary
              extra-class="ai-chat-panel__tool"
              @click="applyProposal(message)"
            >
              <Check
                :size="16"
                :stroke-width="1.8"
                aria-hidden="true"
              />
            </IconButton>
            <IconButton
              v-if="message.proposal.status === 'pending'"
              :label="t('aiChat.proposalReject')"
              :title="t('aiChat.proposalReject')"
              extra-class="ai-chat-panel__tool"
              @click="rejectProposal(message)"
            >
              <X
                :size="16"
                :stroke-width="1.8"
                aria-hidden="true"
              />
            </IconButton>
            <IconButton
              :label="diffOpenFor.has(message.id) ? t('aiChat.proposalHideDiff') : t('aiChat.proposalDiff')"
              :title="diffOpenFor.has(message.id) ? t('aiChat.proposalHideDiff') : t('aiChat.proposalDiff')"
              :pressed="diffOpenFor.has(message.id)"
              extra-class="ai-chat-panel__tool"
              @click="toggleDiff(message.id)"
            >
              <GitCompare
                :size="16"
                :stroke-width="1.8"
                aria-hidden="true"
              />
            </IconButton>
          </div>
          <pre
            v-if="diffOpenFor.has(message.id)"
            class="ai-chat-panel__diff"
          >{{ buildSimpleDiffPreview(message.proposal.baseSource, message.proposal.proposedSource) }}</pre>
        </div>

        <div class="ai-chat-panel__message-actions">
          <IconButton
            :label="t('aiChat.copyMessage')"
            :title="t('aiChat.copyMessage')"
            extra-class="ai-chat-panel__tool"
            @click="copyText(message.content)"
          >
            <Copy
              :size="16"
              :stroke-width="1.8"
              aria-hidden="true"
            />
          </IconButton>
          <IconButton
            v-if="message.role === 'user'"
            :label="t('aiChat.editResend')"
            :title="t('aiChat.editResend')"
            extra-class="ai-chat-panel__tool"
            @click="editAndResend(message)"
          >
            <Pencil
              :size="16"
              :stroke-width="1.8"
              aria-hidden="true"
            />
          </IconButton>
          <IconButton
            v-if="message.role === 'assistant'"
            :label="t('aiChat.regenerate')"
            :title="t('aiChat.regenerate')"
            extra-class="ai-chat-panel__tool"
            @click="regenerate"
          >
            <RefreshCw
              :size="16"
              :stroke-width="1.8"
              aria-hidden="true"
            />
          </IconButton>
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
            :rows="AI_CHAT_COMPOSER_ROWS"
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
              :aria-label="t('aiChat.stop')"
              :title="t('aiChat.stop')"
              @click="stopGeneration"
            >
              <Square
                :size="16"
                :stroke-width="1.8"
                aria-hidden="true"
              />
              <span class="sr-only">{{ t("aiChat.stop") }}</span>
            </button>
            <button
              v-else
              class="btn btn-primary ai-chat-panel__send"
              type="submit"
              data-testid="ai-chat-send"
              :aria-label="t('aiChat.send')"
              :title="t('aiChat.send')"
              :disabled="!canSend"
            >
              <Send
                :size="18"
                :stroke-width="1.8"
                aria-hidden="true"
              />
              <span class="sr-only">{{ t("aiChat.send") }}</span>
            </button>
          </div>
        </div>

        <div class="ai-chat-panel__meta">
          <div
            class="ai-chat-panel__toggles"
            role="group"
            data-testid="ai-chat-context-mode"
            :aria-label="t('aiChat.context')"
          >
            <IconButton
              :label="t('aiChat.contextCurrent')"
              :title="t('aiChat.contextCurrent')"
              :pressed="contextMode === 'current'"
              extra-class="ai-chat-panel__tool"
              @click="contextMode = 'current'"
            >
              <FileCode
                :size="16"
                :stroke-width="1.8"
                aria-hidden="true"
              />
            </IconButton>
            <IconButton
              :label="t('aiChat.contextNew')"
              :title="t('aiChat.contextNew')"
              :pressed="contextMode === 'new'"
              extra-class="ai-chat-panel__tool"
              data-testid="ai-chat-context-new"
              @click="contextMode = 'new'"
            >
              <FilePlus
                :size="16"
                :stroke-width="1.8"
                aria-hidden="true"
              />
            </IconButton>
          </div>
          <div
            class="ai-chat-panel__toggles"
            role="group"
            :aria-label="t('aiChat.applyMode')"
          >
            <IconButton
              :label="t('aiChat.applyModeProposal')"
              :title="t('aiChat.applyModeProposal')"
              :pressed="applyMode === 'proposal'"
              extra-class="ai-chat-panel__tool"
              @click="applyMode = 'proposal'"
            >
              <Eye
                :size="16"
                :stroke-width="1.8"
                aria-hidden="true"
              />
            </IconButton>
            <IconButton
              :label="t('aiChat.applyModeImmediate')"
              :title="t('aiChat.applyModeImmediate')"
              :pressed="applyMode === 'immediate'"
              extra-class="ai-chat-panel__tool"
              @click="applyMode = 'immediate'"
            >
              <Zap
                :size="16"
                :stroke-width="1.8"
                aria-hidden="true"
              />
            </IconButton>
          </div>
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
            @click="openSuggestion(step)"
          >
            <span class="ai-chat-panel__chip-text">{{ step }}</span>
          </button>
        </div>
      </div>
    </div>

    <AppModal
      :open="previewSuggestion !== null"
      :title="t('aiChat.suggestionTitle')"
      test-id="ai-chat-suggestion"
      @close="closeSuggestion"
    >
      <p class="ai-chat-panel__suggestion-text">
        {{ previewSuggestion }}
      </p>
      <template #footer>
        <button
          class="btn"
          type="button"
          @click="closeSuggestion"
        >
          {{ t("app.cancel") }}
        </button>
        <button
          class="btn btn-primary"
          type="button"
          data-testid="ai-chat-suggestion-ask"
          :disabled="isBusy || !previewSuggestion"
          @click="askSuggestion"
        >
          {{ t("aiChat.askSuggestion") }}
        </button>
      </template>
    </AppModal>
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

.ai-chat-panel__tool {
  width: 32px;
  min-width: 32px;
  height: 32px;
  min-height: 32px;
  padding: 0;
}

.ai-chat-panel__toggles {
  display: inline-flex;
  align-items: center;
  gap: 2px;
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

.ai-chat-panel__provider {
  display: flex;
  flex: 0 1 14rem;
  min-width: 8rem;
  max-width: 16rem;
}

.ai-chat-panel__provider-select {
  width: 100%;
  height: 32px;
  min-height: 32px;
  padding: 0 8px;
  font-size: 0.78rem;
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

.ai-chat-panel__target {
  margin: 0;
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 600;
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
  --ai-chat-input-line-height: 1.4;
  --ai-chat-input-padding-block: 10px;
  --ai-chat-input-max-height: min(50vh, 22rem);

  flex: 1 1 auto;
  width: auto;
  min-width: 0;
  margin: 0;
  padding: var(--ai-chat-input-padding-block) 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  resize: vertical;
  line-height: var(--ai-chat-input-line-height);
  min-height: calc(
    var(--ai-chat-composer-rows) * var(--ai-chat-input-line-height) * 1em +
      var(--ai-chat-input-padding-block) * 2
  );
  max-height: var(--ai-chat-input-max-height);
  overflow-y: auto;
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
  flex: 0 0 auto;
  width: var(--btn-touch, 44px);
  min-width: var(--btn-touch, 44px);
  min-height: var(--btn-touch, 44px);
  padding: 0;
  border-radius: 12px;
  touch-action: manipulation;
}

.ai-chat-panel__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.ai-chat-panel__next {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
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
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.ai-chat-panel__chip {
  display: block;
  width: 100%;
  min-height: 28px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  color: var(--text);
  padding: 6px 10px;
  cursor: pointer;
  font-size: 0.75rem;
  line-height: 1.35;
  text-align: start;
  touch-action: manipulation;
}

.ai-chat-panel__chip-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--ai-chat-chip-lines);
  line-clamp: var(--ai-chat-chip-lines);
  overflow: hidden;
  overflow-wrap: anywhere;
  white-space: normal;
}

.ai-chat-panel__suggestion-text {
  margin: 0;
  max-height: min(50vh, 16rem);
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.45;
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

  .ai-chat-panel__composer,
  .ai-chat-panel__meta,
  .ai-chat-panel__next {
    flex: 0 0 auto;
  }
}
</style>
