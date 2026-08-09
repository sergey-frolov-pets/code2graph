import {
  computed,
  inject,
  provide,
  ref,
  type ComputedRef,
  type InjectionKey,
  type Ref,
} from "vue";
import type { TranslateFn } from "@/locales/types";
import { useAiSourceApply } from "@/composables/useAiSourceApply";
import { useAppDialog } from "@/composables/useAppDialog";
import { useAppModals } from "@/composables/useAppModals";
import { useDiagramDocument } from "@/composables/useDiagramDocument";
import { useDiagramExport } from "@/composables/useDiagramExport";
import { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { useDiagramRender } from "@/composables/useDiagramRender";
import { useEditorHistory } from "@/composables/useEditorHistory";
import { useEditorSourceHistory } from "@/composables/useEditorSourceHistory";
import { useLlmKeysGuide } from "@/composables/useLlmKeysGuide";
import { useLocale } from "@/composables/useLocale";
import { usePersistedSettings } from "@/composables/usePersistedSettings";
import { useSyntaxValidation } from "@/composables/useSyntaxValidation";
import { getLibraryApiBaseUrl } from "@/config/library-api";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { getDiagramFormatDefinition } from "@/constants/diagram-formats";
import { PENDING_SHARE_STORAGE_KEY } from "@/constants/library-share";
import { PENDING_SUBSCRIPTION_STORAGE_KEY } from "@/constants/library-subscription";

export interface AppShellContext {
  t: TranslateFn;
  source: Ref<string>;
  diagramFormat: Ref<DiagramFormat>;
  layout: Ref<import("@/constants").LayoutEngine>;
  renderMode: Ref<import("@/constants/render-settings").RenderMode>;
  uiDarkMode: Ref<boolean>;
  diagramDarkMode: Ref<boolean>;
  editorFontSize: Ref<import("@/constants/editor-settings").EditorFontSize>;
  editorFontFamilyId: Ref<import("@/constants/editor-settings").EditorFontFamilyId>;
  editorSyntaxHighlight: Ref<boolean>;
  editorAutocomplete: Ref<boolean>;
  previewBackground: Ref<string>;
  editorFontFamily: ComputedRef<string>;
  svg: Ref<string>;
  error: Ref<string>;
  isRendering: Ref<boolean>;
  isValidating: Ref<boolean>;
  syntaxResult: Ref<import("@/utils/plantuml-syntax").SyntaxCheckResult | null>;
  syntaxErrorLines: Ref<number[]>;
  syntaxAskInitialQuestion: Ref<string>;
  loadedFileName: Ref<string>;
  linkedLibraryDiagramId: Ref<string | null>;
  activeMobilePanel: Ref<"editor" | "preview">;
  canSave: ComputedRef<boolean>;
  canExport: ComputedRef<boolean>;
  canUndo: ComputedRef<boolean>;
  canRedo: ComputedRef<boolean>;
  formatDefinition: ComputedRef<ReturnType<typeof getDiagramFormatDefinition>>;
  patchSelectionStart: Ref<number>;
  patchSelectionEnd: Ref<number>;
  modals: ReturnType<typeof useAppModals>;
  llmKeysGuide: ReturnType<typeof useLlmKeysGuide>;
  applySourceUndo: () => void;
  applySourceRedo: () => void;
  onConvertApply: (payload: { source: string; format: DiagramFormat }) => void;
  onFileLoaded: (payload: {
    content: string;
    fileName: string;
    format?: DiagramFormat;
    diagramId?: string;
  }) => void;
  onEditorFileLoaded: (payload: {
    content: string;
    fileName: string;
    format: DiagramFormat;
  }) => void;
  openSaveToLibraryModal: () => void;
  onEditorClearedWithLink: () => void;
  onImportError: (message: string) => void;
  runSyntaxValidation: () => Promise<void>;
  onAiPatchRequestOpen: (payload: { start: number; end: number }) => void;
  onAiSyntaxAskOpen: (initialQuestion?: string) => void;
  onSyntaxAskFromValidation: () => void;
  applyAiPlantUml: (source: string, label: string) => void;
  applyWizardDiagram: (source: string, label: string) => void;
  savePuml: () => Promise<void>;
  onVersionRestore: (source: string) => void;
  renderDiagram: () => Promise<void>;
  exportSvg: () => Promise<void>;
  exportPng: () => void;
  boot: () => void;
}

export const APP_SHELL_KEY: InjectionKey<AppShellContext> = Symbol("app-shell");

export function provideAppShell(shell: AppShellContext): void {
  provide(APP_SHELL_KEY, shell);
}

export function useAppShellContext(): AppShellContext {
  const shell = inject(APP_SHELL_KEY);
  if (!shell) {
    throw new Error("useAppShellContext must be used within App");
  }

  return shell;
}

export function useAppShell(): AppShellContext {
  const linkedLibraryDiagramId = ref<string | null>(null);
  const activeMobilePanel = ref<"editor" | "preview">("editor");
  const diagramFormat = ref<DiagramFormat>("plantuml");
  const syntaxAskInitialQuestion = ref("");
  const suppressSourceHistory = ref(0);

  const { alert } = useAppDialog();
  const { t, locale } = useLocale();
  const llmKeysGuide = useLlmKeysGuide();
  const modals = useAppModals();

  const {
    canUndo,
    canRedo,
    undo: undoHistory,
    redo: redoHistory,
    clearHistory,
    pushHistoryEntry,
  } = useEditorHistory();

  const historyEditLabel = computed(() => t("editor.history.edit"));

  function withSuppressedSourceHistory(action: () => void): void {
    suppressSourceHistory.value += 1;
    try {
      action();
    } finally {
      suppressSourceHistory.value -= 1;
    }
  }

  const {
    source,
    layout,
    renderMode,
    uiDarkMode,
    diagramDarkMode,
    editorFontSize,
    editorFontFamilyId,
    editorSyntaxHighlight,
    editorAutocomplete,
    previewBackground,
    editorFontFamily,
    persistSettings,
    restoreSettings,
  } = usePersistedSettings();

  const { flushPendingHistory, cancelPendingHistory } = useEditorSourceHistory({
    source,
    diagramFormat,
    pushHistoryEntry,
    historyEditLabel,
    isSuppressed: computed(() => suppressSourceHistory.value > 0),
  });

  function clearEditorHistory(): void {
    cancelPendingHistory();
    clearHistory();
  }

  const formatDefinition = computed(() =>
    getDiagramFormatDefinition(diagramFormat.value),
  );

  const {
    svg,
    error,
    isRendering,
    renderDiagram,
    scheduleRender,
    bootEngine,
  } = useDiagramRender({
    source,
    diagramFormat,
    layout,
    diagramDarkMode,
    renderMode,
    locale,
    t,
    onPersist: persistSettings,
  });

  const {
    isValidating,
    syntaxResult,
    syntaxErrorLines,
    validateSyntax,
  } = useSyntaxValidation({ source, diagramFormat, layout, diagramDarkMode, renderMode });

  const {
    loadedFileName,
    canSave,
    applyLoadedSource,
    onEditorCleared,
    initializeIncomingSources,
    prepareRestoredSource,
    savePuml,
    onVersionRestore,
  } = useDiagramDocument({
    source,
    diagramFormat,
    error,
    syntaxErrorLines,
    persistSettings,
    scheduleRender,
    clearHistory: clearEditorHistory,
  });

  const { canExport, exportSvg, exportPng } = useDiagramExport({
    svg,
    error,
    isRendering,
    previewBackground,
  });

  const {
    patchSelectionStart,
    patchSelectionEnd,
    onAiPatchRequest,
    applyAiPlantUml,
    applyWizardDiagram,
  } = useAiSourceApply({
    source,
    error,
    syntaxErrorLines,
    persistSettings,
    scheduleRender,
    pushHistoryEntry,
  });

  function applySourceUndo(): void {
    flushPendingHistory();
    withSuppressedSourceHistory(() => {
      const previous = undoHistory(source.value, diagramFormat.value);
      if (!previous) {
        return;
      }
      source.value = previous.source;
      if (previous.format !== undefined) {
        diagramFormat.value = previous.format;
      }
      syntaxErrorLines.value = [];
      persistSettings();
      scheduleRender();
    });
  }

  function applySourceRedo(): void {
    flushPendingHistory();
    withSuppressedSourceHistory(() => {
      const next = redoHistory(source.value, diagramFormat.value);
      if (!next) {
        return;
      }
      source.value = next.source;
      if (next.format !== undefined) {
        diagramFormat.value = next.format;
      }
      syntaxErrorLines.value = [];
      persistSettings();
      scheduleRender();
    });
  }

  function onConvertApply(payload: { source: string; format: DiagramFormat }): void {
    flushPendingHistory();
    const before = source.value;
    const beforeFormat = diagramFormat.value;

    withSuppressedSourceHistory(() => {
      source.value = payload.source;
      diagramFormat.value = payload.format;
      loadedFileName.value = getDiagramFormatDefinition(payload.format).defaultFileName;
      syntaxErrorLines.value = [];
      error.value = "";
    });

    if (before === source.value && beforeFormat === diagramFormat.value) {
      return;
    }

    pushHistoryEntry({
      before,
      after: source.value,
      beforeFormat,
      afterFormat: diagramFormat.value,
      label: t("conversion.historyLabel"),
    });
    persistSettings();
    scheduleRender();
  }

  function onFileLoaded(payload: {
    content: string;
    fileName: string;
    format?: DiagramFormat;
    diagramId?: string;
  }): void {
    flushPendingHistory();
    withSuppressedSourceHistory(() => {
      applyLoadedSource(payload.content, payload.fileName, payload.format);
    });
    linkedLibraryDiagramId.value = payload.diagramId ?? null;
  }

  function onEditorFileLoaded(payload: {
    content: string;
    fileName: string;
    format: DiagramFormat;
  }): void {
    onFileLoaded(payload);
  }

  function openSaveToLibraryModal(): void {
    void useDiagramLibrary().refresh();
    modals.openSaveToLibraryModal();
  }

  function onEditorClearedWithLink(): void {
    linkedLibraryDiagramId.value = null;
    onEditorCleared();
  }

  function onImportError(message: string): void {
    void alert({
      title: t("app.importError"),
      message,
      variant: "error",
    });
  }

  async function runSyntaxValidation(): Promise<void> {
    modals.isSyntaxModalOpen.value = true;
    await validateSyntax();
  }

  function onAiPatchRequestOpen(payload: { start: number; end: number }): void {
    onAiPatchRequest(payload);
    modals.isPatchModalOpen.value = true;
  }

  function onAiSyntaxAskOpen(initialQuestion = ""): void {
    syntaxAskInitialQuestion.value = initialQuestion;
    modals.openSyntaxAskModal();
  }

  function onSyntaxAskFromValidation(): void {
    modals.closeSyntaxModal();
    onAiSyntaxAskOpen();
  }

  function applyAiPlantUmlWithHistory(plantuml: string, label: string): void {
    flushPendingHistory();
    withSuppressedSourceHistory(() => {
      applyAiPlantUml(plantuml, label);
    });
  }

  function applyWizardDiagramWithHistory(wizardSource: string, label: string): void {
    flushPendingHistory();
    withSuppressedSourceHistory(() => {
      applyWizardDiagram(wizardSource, label);
    });
  }

  function onVersionRestoreWithHistory(content: string): void {
    flushPendingHistory();
    withSuppressedSourceHistory(() => {
      onVersionRestore(content);
    });
  }

  async function handleShareLinkOnBoot(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    const shareToken = params.get("share");
    const subscriptionToken = params.get("sub");

    if (!getLibraryApiBaseUrl()) {
      return;
    }

    try {
      if (shareToken) {
        sessionStorage.setItem(PENDING_SHARE_STORAGE_KEY, shareToken);
        modals.openLibraryModal();
        return;
      }

      if (subscriptionToken) {
        sessionStorage.setItem(PENDING_SUBSCRIPTION_STORAGE_KEY, subscriptionToken);
        modals.openLibraryModal();
      }
    } catch (bootError) {
      void alert({
        title: t("library.shareOpenErrorTitle"),
        message:
          bootError instanceof Error
            ? bootError.message
            : t("library.shareOpenError"),
        variant: "error",
      });
    }
  }

  function boot(): void {
    restoreSettings();
    prepareRestoredSource();
    void initializeIncomingSources();
    void bootEngine();
    void handleShareLinkOnBoot();
  }

  return {
    t,
    source,
    diagramFormat,
    layout,
    renderMode,
    uiDarkMode,
    diagramDarkMode,
    editorFontSize,
    editorFontFamilyId,
    editorSyntaxHighlight,
    editorAutocomplete,
    previewBackground,
    editorFontFamily,
    svg,
    error,
    isRendering,
    isValidating,
    syntaxResult,
    syntaxErrorLines,
    syntaxAskInitialQuestion,
    loadedFileName,
    linkedLibraryDiagramId,
    activeMobilePanel,
    canSave,
    canExport,
    canUndo,
    canRedo,
    formatDefinition,
    patchSelectionStart,
    patchSelectionEnd,
    modals,
    llmKeysGuide,
    applySourceUndo,
    applySourceRedo,
    onConvertApply,
    onFileLoaded,
    onEditorFileLoaded,
    openSaveToLibraryModal,
    onEditorClearedWithLink,
    onImportError,
    runSyntaxValidation,
    onAiPatchRequestOpen,
    onAiSyntaxAskOpen,
    onSyntaxAskFromValidation,
    applyAiPlantUml: applyAiPlantUmlWithHistory,
    applyWizardDiagram: applyWizardDiagramWithHistory,
    savePuml,
    onVersionRestore: onVersionRestoreWithHistory,
    renderDiagram,
    exportSvg,
    exportPng,
    boot,
  };
}
