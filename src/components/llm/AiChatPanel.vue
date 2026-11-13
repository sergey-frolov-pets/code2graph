<script setup lang="ts">
import {
  Check,
  ClipboardCopy,
  Copy,
  Eye,
  FileCode,
  FilePlus,
  GitCompare,
  History,
  Mic,
  Paperclip,
  Pencil,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Send,
  SlidersHorizontal,
  Square,
  Trash2,
  X,
  Zap,
} from "@lucide/vue";
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import { isAgentDiagramType } from "@shared/agent-diagram";
import IconButton from "@/components/IconButton.vue";
import type { LayoutEngine } from "@/constants";
import { getLlmAccount } from "@/config/llm-accounts";
import { parseFreeLlmSelectionId } from "@/config/llm-account-record";
import { resolveAccountLlmModel, resolveSelectedLlmModel } from "@/config/llm-model-selection";
import { getLlmProvider, resolveInflightInput } from "@/constants/llm-providers";
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
import { useChatLlmSelection } from "@/composables/useChatLlmSelection";
import { iconButtonTooltipsSuspendedKey } from "@/composables/useLongPressTooltip";
import { useDictation } from "@/composables/useDictation";
import { useLocale } from "@/composables/useLocale";
import { getLanguageModule } from "@/languages/registry";
import { isLocaleKey, type LocaleKey } from "@/locales/types";
import { resolveDiagramFileName } from "@/utils/diagram-files";
import { formatTokenCount } from "@/utils/format-token-count";
import { sendAiChatMessage } from "@/services/llm/ai-chat-client";
import {
  decideInflightFollowUp,
  joinAmendedUserText,
  type InflightPhase,
} from "@/services/llm/inflight-follow-up";
import { buildSimpleDiffPreview } from "@/utils/llm-preview";
import {
  buildAiChatTranscriptMarkdown,
  countAiChatMessages,
  createAiChatMessageId,
  filterAiChatSessions,
} from "@/utils/ai-chat-session";
import type { LlmChatImagePart } from "@/services/llm/llm-types";
import { LlmClientError } from "@/services/llm/llm-types";
import type { DictationFatalError } from "@/constants/dictation";
import type { AiChatAttachment, AiChatMessage, AiChatSession } from "@/types/ai-chat-session";
import {
  AI_CHAT_ATTACHMENT_ACCEPT,
  attachmentFromPastedText,
  classifyAiChatFile,
  isOversizedChatPaste,
  nextPastedTextFileName,
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
/** Пустое поле показывает подсказки. С текстом остаются скрепка, микрофон и отправка. */
const showComposerHints = computed(() => draft.value.length === 0);
const pendingAttachments = ref<Array<AiChatReadAttachment & { id: string }>>([]);
const attachmentNotice = ref("");
const fileInputRef = ref<HTMLInputElement | null>(null);
const isBusy = ref(false);
const {
  availableLocales: dictationLocales,
  listening: dictationListening,
  toggleDictation,
  stopDictation,
} = useDictation();

const DICTATION_ERROR_KEYS = {
  "not-allowed": "aiChat.dictateNotAllowed",
  "service-not-allowed": "aiChat.dictateNoService",
  "audio-capture": "aiChat.dictateNoMicrophone",
  "language-not-supported": "aiChat.dictateLanguageUnsupported",
  network: "aiChat.dictateNetwork",
} as const satisfies Record<DictationFatalError, LocaleKey>;

function onDictateToggle(): void {
  toggleDictation(draft, (error) => {
    attachmentNotice.value = t(DICTATION_ERROR_KEYS[error]);
  });
}
const threadRef = ref<HTMLElement | null>(null);
const errorMessage = ref("");
const historyOpen = ref(false);
const historyQuery = ref("");
const selectedIds = ref<Set<string>>(new Set());
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
  () => draft.value.trim().length > 0 || pendingAttachments.value.length > 0,
);
/** Одна кнопка: стоп, пока ответ идёт и композер пуст, иначе — отправить. */
const composerPrimaryIsStop = computed(() => isBusy.value && !canSend.value);

interface QueuedChatTurn {
  id: string;
  text: string;
  attachments: AiChatAttachment[];
  images: LlmChatImagePart[];
}

interface InflightTurn {
  abort: AbortController;
  phase: InflightPhase;
  text: string;
  attachments: AiChatAttachment[];
  images: LlmChatImagePart[];
}

const outboundQueue = ref<QueuedChatTurn[]>([]);
let inflight: InflightTurn | null = null;

const activeChatProviderId = computed(
  () => chatProviderOptions.value.find((item) => item.id === chatProviderId.value)?.providerId ?? "",
);

const sessionTokenTotal = computed(() =>
  (activeSession.value?.messages ?? []).reduce(
    (sum, message) => sum + (message.usage?.totalTokens ?? 0),
    0,
  ),
);

/** Полное название, если в шапке или списке оно обрезано многоточием. */
const expandedTitle = ref<string | null>(null);
/** Полный текст подсказки: наведение или долгое нажатие, отправка — отдельной кнопкой. */
const suggestionPreview = ref<string | null>(null);
/** Наведение закрывается уходом мыши, долгое нажатие остаётся, пока его не закроют. */
type SuggestionOpenMode = "hover" | "press";
const suggestionPreviewMode = ref<SuggestionOpenMode | null>(null);
const titlePopoverRef = ref<HTMLElement | null>(null);
const suggestionPreviewRef = ref<HTMLElement | null>(null);
const suggestionChipsRef = ref<HTMLElement | null>(null);
const headerTitleRef = ref<HTMLElement | null>(null);

const AI_CHAT_SUGGESTION_LONG_PRESS_MS = 400;
const AI_CHAT_SUGGESTION_HOVER_CLOSE_MS = 160;
let suggestionPressTimer: ReturnType<typeof setTimeout> | null = null;
let suggestionHoverCloseTimer: ReturnType<typeof setTimeout> | null = null;
let suppressSuggestionClick = false;
let overlayListenerAttached = false;

/**
 * Подсказки «Что дальше»: от модели, а до первого ответа — стартовые по состоянию диаграммы.
 * Чипы стоят в футере сразу над полем ввода. Короткий тап отправляет, наведение и долгое нажатие открывают полный текст.
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

const composerInputRef = ref<HTMLTextAreaElement | null>(null);
const composerFocused = ref(false);
const modesOpen = ref(false);

provide(
  iconButtonTooltipsSuspendedKey,
  computed(() => modesOpen.value),
);
const pickedMessageId = ref<string | null>(null);
const AI_CHAT_COMPOSER_MAX_LINES = 4;

function resizeComposer(): void {
  const field = composerInputRef.value;
  if (!field) {
    return;
  }
  field.style.height = "auto";
  const style = getComputedStyle(field);
  const line = Number.parseFloat(style.lineHeight) || 20;
  const pad = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
  const max = line * AI_CHAT_COMPOSER_MAX_LINES + pad;
  field.style.height = `${Math.min(Math.max(field.scrollHeight, line + pad), max)}px`;
}

function isTouchPrimary(): boolean {
  if (typeof window.matchMedia !== "function") {
    return false;
  }
  return (
    window.matchMedia("(pointer: coarse)").matches &&
    !window.matchMedia("(any-pointer: fine)").matches
  );
}

function scrollThreadToEnd(): void {
  const thread = threadRef.value;
  if (!thread) {
    return;
  }
  thread.scrollTop = thread.scrollHeight;
}

function isTextTruncated(element: HTMLElement | null): boolean {
  if (!element) {
    return false;
  }
  return element.scrollWidth > element.clientWidth + 1;
}

function closeExpandedTitle(): void {
  expandedTitle.value = null;
}

function clearSuggestionHoverCloseTimer(): void {
  if (suggestionHoverCloseTimer !== null) {
    clearTimeout(suggestionHoverCloseTimer);
    suggestionHoverCloseTimer = null;
  }
}

function closeSuggestionPreview(): void {
  suggestionPreview.value = null;
  suggestionPreviewMode.value = null;
  clearSuggestionHoverCloseTimer();
}

function openSuggestionPreview(step: string, mode: SuggestionOpenMode): void {
  if (modesOpen.value || isBusy.value) {
    return;
  }
  clearSuggestionHoverCloseTimer();
  expandedTitle.value = null;
  suggestionPreviewMode.value = mode;
  suggestionPreview.value = step;
}

function titleUnlessModesOpen(label: string): string | undefined {
  return modesOpen.value ? undefined : label;
}

const contextHintIcon = computed(() => (contextMode.value === "new" ? FilePlus : FileCode));
const applyHintIcon = computed(() => (applyMode.value === "immediate" ? Zap : Eye));

/** Модель и провайдер выбранной в чате учётки — тем же правилом, что и отправка. */
const composerSelection = computed(() => {
  const option = chatProviderOptions.value.find((item) => item.id === chatProviderId.value);
  if (!option) {
    return { model: "", provider: "" };
  }

  const provider = getLlmProvider(option.providerId);
  const providerName = provider ? t(provider.nameKey) : option.label;
  if (parseFreeLlmSelectionId(option.id)) {
    return {
      model: provider?.defaultModel ?? "",
      provider: providerName,
    };
  }

  const account = getLlmAccount(option.id);
  return {
    model: account
      ? resolveAccountLlmModel(account)
      : resolveSelectedLlmModel(option.providerId),
    provider: providerName,
  };
});

const composerFieldLabel = computed(() => {
  const selection = composerSelection.value;
  const parts = [
    contextMode.value === "new" ? t("aiChat.contextNew") : t("aiChat.contextCurrent"),
    applyMode.value === "immediate"
      ? t("aiChat.applyModeImmediate")
      : t("aiChat.applyModeProposal"),
    selection.model,
    selection.provider,
  ].filter((part) => part.length > 0);
  return `${t("aiChat.inputPlaceholder")} · ${parts.join(" · ")}`;
});

function showExpandedTitle(text: string): void {
  closeSuggestionPreview();
  expandedTitle.value = text;
}

function onHeaderTitleClick(): void {
  const title = activeSession.value?.title ?? "";
  const text = headerTitleRef.value?.querySelector(".ai-chat-panel__title-text");
  if (!title || !(text instanceof HTMLElement) || !isTextTruncated(text)) {
    return;
  }
  showExpandedTitle(title);
}

function onSessionOpen(event: MouseEvent, session: AiChatSession): void {
  const text = (event.currentTarget as HTMLElement).querySelector(
    ".ai-chat-panel__session-title",
  );
  if (text instanceof HTMLElement && isTextTruncated(text)) {
    showExpandedTitle(session.title);
    return;
  }
  selectSession(session.id);
}

function clearSuggestionPressTimer(): void {
  if (suggestionPressTimer !== null) {
    clearTimeout(suggestionPressTimer);
    suggestionPressTimer = null;
  }
}

function onSuggestionHover(step: string): void {
  openSuggestionPreview(step, "hover");
}

function onSuggestionHoverEnd(): void {
  if (suggestionPreviewMode.value !== "hover") {
    return;
  }
  clearSuggestionHoverCloseTimer();
  suggestionHoverCloseTimer = setTimeout(() => {
    suggestionHoverCloseTimer = null;
    if (suggestionPreviewMode.value === "hover") {
      closeSuggestionPreview();
    }
  }, AI_CHAT_SUGGESTION_HOVER_CLOSE_MS);
}

function onSuggestionPreviewEnter(): void {
  if (suggestionPreviewMode.value === "hover") {
    clearSuggestionHoverCloseTimer();
  }
}

function onSuggestionPointerDown(event: PointerEvent, step: string): void {
  if (event.button !== 0 || event.pointerType === "mouse" || isBusy.value || modesOpen.value) {
    return;
  }
  clearSuggestionPressTimer();
  suggestionPressTimer = setTimeout(() => {
    suggestionPressTimer = null;
    suppressSuggestionClick = true;
    openSuggestionPreview(step, "press");
  }, AI_CHAT_SUGGESTION_LONG_PRESS_MS);
}

function onSuggestionPointerEnd(): void {
  clearSuggestionPressTimer();
}

function onSuggestionClick(step: string): void {
  if (suppressSuggestionClick) {
    suppressSuggestionClick = false;
    return;
  }
  closeSuggestionPreview();
  void onSend(step);
}

function sendSuggestionPreview(): void {
  const step = suggestionPreview.value;
  closeSuggestionPreview();
  if (step) {
    void onSend(step);
  }
}

function onOverlayKeydown(event: KeyboardEvent): void {
  if (event.key !== "Escape") {
    return;
  }
  if (suggestionPreview.value) {
    closeSuggestionPreview();
    return;
  }
  closeExpandedTitle();
}

function onOverlayPointerDown(event: Event): void {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (suggestionPreview.value) {
    const insidePreview = suggestionPreviewRef.value?.contains(target) ?? false;
    const insideChips = suggestionChipsRef.value?.contains(target) ?? false;
    if (!insidePreview && !insideChips) {
      closeSuggestionPreview();
    }
  }
  if (!expandedTitle.value) {
    return;
  }
  const insideTitle = titlePopoverRef.value?.contains(target) ?? false;
  const insideHeader = headerTitleRef.value?.contains(target) ?? false;
  const insideSessionTitle =
    target instanceof Element && Boolean(target.closest(".ai-chat-panel__session-open"));
  if (!insideTitle && !insideHeader && !insideSessionTitle) {
    closeExpandedTitle();
  }
}

function syncOverlayListener(): void {
  const open = suggestionPreview.value !== null || expandedTitle.value !== null;
  if (open && !overlayListenerAttached) {
    overlayListenerAttached = true;
    document.addEventListener("keydown", onOverlayKeydown);
    requestAnimationFrame(() => {
      if (overlayListenerAttached) {
        document.addEventListener("pointerdown", onOverlayPointerDown);
      }
    });
    return;
  }
  if (!open && overlayListenerAttached) {
    overlayListenerAttached = false;
    document.removeEventListener("keydown", onOverlayKeydown);
    document.removeEventListener("pointerdown", onOverlayPointerDown);
  }
}

onMounted(() => {
  void load();
  void nextTick(resizeComposer);
});

onBeforeUnmount(() => {
  stopDictation();
  clearSuggestionPressTimer();
  clearSuggestionHoverCloseTimer();
  overlayListenerAttached = false;
  document.removeEventListener("keydown", onOverlayKeydown);
  document.removeEventListener("pointerdown", onOverlayPointerDown);
});

watch(draft, () => {
  if (draft.value.length > 0) {
    modesOpen.value = false;
  }
  void nextTick(resizeComposer);
});

watch(isBusy, (busy) => {
  if (busy) {
    stopDictation();
  }
});

watch([suggestionPreview, expandedTitle], () => {
  syncOverlayListener();
});

watch(modesOpen, (open) => {
  if (open) {
    closeSuggestionPreview();
  }
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
  pickedMessageId.value = null;
  void persist(session);
  void nextTick(() => {
    composerInputRef.value?.focus();
    resizeComposer();
  });
}

function onUserMessageClick(message: AiChatMessage): void {
  if (message.role !== "user" || isBusy.value) {
    return;
  }
  pickedMessageId.value = pickedMessageId.value === message.id ? null : message.id;
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
  inflight?.abort.abort();
  inflight = null;
  generationToken += 1;
  isBusy.value = false;
}

function onComposerPrimaryClick(event: Event): void {
  if (!composerPrimaryIsStop.value) {
    return;
  }
  event.preventDefault();
  stopGeneration();
}

function removeQueued(id: string): void {
  outboundQueue.value = outboundQueue.value.filter((item) => item.id !== id);
}

function chatErrorText(error: unknown): string {
  if (error instanceof LlmClientError) {
    if (error.code === "connection_dropped") {
      return t("aiChat.connectionDropped");
    }
    if (error.code === "reasoning_budget") {
      return t("aiChat.reasoningBudget");
    }
    return error.message;
  }
  return error instanceof Error ? error.message : t("aiChat.generateError");
}

function enqueueTurn(text: string, attachments: AiChatAttachment[], images: LlmChatImagePart[]): void {
  outboundQueue.value = [
    ...outboundQueue.value,
    { id: createAiChatMessageId(), text, attachments, images },
  ];
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

function onComposerPaste(event: ClipboardEvent): void {
  const text = event.clipboardData?.getData("text/plain") ?? "";
  if (!isOversizedChatPaste(text)) {
    return;
  }

  event.preventDefault();
  const name = nextPastedTextFileName(pendingAttachments.value.map((item) => item.name));
  if (pendingAttachments.value.length >= AI_CHAT_MAX_ATTACHMENTS) {
    attachmentNotice.value = t("aiChat.attachmentLimit", { count: AI_CHAT_MAX_ATTACHMENTS });
    return;
  }

  const result = attachmentFromPastedText(text, name);
  if (!result.ok) {
    attachmentNotice.value = t("aiChat.attachmentTooLarge", { name, maxMb: attachmentMaxMb });
    return;
  }

  pendingAttachments.value = [
    ...pendingAttachments.value,
    { ...result.attachment, id: createAiChatMessageId() },
  ];
  attachmentNotice.value = t("aiChat.pasteAttachedAsFile", { name: result.attachment.name });
}

function removeAttachment(id: string): void {
  pendingAttachments.value = pendingAttachments.value.filter((item) => item.id !== id);
}

async function onFilesSelected(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const files = [...(input.files ?? [])];
  input.value = "";
  if (files.length === 0) {
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

function takeComposerTurn(content?: string): QueuedChatTurn | null {
  const typed = (content ?? draft.value).trim().slice(0, AI_CHAT_MESSAGE_MAX_CHARS);
  const pending = pendingAttachments.value;
  if (typed.length === 0 && pending.length === 0) {
    return null;
  }
  const text = typed || t("aiChat.attachmentsOnlyPrompt");
  const attachments = storedAttachments(pending);
  const images = liveImages(pending);
  draft.value = "";
  pendingAttachments.value = [];
  attachmentNotice.value = "";
  return { id: createAiChatMessageId(), text, attachments, images };
}

function followUpFits(turn: QueuedChatTurn): boolean {
  const current = inflight;
  if (!current) {
    return false;
  }
  const joined = joinAmendedUserText(current.text, turn.text);
  return (
    joined.length <= AI_CHAT_MESSAGE_MAX_CHARS &&
    current.attachments.length + turn.attachments.length <= AI_CHAT_MAX_ATTACHMENTS &&
    current.images.length + turn.images.length <= AI_CHAT_MAX_IMAGE_ATTACHMENTS
  );
}

async function amendInflight(turn: QueuedChatTurn): Promise<void> {
  const current = inflight;
  const session = activeSession.value;
  if (!current || !session || !followUpFits(turn)) {
    enqueueTurn(turn.text, turn.attachments, turn.images);
    return;
  }

  const text = joinAmendedUserText(current.text, turn.text);
  const attachments = [...current.attachments, ...turn.attachments];
  const images = [...current.images, ...turn.images];
  const lastUser = [...session.messages].reverse().find((message) => message.role === "user");
  if (lastUser) {
    lastUser.content = text;
    lastUser.attachments = attachments.length > 0 ? attachments : undefined;
    await persist(session);
  }
  current.abort.abort();
  generationToken += 1;
  await runSend(text, { skipUserAppend: true, attachments, images });
}

async function onSend(content?: string): Promise<void> {
  stopDictation();
  const turn = takeComposerTurn(content);
  if (!turn) {
    return;
  }
  if (!isBusy.value) {
    await runSend(turn.text, { attachments: turn.attachments, images: turn.images });
    return;
  }

  const action = decideInflightFollowUp({
    phase: inflight?.phase ?? "streaming",
    inflightInput: resolveInflightInput(activeChatProviderId.value),
  });
  if (action === "amend" && followUpFits(turn)) {
    await amendInflight(turn);
    return;
  }
  enqueueTurn(turn.text, turn.attachments, turn.images);
}

async function flushQueuedTurn(): Promise<void> {
  const next = outboundQueue.value[0];
  if (!next || isBusy.value) {
    return;
  }
  outboundQueue.value = outboundQueue.value.slice(1);
  await runSend(next.text, { attachments: next.attachments, images: next.images });
}

async function runSend(
  text: string,
  options: {
    skipUserAppend?: boolean;
    attachments?: AiChatAttachment[];
    images?: LlmChatImagePart[];
  } = {},
): Promise<void> {
  const token = ++generationToken;
  const abort = new AbortController();
  const attachments = options.attachments ?? [];
  const images = options.images ?? [];
  inflight = { abort, phase: "waiting", text, attachments, images };
  isBusy.value = true;
  errorMessage.value = "";
  let failed = false;

  try {
    const session = await ensureActiveSession();
    if (token !== generationToken) {
      return;
    }
    if (!options.skipUserAppend) {
      session.messages.push({
        id: createAiChatMessageId(),
        role: "user",
        content: text,
        attachments: attachments.length > 0 ? attachments : undefined,
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
      signal: abort.signal,
      onOutputStart: () => {
        if (inflight?.abort === abort) {
          inflight.phase = "streaming";
        }
      },
    });

    if (token !== generationToken) {
      return; // Пользователь нажал «Остановить» или дописал запрос — ответ отбрасываем.
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
      ...(result.usage ? { usage: result.usage } : {}),
      ...(result.reasoningContent ? { reasoningContent: result.reasoningContent } : {}),
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
    if (token !== generationToken || (error instanceof Error && error.name === "AbortError")) {
      return;
    }
    failed = true;
    errorMessage.value = chatErrorText(error);
  } finally {
    if (token === generationToken) {
      isBusy.value = false;
      inflight = null;
    }
  }

  if (token === generationToken && !failed) {
    await flushQueuedTurn();
  }
}

function onComposerKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing || event.keyCode === 229) {
    return;
  }
  if (isTouchPrimary()) {
    return;
  }
  event.preventDefault();
  void onSend();
}

function onComposerFocus(): void {
  composerFocused.value = true;
  modesOpen.value = false;
  closeSuggestionPreview();
}

function onComposerBlur(): void {
  composerFocused.value = false;
}

async function onCopyChat(): Promise<void> {
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
  >
    <div class="ai-chat-panel__toolbar">
      <button
        ref="headerTitleRef"
        class="ai-chat-panel__title"
        type="button"
        data-testid="ai-chat-title"
        :aria-label="activeSession?.title || t('aiChat.defaultSessionTitle')"
        @click="onHeaderTitleClick"
      >
        <span class="ai-chat-panel__title-text">{{ activeSession?.title }}</span>
      </button>
      <IconButton
        :label="t('aiChat.newSession')"
        :title="titleUnlessModesOpen(t('aiChat.newSession'))"
        extra-class="ai-chat-panel__tool"
        @click="createSession()"
      >
        <Plus
          :size="16"
          :stroke-width="1.8"
          aria-hidden="true"
        />
      </IconButton>
      <IconButton
        :label="t('aiChat.history')"
        :title="titleUnlessModesOpen(t('aiChat.history'))"
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
        :label="t('aiChat.copyChat')"
        :title="titleUnlessModesOpen(t('aiChat.copyChat'))"
        :disabled="!activeSession"
        extra-class="ai-chat-panel__tool"
        data-testid="ai-chat-copy"
        @click="onCopyChat"
      >
        <ClipboardCopy
          :size="16"
          :stroke-width="1.8"
          aria-hidden="true"
        />
      </IconButton>
    </div>

    <div
      v-if="expandedTitle"
      ref="titlePopoverRef"
      class="ai-chat-panel__title-popover"
      data-testid="ai-chat-title-popover"
      role="dialog"
      :aria-label="expandedTitle"
    >
      <p class="ai-chat-panel__popover-text">
        {{ expandedTitle }}
      </p>
    </div>

    <div class="ai-chat-panel__stage">
      <div
        v-if="historyOpen"
        class="ai-chat-panel__history"
        data-testid="ai-chat-history-sheet"
      >
        <input
          v-model="historyQuery"
          class="ai-chat-panel__search"
          data-testid="ai-chat-history-search"
          type="search"
          :placeholder="t('aiChat.searchPlaceholder')"
          :aria-label="t('aiChat.searchPlaceholder')"
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
              v-if="renamingId !== session.id"
              class="ai-chat-panel__session-open"
              type="button"
              @click="onSessionOpen($event, session)"
            >
              <span class="ai-chat-panel__session-title">{{ session.title }}</span>
            </button>
            <input
              v-else
              v-model="renameDraft"
              class="ai-chat-panel__rename"
              type="text"
              :aria-label="t('aiChat.rename')"
            >
            <IconButton
              v-if="renamingId === session.id"
              :label="t('aiChat.rename')"
              :title="titleUnlessModesOpen(t('aiChat.rename'))"
              extra-class="ai-chat-panel__tool"
              @click="commitRename(session)"
            >
              <Check
                :size="16"
                :stroke-width="1.8"
                aria-hidden="true"
              />
            </IconButton>
            <IconButton
              :label="session.pinned ? t('aiChat.unpin') : t('aiChat.pin')"
              :title="titleUnlessModesOpen(session.pinned ? t('aiChat.unpin') : t('aiChat.pin'))"
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
              :title="titleUnlessModesOpen(t('aiChat.rename'))"
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
              :title="titleUnlessModesOpen(t('aiChat.duplicate'))"
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
              :title="titleUnlessModesOpen(t('aiChat.delete'))"
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
          v-for="(message, messageIndex) in activeSession?.messages ?? []"
          :key="message.id"
          class="ai-chat-panel__message"
          :class="[
            `ai-chat-panel__message--${message.role}`,
            {
              'is-last': messageIndex === (activeSession?.messages.length ?? 1) - 1,
              'is-picked': pickedMessageId === message.id,
            },
          ]"
        >
          <span class="ai-chat-panel__role">{{
            message.role === "user" ? t("llm.chat.roleUser") : t("llm.chat.roleAssistant")
          }}</span>
          <p
            class="ai-chat-panel__content"
            :class="{ 'is-actionable': message.role === 'user' }"
            @click="onUserMessageClick(message)"
          >
            {{ message.content }}
          </p>
          <p
            v-if="message.role === 'assistant' && message.usage"
            class="ai-chat-panel__tokens"
            data-testid="ai-chat-token-usage"
          >
            {{
              t("aiChat.tokenUsage", {
                prompt: formatTokenCount(message.usage.promptTokens),
                completion: formatTokenCount(message.usage.completionTokens),
                total: formatTokenCount(message.usage.totalTokens),
              })
            }}
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
            <div class="ai-chat-panel__proposal-line">
              <p class="ai-chat-panel__proposal-text">
                <span class="ai-chat-panel__role">{{ t("aiChat.proposalTitle") }}</span>
                <span
                  v-if="proposalTargetLabel(message)"
                  class="ai-chat-panel__target"
                >{{ proposalTargetLabel(message) }}</span>
                {{ message.proposal.explanation }}
              </p>
              <div class="ai-chat-panel__share-actions">
                <IconButton
                  v-if="message.proposal.status === 'pending'"
                  :label="t('aiChat.proposalApply')"
                  :title="titleUnlessModesOpen(t('aiChat.proposalApply'))"
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
                  :title="titleUnlessModesOpen(t('aiChat.proposalReject'))"
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
                  :title="titleUnlessModesOpen(diffOpenFor.has(message.id) ? t('aiChat.proposalHideDiff') : t('aiChat.proposalDiff'))"
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
            </div>
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
            <pre
              v-if="diffOpenFor.has(message.id)"
              class="ai-chat-panel__diff"
            >{{ buildSimpleDiffPreview(message.proposal.baseSource, message.proposal.proposedSource) }}</pre>
          </div>

          <div class="ai-chat-panel__message-actions">
            <IconButton
              :label="t('aiChat.copyMessage')"
              :title="titleUnlessModesOpen(t('aiChat.copyMessage'))"
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
              :title="titleUnlessModesOpen(t('aiChat.editResend'))"
              extra-class="ai-chat-panel__tool"
              data-testid="ai-chat-edit"
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
              :title="titleUnlessModesOpen(t('aiChat.regenerate'))"
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
        <article
          v-for="item in outboundQueue"
          :key="item.id"
          class="ai-chat-panel__message ai-chat-panel__message--queued"
          data-testid="ai-chat-queued"
        >
          <span class="ai-chat-panel__role">{{ t("aiChat.queued") }}</span>
          <p class="ai-chat-panel__content">{{ item.text }}</p>
          <button
            class="ai-chat-panel__attachment-remove"
            type="button"
            :aria-label="t('aiChat.removeQueued')"
            @click="removeQueued(item.id)"
          >
            <X
              :size="14"
              :stroke-width="1.8"
              aria-hidden="true"
            />
          </button>
        </article>
        <p
          v-if="isBusy"
          class="ai-chat-panel__thinking"
        >
          {{ t("llm.chat.thinking") }}
        </p>
      </div>
    </div>

    <div class="ai-chat-panel__dock">
      <p
        v-if="dictationListening"
        class="ai-chat-panel__recording"
        data-testid="ai-chat-recording"
        role="status"
        aria-live="polite"
      >
        <span
          class="ai-chat-panel__recording-dot"
          aria-hidden="true"
        />
        {{ t("aiChat.dictateRecording") }}
      </p>
      <p
        v-if="errorMessage"
        class="ai-chat-panel__warning"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <div
        v-if="suggestionPreview"
        ref="suggestionPreviewRef"
        class="ai-chat-panel__suggestion-preview"
        data-testid="ai-chat-suggestion-preview"
        role="dialog"
        :aria-label="suggestionPreview"
        @mouseenter="onSuggestionPreviewEnter"
        @mouseleave="onSuggestionHoverEnd"
      >
        <p class="ai-chat-panel__popover-text">
          {{ suggestionPreview }}
        </p>
        <div class="ai-chat-panel__suggestion-actions">
          <button
            class="btn btn-primary"
            type="button"
            data-testid="ai-chat-suggestion-send"
            @click="sendSuggestionPreview"
          >
            {{ t("aiChat.send") }}
          </button>
        </div>
      </div>

      <div
        v-if="showComposerHints && nextStepSuggestions.length > 0 && !composerFocused"
        ref="suggestionChipsRef"
        class="ai-chat-panel__next"
        data-testid="ai-chat-next"
        :aria-label="t('aiChat.nextSteps')"
        @mouseleave="onSuggestionHoverEnd"
      >
        <span class="ai-chat-panel__role">{{ t("aiChat.nextSteps") }}</span>
        <div class="ai-chat-panel__chips">
          <button
            v-for="(step, index) in nextStepSuggestions"
            :key="index"
            class="ai-chat-panel__chip"
            type="button"
            data-testid="ai-chat-suggestion"
            :disabled="isBusy"
            @click="onSuggestionClick(step)"
            @mouseenter="onSuggestionHover(step)"
            @pointerdown="onSuggestionPointerDown($event, step)"
            @pointerup="onSuggestionPointerEnd"
            @pointercancel="onSuggestionPointerEnd"
          >
            {{ step }}
          </button>
        </div>
      </div>

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
        <div
          class="ai-chat-panel__composer-box"
          :class="{ 'is-modes-open': modesOpen, 'is-recording': dictationListening }"
        >
          <input
            ref="fileInputRef"
            class="ai-chat-panel__file-input"
            data-testid="ai-chat-file-input"
            type="file"
            multiple
            :accept="attachmentAccept"
            @change="onFilesSelected"
          >
          <div
            class="ai-chat-panel__composer-line"
            data-testid="ai-chat-composer-line"
          >
            <button
              class="ai-chat-panel__attach"
              type="button"
              data-testid="ai-chat-attach"
              :aria-label="t('aiChat.attach')"
              :title="titleUnlessModesOpen(t('aiChat.attachHint'))"
              :disabled="pendingAttachments.length >= AI_CHAT_MAX_ATTACHMENTS"
              @click="openAttachmentPicker"
            >
              <Paperclip
                :size="18"
                :stroke-width="1.8"
                aria-hidden="true"
              />
            </button>
            <div class="ai-chat-panel__field">
              <textarea
                ref="composerInputRef"
                v-model="draft"
                class="ai-chat-panel__input"
                :class="{ 'is-hinting': showComposerHints }"
                rows="1"
                enterkeyhint="send"
                :aria-label="composerFieldLabel"
                @focus="onComposerFocus"
                @blur="onComposerBlur"
                @keydown="onComposerKeydown"
                @paste="onComposerPaste"
              />
              <div
                v-if="showComposerHints"
                class="ai-chat-panel__hint-row"
              >
                <button
                  class="ai-chat-panel__modes-toggle"
                  type="button"
                  data-testid="ai-chat-modes"
                  :aria-label="t('aiChat.composerModes')"
                  :aria-expanded="modesOpen"
                  :disabled="isBusy"
                  @click="modesOpen = !modesOpen"
                >
                  <SlidersHorizontal
                    :size="18"
                    :stroke-width="1.8"
                    aria-hidden="true"
                  />
                </button>
                <div
                  class="ai-chat-panel__hint"
                  data-testid="ai-chat-input-hint"
                  aria-hidden="true"
                >
                  <span class="ai-chat-panel__hint-modes">
                    <component
                      :is="contextHintIcon"
                      class="ai-chat-panel__hint-icon"
                      data-testid="ai-chat-hint-context"
                      :data-mode="contextMode"
                      :stroke-width="1.8"
                      aria-hidden="true"
                    />
                    <component
                      :is="applyHintIcon"
                      class="ai-chat-panel__hint-icon"
                      data-testid="ai-chat-hint-apply"
                      :data-mode="applyMode"
                      :stroke-width="1.8"
                      aria-hidden="true"
                    />
                  </span>
                  <span class="ai-chat-panel__hint-copy">
                    <span
                      v-if="composerSelection.model"
                      class="ai-chat-panel__hint-model"
                      data-testid="ai-chat-hint-model"
                    >{{ composerSelection.model }}</span>
                    <span
                      v-if="composerSelection.provider || sessionTokenTotal > 0"
                      class="ai-chat-panel__hint-sub"
                    >
                      <span
                        v-if="composerSelection.provider"
                        class="ai-chat-panel__hint-provider"
                        data-testid="ai-chat-hint-provider"
                      >{{ composerSelection.provider }}</span>
                      <span
                        v-if="composerSelection.provider && sessionTokenTotal > 0"
                        class="ai-chat-panel__hint-dot"
                        aria-hidden="true"
                      >·</span>
                      <span
                        v-if="sessionTokenTotal > 0"
                        class="ai-chat-panel__hint-tokens"
                        data-testid="ai-chat-token-session"
                      >{{ t("aiChat.tokenSession", { count: formatTokenCount(sessionTokenTotal) }) }}</span>
                    </span>
                  </span>
                </div>
              </div>
            </div>
            <div class="ai-chat-panel__composer-actions">
              <button
                v-if="dictationLocales.length > 0"
                class="ai-chat-panel__attach ai-chat-panel__mic"
                :class="{ 'is-listening': dictationListening }"
                type="button"
                data-testid="ai-chat-mic"
                :aria-label="dictationListening ? t('aiChat.dictateStop') : t('aiChat.dictate')"
                :aria-pressed="dictationListening"
                :title="titleUnlessModesOpen(dictationListening ? t('aiChat.dictateStop') : t('aiChat.dictate'))"
                @click="onDictateToggle"
              >
                <Mic
                  :size="18"
                  :stroke-width="1.8"
                  aria-hidden="true"
                />
              </button>
              <button
                class="btn ai-chat-panel__send"
                :class="{ 'btn-primary': !composerPrimaryIsStop }"
                :type="composerPrimaryIsStop ? 'button' : 'submit'"
                :data-testid="composerPrimaryIsStop ? 'ai-chat-stop' : 'ai-chat-send'"
                :aria-label="composerPrimaryIsStop ? t('aiChat.stop') : t('aiChat.send')"
                :title="titleUnlessModesOpen(composerPrimaryIsStop ? t('aiChat.stop') : t('aiChat.send'))"
                :disabled="!composerPrimaryIsStop && !canSend"
                @click="onComposerPrimaryClick"
              >
                <Square
                  v-if="composerPrimaryIsStop"
                  :size="16"
                  :stroke-width="1.8"
                  aria-hidden="true"
                />
                <Send
                  v-else
                  :size="18"
                  :stroke-width="1.8"
                  aria-hidden="true"
                />
                <span class="sr-only">{{ composerPrimaryIsStop ? t("aiChat.stop") : t("aiChat.send") }}</span>
              </button>
            </div>
          </div>
          <div
            class="ai-chat-panel__modes"
            @click="modesOpen = false"
          >
            <label
              class="ai-chat-panel__provider"
              @click.stop
            >
              <span class="sr-only">{{ t("aiChat.provider") }}</span>
              <select
                class="ai-chat-panel__provider-select"
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
            <div
              class="ai-chat-panel__toggles"
              role="group"
              data-testid="ai-chat-context-mode"
              :aria-label="t('aiChat.context')"
            >
              <IconButton
                :label="t('aiChat.contextCurrent')"
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
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.ai-chat-panel {
  --ai-chat-gap: 4px;
  --ai-chat-bubble-radius: 14px;
  --ai-chat-composer-block-pad: 2px;
  --ai-chat-composer-inline-pad: 2px;
  --ai-chat-composer-icon-size: 32px;
  --ai-chat-composer-send-size: 36px;
  --ai-chat-composer-field-inset: 2px;
  --ai-chat-composer-hint-extra: 0.5rem;
  --ai-chat-hint-icon-size: 0.82rem;
  --ai-chat-hint-font-size: 0.72rem;
  --ai-chat-provider-font-size: 0.65rem;
  --ai-chat-provider-max-width: 16rem;
  --ai-chat-assistant-inset: 0.75rem;

  position: relative;
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
  border: 0;
  border-radius: var(--editor-radius);
  padding: 2px 4px;
  background: var(--surface-muted);
}

.ai-chat-panel__title {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  padding: 0 4px;
  border: 0;
  background: none;
  color: var(--text);
  font: inherit;
  font-weight: 600;
  font-size: 0.84rem;
  text-align: start;
  cursor: pointer;
}

.ai-chat-panel__title-text,
.ai-chat-panel__session-title {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-chat-panel__stage {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.ai-chat-panel__title-popover,
.ai-chat-panel__suggestion-preview {
  position: absolute;
  z-index: 5;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.ai-chat-panel__title-popover {
  top: 36px;
  left: 0;
  right: 0;
  max-height: min(12rem, 40vh);
  overflow: auto;
}

.ai-chat-panel__suggestion-preview {
  left: 0;
  right: 0;
  bottom: 100%;
  margin-bottom: 4px;
}

.ai-chat-panel__popover-text {
  margin: 0;
  padding: 6px 10px;
  overflow: auto;
  max-height: min(9rem, 32vh);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.45;
  font-size: 0.84rem;
}

.ai-chat-panel__suggestion-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 6px;
  padding: 0 10px 6px;
}

.ai-chat-panel__suggestion-actions .btn {
  min-height: 32px;
  padding: 4px 12px;
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

.ai-chat-panel__share-actions {
  flex-wrap: wrap;
}

.ai-chat-panel__message-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
}

@media (hover: hover) and (min-width: 901px) {
  .ai-chat-panel__message-actions {
    opacity: 0;
  }

  .ai-chat-panel__message:hover .ai-chat-panel__message-actions,
  .ai-chat-panel__message:focus-within .ai-chat-panel__message-actions {
    opacity: 1;
  }
}

.ai-chat-panel__role {
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

.ai-chat-panel__provider {
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  max-width: var(--ai-chat-provider-max-width);
}

.ai-chat-panel__provider-select {
  width: 100%;
  height: 32px;
  min-height: 32px;
  margin: 0;
  padding: 0 4px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text);
  font-size: var(--ai-chat-provider-font-size);
  line-height: 1.2;
}

.ai-chat-panel__provider-select option {
  font-size: var(--ai-chat-provider-font-size);
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
  position: relative;
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

.ai-chat-panel__message--queued {
  align-self: flex-end;
  margin-inline-start: 2rem;
  border: 1px dashed color-mix(in srgb, var(--text-muted) 55%, transparent);
  opacity: 0.8;
}

.ai-chat-panel__tokens,
.ai-chat-panel__hint-tokens {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.72rem;
  line-height: 1.3;
}

.ai-chat-panel__message--assistant {
  align-self: flex-start;
  margin-inline-end: 1.25rem;
  margin-inline-start: var(--ai-chat-assistant-inset);
  background: transparent;
  border: 0;
  padding-inline: 0;
}

.ai-chat-panel__content {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.45;
  font-size: 0.88rem;
}

.ai-chat-panel__content.is-actionable {
  cursor: pointer;
}

.ai-chat-panel__message.is-picked .ai-chat-panel__message-actions {
  display: flex;
  opacity: 1;
}

.ai-chat-panel__proposal {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  border: 0;
  padding: 0;
  background: transparent;
}

.ai-chat-panel__proposal-line {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-width: 0;
}

.ai-chat-panel__proposal-text {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
}

.ai-chat-panel__proposal-line .ai-chat-panel__share-actions {
  flex: 0 0 auto;
  flex-wrap: nowrap;
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

.ai-chat-panel__history {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding: 4px 0 0;
  overflow: hidden;
  background: var(--surface);
}

.ai-chat-panel__search,
.ai-chat-panel__rename {
  width: 100%;
  min-height: 36px;
  margin: 0;
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
}

.ai-chat-panel__rename {
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
}

.ai-chat-panel__session-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  overflow: auto;
}

.ai-chat-panel__session {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.ai-chat-panel__session input[type="checkbox"] {
  flex: 0 0 auto;
}

.ai-chat-panel__session.is-active .ai-chat-panel__session-open {
  font-weight: 700;
}

.ai-chat-panel__session-open {
  flex: 1 1 auto;
  min-width: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text);
  text-align: start;
  padding: 0;
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
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  margin-top: auto;
}

.ai-chat-panel__composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  margin: 0;
}

.ai-chat-panel__composer-box {
  position: relative;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0;
  min-width: 0;
  padding: var(--ai-chat-composer-block-pad) var(--ai-chat-composer-inline-pad)
    var(--ai-chat-composer-block-pad) var(--ai-chat-composer-field-inset);
  border: 1px solid var(--border);
  border-radius: var(--editor-radius);
  background: var(--surface);
}

.ai-chat-panel__composer-line {
  display: contents;
}

.ai-chat-panel__modes-toggle {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: var(--ai-chat-composer-icon-size);
  height: var(--ai-chat-composer-icon-size);
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  pointer-events: auto;
}

.ai-chat-panel__modes-toggle:hover:not(:disabled) {
  color: var(--text);
  background: var(--surface-muted);
}

.ai-chat-panel__modes {
  display: none;
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: calc(100% + 4px);
  z-index: 3;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 2px 4px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
}

.ai-chat-panel__composer-box.is-modes-open .ai-chat-panel__modes {
  display: flex;
}

.ai-chat-panel__composer-actions {
  order: 2;
}

.ai-chat-panel__composer-box:focus-within {
  border-color: var(--accent);
}

.ai-chat-panel__field {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  min-width: 0;
}

.ai-chat-panel__hint-row {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--ai-chat-composer-field-inset);
  min-width: 0;
  padding-inline: var(--ai-chat-composer-field-inset);
  overflow: hidden;
  pointer-events: none;
}

.ai-chat-panel__hint {
  display: flex;
  flex: 0 1 auto;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4em;
  min-width: 0;
  overflow: hidden;
  color: var(--text-muted);
  pointer-events: none;
}

.ai-chat-panel__hint-modes {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.125rem;
}

.ai-chat-panel__hint-copy {
  display: flex;
  flex: 0 1 auto;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 0.05rem;
  min-width: 0;
  font-size: var(--ai-chat-hint-font-size);
  line-height: 1.15;
  text-align: end;
}

.ai-chat-panel__hint-sub {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 0.35em;
  max-width: 100%;
  min-width: 0;
}

.ai-chat-panel__hint-icon {
  flex: 0 0 auto;
  width: var(--ai-chat-hint-icon-size);
  height: var(--ai-chat-hint-icon-size);
}

.ai-chat-panel__hint-model,
.ai-chat-panel__hint-provider {
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ai-chat-panel__hint-provider {
  flex: 0 1 auto;
}

.ai-chat-panel__hint-dot {
  flex: 0 0 auto;
}

.ai-chat-panel__input {
  flex: 1 1 auto;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  padding-block: calc((var(--ai-chat-composer-send-size) - 1.4em) / 2);
  padding-inline-start: var(--ai-chat-composer-field-inset);
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--text);
  resize: none;
  line-height: 1.4;
  min-height: var(--ai-chat-composer-send-size);
  max-height: calc(4 * 1.4em + (var(--ai-chat-composer-send-size) - 1.4em));
  overflow-y: auto;
  field-sizing: fixed;
}

.ai-chat-panel__input.is-hinting {
  min-height: calc(var(--ai-chat-composer-send-size) + var(--ai-chat-composer-hint-extra));
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
  width: var(--ai-chat-composer-icon-size);
  height: var(--ai-chat-composer-icon-size);
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

.ai-chat-panel__mic.is-listening,
.ai-chat-panel__mic.is-listening:hover:not(:disabled) {
  color: var(--danger);
  background: color-mix(in srgb, var(--danger) 16%, transparent);
  animation: ai-chat-mic-pulse 1.4s ease-in-out infinite;
}

.ai-chat-panel__composer-box.is-recording {
  border-color: var(--danger);
}

.ai-chat-panel__recording {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0;
  padding: 6px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--danger) 12%, var(--surface));
  color: var(--danger);
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.3;
}

.ai-chat-panel__recording-dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--danger) 55%, transparent);
  animation: ai-chat-recording-pulse 1.4s ease-out infinite;
}

@keyframes ai-chat-recording-pulse {
  70% {
    box-shadow: 0 0 0 8px transparent;
  }
}

@keyframes ai-chat-mic-pulse {
  50% {
    background: color-mix(in srgb, var(--danger) 32%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ai-chat-panel__recording-dot,
  .ai-chat-panel__mic.is-listening {
    animation: none;
  }
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
}

.ai-chat-panel__send {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: var(--ai-chat-composer-send-size);
  min-width: var(--ai-chat-composer-send-size);
  min-height: var(--ai-chat-composer-send-size);
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
  align-items: center;
  min-width: 0;
  padding: 4px 6px;
  border-radius: 12px;
  background: var(--surface-muted);
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
  max-width: 14rem;
  min-height: 28px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text);
  padding: 4px 10px;
  cursor: pointer;
  font-size: 0.75rem;
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
  .ai-chat-panel__composer-line {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: 0;
    min-width: 0;
    width: 100%;
  }

  .ai-chat-panel__composer-actions {
    order: 0;
  }

  .ai-chat-panel__message:not(.is-last) .ai-chat-panel__message-actions {
    display: none;
  }

  .ai-chat-panel__message.is-picked .ai-chat-panel__message-actions {
    display: flex;
    opacity: 1;
  }
}
</style>
