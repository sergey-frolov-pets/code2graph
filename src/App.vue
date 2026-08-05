<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import AboutModal from "@/components/AboutModal.vue";
import AppDialogHost from "@/components/AppDialogHost.vue";
import DiagramEditor from "@/components/DiagramEditor.vue";
import DiagramLibraryModal from "@/components/DiagramLibraryModal.vue";
import DiagramPreview from "@/components/DiagramPreview.vue";
import InstallAppButton from "@/components/InstallAppButton.vue";
import IconButton from "@/components/IconButton.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import DiagramWizardModal from "@/components/DiagramWizardModal.vue";
import LlmPatchModal from "@/components/LlmPatchModal.vue";
import LlmKeysGuideModal from "@/components/LlmKeysGuideModal.vue";
import SettingsModal from "@/components/SettingsModal.vue";
import SyntaxResultModal from "@/components/SyntaxResultModal.vue";
import {
  APP_META,
  getDefaultSource,
  LAYOUT_ENGINES,
  RENDER_DEBOUNCE_MS,
  STORAGE_KEY_DARK,
  STORAGE_KEY_DIAGRAM_DARK,
  STORAGE_KEY_LAYOUT,
  STORAGE_KEY_UI_DARK,
  STORAGE_KEY_SOURCE,
  translateSourceForLocale,
  type LayoutEngine,
} from "@/constants";
import {
  findSampleDiagramIdAnyLocale,
  getSampleDiagramSource,
  isDefaultSource,
} from "@/constants/sample-diagrams";
import {
  DEFAULT_EDITOR_FONT_FAMILY_ID,
  DEFAULT_EDITOR_FONT_SIZE,
  DEFAULT_PREVIEW_BG,
  isEditorFontFamilyId,
  isEditorFontSize,
  resolveEditorFontFamily,
  STORAGE_KEY_EDITOR_FONT_FAMILY,
  STORAGE_KEY_EDITOR_FONT_SIZE,
  STORAGE_KEY_PREVIEW_BG,
  type EditorFontFamilyId,
  type EditorFontSize,
} from "@/constants/editor-settings";
import {
  isEngineReady,
  renderPlantUmlToSvg,
  validatePlantUmlSyntax,
  waitForEngineReady,
} from "@/composables/usePlantUml";
import {
  consumeSharedLaunch,
  setupLaunchQueue,
} from "@/composables/usePumlShare";
import { useAppDialog } from "@/composables/useAppDialog";
import { useEditorHistory } from "@/composables/useEditorHistory";
import { useLlmKeysGuide } from "@/composables/useLlmKeysGuide";
import { useLocale } from "@/composables/useLocale";
import {
  preparePlantUmlSource,
  splitSourceLines,
} from "@/utils/plantuml-source";
import {
  downloadBlob,
  downloadTextFile,
  svgToPngBlob,
} from "@/utils/export";
import { resolveLocalizedErrorMessage } from "@/utils/localized-app-error";
import { savePumlSource, resolvePumlFileName } from "@/utils/puml-files";
import type { SyntaxCheckResult } from "@/utils/plantuml-syntax";

const { prompt, alert } = useAppDialog();
const { t, locale } = useLocale();
const {
  guideModalOpen,
  guideProviderId,
  closeLlmKeysGuide,
} = useLlmKeysGuide();
const {
  canUndo,
  canRedo,
  undo: undoHistory,
  redo: redoHistory,
  clearHistory,
  pushHistoryEntry,
} = useEditorHistory();

const source = ref(getDefaultSource(locale.value));
const layout = ref<LayoutEngine>(LAYOUT_ENGINES.smetana);
function readStoredBoolean(key: string): boolean | null {
  try {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      return saved === "true";
    }
  } catch {
    // file:// может блокировать localStorage
  }

  return null;
}

function readInitialUiDarkMode(): boolean {
  return (
    readStoredBoolean(STORAGE_KEY_UI_DARK) ??
    readStoredBoolean(STORAGE_KEY_DARK) ??
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function readInitialDiagramDarkMode(): boolean {
  return (
    readStoredBoolean(STORAGE_KEY_DIAGRAM_DARK) ??
    readStoredBoolean(STORAGE_KEY_DARK) ??
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

const uiDarkMode = ref(readInitialUiDarkMode());
const diagramDarkMode = ref(readInitialDiagramDarkMode());
const editorFontSize = ref<EditorFontSize>(readInitialEditorFontSize());
const editorFontFamilyId = ref<EditorFontFamilyId>(readInitialEditorFontFamilyId());
const previewBackground = ref(readInitialPreviewBackground(diagramDarkMode.value));
const editorFontFamily = computed(() =>
  resolveEditorFontFamily(editorFontFamilyId.value),
);
const svg = ref("");
const error = ref("");
const isRendering = ref(false);
const isValidating = ref(false);
const engineReady = ref(false);
const engineStatus = ref(t("app.engineLoading"));
const loadedFileName = ref("diagram.puml");
const syntaxResult = ref<SyntaxCheckResult | null>(null);
const syntaxErrorLines = ref<number[]>([]);
const isSyntaxModalOpen = ref(false);
const isSettingsModalOpen = ref(false);
const isLibraryModalOpen = ref(false);
const isAboutModalOpen = ref(false);
const isPatchModalOpen = ref(false);
const isWizardModalOpen = ref(false);
const patchSelectionStart = ref(0);
const patchSelectionEnd = ref(0);
const statusBarRef = ref<HTMLElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let statusBarObserver: ResizeObserver | null = null;

const canExport = computed(() => Boolean(svg.value) && !error.value && !isRendering.value);
const canSave = computed(() => Boolean(source.value.trim()));

function readInitialEditorFontSize(): EditorFontSize {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_EDITOR_FONT_SIZE);
    if (saved && isEditorFontSize(saved)) {
      return saved;
    }
  } catch {
    // file:// может блокировать localStorage
  }

  return DEFAULT_EDITOR_FONT_SIZE;
}

function readInitialEditorFontFamilyId(): EditorFontFamilyId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_EDITOR_FONT_FAMILY);
    if (saved && isEditorFontFamilyId(saved)) {
      return saved;
    }
  } catch {
    // file:// может блокировать localStorage
  }

  return DEFAULT_EDITOR_FONT_FAMILY_ID;
}

function normalizeColor(value: string): string {
  return value.trim().toLowerCase();
}

function readInitialPreviewBackground(isDark: boolean): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_PREVIEW_BG);
    if (saved) {
      const normalized = normalizeColor(saved);
      if (isDark && normalized === normalizeColor(DEFAULT_PREVIEW_BG.light)) {
        return DEFAULT_PREVIEW_BG.dark;
      }
      if (!isDark && normalized === normalizeColor(DEFAULT_PREVIEW_BG.dark)) {
        return DEFAULT_PREVIEW_BG.light;
      }
      return saved;
    }
  } catch {
    // file:// может блокировать localStorage
  }

  return isDark ? DEFAULT_PREVIEW_BG.dark : DEFAULT_PREVIEW_BG.light;
}

function persistSettings(): void {
  try {
    localStorage.setItem(STORAGE_KEY_SOURCE, source.value);
    localStorage.setItem(STORAGE_KEY_UI_DARK, String(uiDarkMode.value));
    localStorage.setItem(
      STORAGE_KEY_DIAGRAM_DARK,
      String(diagramDarkMode.value),
    );
    localStorage.setItem(STORAGE_KEY_LAYOUT, layout.value);
    localStorage.setItem(STORAGE_KEY_EDITOR_FONT_SIZE, editorFontSize.value);
    localStorage.setItem(STORAGE_KEY_EDITOR_FONT_FAMILY, editorFontFamilyId.value);
    localStorage.setItem(STORAGE_KEY_PREVIEW_BG, previewBackground.value);
  } catch {
    // file:// может блокировать localStorage
  }
}

function applyLocaleToStoredSource(): void {
  if (isDefaultSource(source.value)) {
    source.value = getDefaultSource(locale.value);
    return;
  }

  const sampleId = findSampleDiagramIdAnyLocale(source.value);
  if (sampleId) {
    source.value = getSampleDiagramSource(sampleId, locale.value);
  }
}

function restoreSettings(): void {
  try {
    const savedSource = localStorage.getItem(STORAGE_KEY_SOURCE);
    const savedLayout = localStorage.getItem(STORAGE_KEY_LAYOUT);

    if (savedSource) {
      source.value = savedSource;
    }

    if (savedLayout && savedLayout in LAYOUT_ENGINES) {
      layout.value = savedLayout as LayoutEngine;
    }

    applyLocaleToStoredSource();
  } catch {
    // file:// может блокировать localStorage
  }
}

async function renderDiagram(): Promise<void> {
  if (!engineReady.value) {
    error.value = t("app.engineNotReady");
    return;
  }

  isRendering.value = true;
  error.value = "";

  try {
    const prepared = await preparePlantUmlSource(source.value, layout.value);
    const lines = splitSourceLines(prepared);
    const result = await renderPlantUmlToSvg(lines, {
      dark: diagramDarkMode.value,
    });
    svg.value = result;
  } catch (renderError) {
    svg.value = "";
    error.value =
      renderError instanceof Error
        ? resolveLocalizedErrorMessage(renderError, t, "app.unknownRenderError")
        : t("app.unknownRenderError");
  } finally {
    isRendering.value = false;
  }
}

function applyLoadedSource(content: string, fileName: string): void {
  source.value = content;
  loadedFileName.value = fileName;
  error.value = "";
  syntaxErrorLines.value = [];
  clearHistory();
  persistSettings();
  scheduleRender();
}

function applySourceUndo(): void {
  const previous = undoHistory(source.value);
  if (!previous) {
    return;
  }

  source.value = previous;
  syntaxErrorLines.value = [];
  persistSettings();
  scheduleRender();
}

function applySourceRedo(): void {
  const next = redoHistory(source.value);
  if (!next) {
    return;
  }

  source.value = next;
  syntaxErrorLines.value = [];
  persistSettings();
  scheduleRender();
}

function onFileLoaded(payload: { content: string; fileName: string }): void {
  applyLoadedSource(payload.content, payload.fileName);
}

function onImportError(message: string): void {
  void alert({
    title: t("app.importError"),
    message,
    variant: "error",
  });
}

function onEditorCleared(): void {
  loadedFileName.value = "diagram.puml";
  syntaxErrorLines.value = [];
  error.value = "";
  clearHistory();
  persistSettings();
  scheduleRender();
}

async function initializeIncomingSources(): Promise<void> {
  setupLaunchQueue((payload) => {
    applyLoadedSource(payload.content, payload.fileName);
  });

  const shared = await consumeSharedLaunch();
  if (shared) {
    applyLoadedSource(shared.content, shared.fileName);
  }
}

function scheduleRender(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    void renderDiagram();
  }, RENDER_DEBOUNCE_MS);
}

function updateSyntaxHighlights(result: SyntaxCheckResult | null): void {
  if (!result || result.valid) {
    syntaxErrorLines.value = [];
    return;
  }

  syntaxErrorLines.value = [
    ...new Set(
      result.issues
        .map((issue) => issue.line)
        .filter((line): line is number => typeof line === "number"),
    ),
  ];
}

async function savePuml(): Promise<void> {
  if (!canSave.value) {
    return;
  }

  const fileName = await prompt({
    title: t("app.savePuml"),
    message: t("app.fileName"),
    value: loadedFileName.value,
    confirmLabel: t("app.save"),
    placeholder: "diagram.puml",
  });

  if (fileName === null) {
    return;
  }

  const resolvedName = resolvePumlFileName(fileName);
  loadedFileName.value = resolvedName;
  savePumlSource(source.value, resolvedName);
}

async function validateSyntax(): Promise<void> {
  isSyntaxModalOpen.value = true;
  isValidating.value = true;
  syntaxResult.value = null;

  try {
    const result = await validatePlantUmlSyntax(
      source.value,
      layout.value,
      diagramDarkMode.value,
    );
    syntaxResult.value = result;
    updateSyntaxHighlights(result);
  } finally {
    isValidating.value = false;
  }
}

function closeSyntaxModal(): void {
  isSyntaxModalOpen.value = false;
}

function exportSvg(): void {
  if (!svg.value) {
    return;
  }
  downloadTextFile(svg.value, "diagram.svg", "image/svg+xml;charset=utf-8");
}

async function exportPng(): Promise<void> {
  if (!svg.value) {
    return;
  }

  try {
    const background = previewBackground.value;
    const pngBlob = await svgToPngBlob(svg.value, background);
    downloadBlob(pngBlob, "diagram.png");
  } catch (exportError) {
    const message = resolveLocalizedErrorMessage(
      exportError,
      t,
      "app.exportPngFailed",
    );
    void alert({
      title: t("app.exportError"),
      message,
      variant: "error",
    });
  }
}

watch(
  uiDarkMode,
  (isDark) => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  },
  { immediate: true },
);

watch(
  diagramDarkMode,
  (isDark, wasDark) => {
    if (wasDark === undefined || wasDark === isDark) {
      return;
    }

    previewBackground.value = isDark
      ? DEFAULT_PREVIEW_BG.dark
      : DEFAULT_PREVIEW_BG.light;
  },
  { immediate: true },
);

watch(
  previewBackground,
  (value) => {
    document.documentElement.style.setProperty("--preview-bg", value);
  },
  { immediate: true },
);

watch([source, layout, diagramDarkMode], () => {
  persistSettings();
  scheduleRender();
});

watch([editorFontSize, editorFontFamilyId, previewBackground, uiDarkMode], () => {
  persistSettings();
});

watch(source, () => {
  if (syntaxErrorLines.value.length > 0) {
    syntaxErrorLines.value = [];
  }
});

watch(locale, (nextLocale, previousLocale) => {
  if (previousLocale) {
    const translated = translateSourceForLocale(
      source.value,
      previousLocale,
      nextLocale,
    );
    if (translated) {
      source.value = translated;
    }
  }

  engineStatus.value = engineReady.value
    ? t("app.engineReady")
    : t("app.engineLoading");
});

function openSettingsModal(): void {
  isSettingsModalOpen.value = true;
}

function openLibraryModal(): void {
  isLibraryModalOpen.value = true;
}

function onLibraryDiagramOpen(payload: {
  content: string;
  fileName: string;
}): void {
  applyLoadedSource(payload.content, payload.fileName);
}

function openAboutFromSettings(): void {
  isSettingsModalOpen.value = false;
  isAboutModalOpen.value = true;
}

function openWizardModal(): void {
  isWizardModalOpen.value = true;
}

function onAiPatchRequest(payload: { start: number; end: number }): void {
  patchSelectionStart.value = payload.start;
  patchSelectionEnd.value = payload.end;
  isPatchModalOpen.value = true;
}

function applyAiPlantUml(plantuml: string, label: string): void {
  const before = source.value;
  if (before === plantuml) {
    return;
  }

  pushHistoryEntry({
    before,
    after: plantuml,
    label,
  });
  source.value = plantuml;
  syntaxErrorLines.value = [];
  error.value = "";
  persistSettings();
  scheduleRender();
}

onMounted(() => {
  const updateStatusBarHeight = (): void => {
    const height = statusBarRef.value?.offsetHeight ?? 42;
    document.documentElement.style.setProperty(
      "--status-bar-height",
      `${height}px`,
    );
  };

  updateStatusBarHeight();

  if (statusBarRef.value) {
    statusBarObserver = new ResizeObserver(updateStatusBarHeight);
    statusBarObserver.observe(statusBarRef.value);
  }

  restoreSettings();
  void initializeIncomingSources();
  void waitForEngineReady()
    .then(() => {
      engineReady.value = isEngineReady();
      engineStatus.value = engineReady.value
        ? t("app.engineReady")
        : t("app.error");
      scheduleRender();
    })
    .catch((bootError) => {
      engineReady.value = false;
      engineStatus.value =
        resolveLocalizedErrorMessage(bootError, t, "app.engineLoadError");
      error.value = engineStatus.value;
    });
});

onUnmounted(() => {
  statusBarObserver?.disconnect();
  statusBarObserver = null;
});
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header__main">
        <h1>{{ APP_META.name }}</h1>
        <p>{{ t("app.subtitle") }}</p>
      </div>
      <nav class="app-header__nav" :aria-label="t('app.settings')">
        <IconButton
          :label="t('app.aiNewDiagram')"
          extra-class="app-header__icon-btn"
          @click="openWizardModal"
        >
          <ActionIcon name="ai" />
        </IconButton>
        <IconButton
          :label="t('app.library')"
          extra-class="app-header__icon-btn"
          @click="openLibraryModal"
        >
          <ActionIcon name="library" />
        </IconButton>
        <InstallAppButton />
        <IconButton
          :label="t('app.settings')"
          extra-class="app-header__icon-btn"
          @click="openSettingsModal"
        >
          <span class="app-header__gear-icon" aria-hidden="true">⚙</span>
        </IconButton>
      </nav>
    </header>

    <main class="app-main">
      <DiagramEditor
        v-model="source"
        :error-lines="syntaxErrorLines"
        :editor-font-size="editorFontSize"
        :editor-font-family="editorFontFamily"
        :can-save="canSave"
        :is-validating="isValidating"
        :is-rendering="isRendering"
        :can-undo="canUndo"
        :can-redo="canRedo"
        @file-loaded="onFileLoaded"
        @import-error="onImportError"
        @save-puml="savePuml"
        @validate-syntax="validateSyntax"
        @cleared="onEditorCleared"
        @undo="applySourceUndo"
        @redo="applySourceRedo"
        @ai-patch="onAiPatchRequest"
      />

      <DiagramPreview
        :svg="svg"
        :error="error"
        :is-rendering="isRendering"
        :can-export="canExport"
        v-model:preview-background="previewBackground"
        v-model:diagram-dark-mode="diagramDarkMode"
        @render-now="renderDiagram"
        @export-svg="exportSvg"
        @export-png="exportPng"
      />
    </main>

    <footer ref="statusBarRef" class="status-bar">
      <span>{{ t("app.file") }}: {{ loadedFileName }}</span>
      <span class="status-bar__engine">
        <span>{{ t("app.engine") }}: {{ layout }}</span>
        <span
          v-if="engineReady"
          class="status-bar__engine-ok"
          :aria-label="t('app.engineReady')"
          :title="t('app.engineReady')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 12.5 10 16.5 18 7.5"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span v-else class="status-pill is-error status-pill--inline">{{
          engineStatus
        }}</span>
      </span>
      <span class="status-bar__copyright">{{ APP_META.copyright }}</span>
    </footer>

    <AppDialogHost />

    <SyntaxResultModal
      :open="isSyntaxModalOpen"
      :result="syntaxResult"
      :is-validating="isValidating"
      @close="closeSyntaxModal"
    />

    <DiagramLibraryModal
      :open="isLibraryModalOpen"
      @close="isLibraryModalOpen = false"
      @open-diagram="onLibraryDiagramOpen"
    />

    <SettingsModal
      :open="isSettingsModalOpen"
      v-model:layout="layout"
      v-model:dark-mode="uiDarkMode"
      v-model:editor-font-size="editorFontSize"
      v-model:editor-font-family-id="editorFontFamilyId"
      @close="isSettingsModalOpen = false"
      @open-about="openAboutFromSettings"
    />

    <AboutModal
      :open="isAboutModalOpen"
      @close="isAboutModalOpen = false"
    />

    <LlmPatchModal
      :open="isPatchModalOpen"
      :source="source"
      :selection-start="patchSelectionStart"
      :selection-end="patchSelectionEnd"
      :layout="layout"
      :diagram-dark-mode="diagramDarkMode"
      :open-settings="openSettingsModal"
      @close="isPatchModalOpen = false"
      @apply="(payload) => applyAiPlantUml(payload.plantuml, payload.label)"
    />

    <DiagramWizardModal
      :open="isWizardModalOpen"
      :layout="layout"
      :diagram-dark-mode="diagramDarkMode"
      :open-settings="openSettingsModal"
      @close="isWizardModalOpen = false"
      @apply="(payload) => applyAiPlantUml(payload.plantuml, payload.label)"
    />

    <LlmKeysGuideModal
      :open="guideModalOpen"
      :highlight-provider-id="guideProviderId"
      @close="closeLlmKeysGuide"
    />
  </div>
</template>

<style scoped>
.app-header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.app-header__main {
  flex: 1;
  min-width: 220px;
}

.app-header__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.app-header__icon-btn {
  width: 40px;
  min-width: 40px;
  height: 40px;
  min-height: 40px;
  padding: 0;
}

.app-header__gear-icon {
  display: block;
  font-size: 1.25rem;
  line-height: 1;
}
</style>
