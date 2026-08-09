import { computed, onUnmounted, ref, watch, type Ref } from "vue";
import { RENDER_DEBOUNCE_MS, type LayoutEngine } from "@/constants";
import {
  getDiagramFormatDefinition,
  type DiagramFormat,
} from "@/constants/diagram-formats";
import {
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import type { AppLocale } from "@/constants/i18n";
import { useDiagramIrCache } from "@/composables/useDiagramIrCache";
import {
  bootFormatEngine,
  getFormatHandler,
  isFormatEngineReady,
  renderDiagram,
} from "@/formats";
import { buildDiagramIrForCache } from "@/services/conversion/pipeline/convert-diagram";
import type { TranslateFn } from "@/locales/types";
import { resolveLocalizedErrorMessage } from "@/utils/localized-app-error";
import {
  probeMermaidInkConnectivity,
  resetMermaidInkConnectivity,
} from "@/services/mermaid/mermaid-online";
import { isFileProtocol } from "@/pwa/installPromptState";

export interface UseDiagramRenderOptions {
  source: Ref<string>;
  diagramFormat: Ref<DiagramFormat>;
  layout: Ref<LayoutEngine>;
  diagramDarkMode: Ref<boolean>;
  renderMode: Ref<RenderMode>;
  locale: Ref<AppLocale>;
  t: TranslateFn;
  onPersist?: () => void;
}

export function useDiagramRender(options: UseDiagramRenderOptions) {
  const {
    source,
    diagramFormat,
    layout,
    diagramDarkMode,
    renderMode,
    locale,
    t,
    onPersist,
  } = options;

  const svg = ref("");
  const error = ref("");
  const isRendering = ref(false);
  const engineReady = ref(false);
  const engineStatus = ref(t("app.engineLoading"));
  const { setLastDiagramIr } = useDiagramIrCache();

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const formatDefinition = computed(() =>
    getDiagramFormatDefinition(diagramFormat.value),
  );

  const usesOnlineRender = computed(
    () =>
      formatDefinition.value.supportsOnlineRender &&
      isOnlineRenderMode(renderMode.value),
  );

  function buildFormatContext() {
    return {
      layout: layout.value,
      diagramDarkMode: diagramDarkMode.value,
      renderMode: renderMode.value,
    };
  }

  function resolveOnlineEngineNotReadyMessage(): string {
    if (isFileProtocol()) {
      return diagramFormat.value === "mermaid"
        ? t("engine.mermaidOnlineFileProtocol")
        : t("engine.onlineFileProtocol");
    }

    return t("app.renderModeOnlineOffline");
  }

  async function updateOnlineEngineStatus(): Promise<void> {
    if (!usesOnlineRender.value) {
      return;
    }

    if (diagramFormat.value === "mermaid") {
      const reachable = await probeMermaidInkConnectivity();
      engineReady.value = true;
      engineStatus.value = reachable
        ? t("app.renderModeOnlineReady")
        : resolveOnlineEngineNotReadyMessage();
      return;
    }

    engineReady.value = navigator.onLine;
    engineStatus.value = navigator.onLine
      ? t("app.renderModeOnlineReady")
      : resolveOnlineEngineNotReadyMessage();
  }

  function resolveEngineNotReadyMessage(): string {
    if (usesOnlineRender.value) {
      return resolveOnlineEngineNotReadyMessage();
    }

    const definition = formatDefinition.value;
    if (definition.usesPlantUmlEngine) {
      return t("app.engineNotReady");
    }

    if (diagramFormat.value === "mermaid") {
      return t("app.mermaidEngineNotReady");
    }

    return t("app.engineNotReady");
  }

  async function renderDiagramView(): Promise<void> {
    if (!engineReady.value) {
      error.value = resolveEngineNotReadyMessage();
      return;
    }

    isRendering.value = true;
    error.value = "";

    try {
      const result = await renderDiagram(
        diagramFormat.value,
        source.value,
        buildFormatContext(),
      );
      svg.value = result;
      setLastDiagramIr(
        buildDiagramIrForCache(source.value, diagramFormat.value, result),
      );
    } catch (renderError) {
      svg.value = "";
      setLastDiagramIr(null);
      error.value =
        renderError instanceof Error
          ? resolveLocalizedErrorMessage(
              renderError,
              t,
              "app.unknownRenderError",
            )
          : t("app.unknownRenderError");
    } finally {
      isRendering.value = false;
    }
  }

  function scheduleRender(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      void renderDiagramView();
    }, RENDER_DEBOUNCE_MS);
  }

  function updateEngineStatusLabel(): void {
    if (usesOnlineRender.value) {
      void updateOnlineEngineStatus();
      return;
    }

    engineStatus.value = engineReady.value
      ? t("app.engineReady")
      : t("app.engineLoading");
  }

  function isStaleBoot(expectedFormat: DiagramFormat): boolean {
    return diagramFormat.value !== expectedFormat;
  }

  async function bootOfflineEngine(expectedFormat: DiagramFormat): Promise<void> {
    const handler = getFormatHandler(expectedFormat);

    try {
      await bootFormatEngine(expectedFormat, buildFormatContext());
      if (isStaleBoot(expectedFormat)) {
        return;
      }

      engineReady.value = handler.isEngineReady(buildFormatContext());
      engineStatus.value = engineReady.value
        ? t("app.engineReady")
        : t("app.error");
      scheduleRender();
    } catch (bootError) {
      if (isStaleBoot(expectedFormat)) {
        return;
      }

      engineReady.value = false;
      engineStatus.value = resolveLocalizedErrorMessage(
        bootError,
        t,
        "app.engineLoadError",
      );
      error.value = engineStatus.value;
    }
  }

  async function bootEngine(): Promise<void> {
    const format = diagramFormat.value;
    const definition = getDiagramFormatDefinition(format);

    if (definition.supportsOnlineRender && isOnlineRenderMode(renderMode.value)) {
      await updateOnlineEngineStatus();
      scheduleRender();
      return;
    }

    if (definition.usesPlantUmlEngine || format === "mermaid") {
      await bootOfflineEngine(format);
      return;
    }

    engineReady.value = true;
    engineStatus.value = t("app.engineReady");
    scheduleRender();
  }

  async function onNetworkStatusChange(): Promise<void> {
    if (!usesOnlineRender.value) {
      return;
    }

    if (diagramFormat.value === "mermaid") {
      resetMermaidInkConnectivity();
    }

    await updateOnlineEngineStatus();
    if (engineReady.value) {
      scheduleRender();
    }
  }

  watch([source, layout, diagramDarkMode, renderMode, diagramFormat], () => {
    onPersist?.();
    scheduleRender();
  });

  watch(locale, () => {
    updateEngineStatusLabel();
  });

  watch(renderMode, () => {
    void bootEngine();
  });

  watch(diagramFormat, () => {
    engineReady.value = isFormatEngineReady(
      diagramFormat.value,
      buildFormatContext(),
    );
    updateEngineStatusLabel();
    void bootEngine();
  });

  if (typeof window !== "undefined") {
    window.addEventListener("online", onNetworkStatusChange);
    window.addEventListener("offline", onNetworkStatusChange);
  }

  onUnmounted(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onNetworkStatusChange);
      window.removeEventListener("offline", onNetworkStatusChange);
    }
  });

  return {
    svg,
    error,
    isRendering,
    engineReady,
    engineStatus,
    renderDiagram: renderDiagramView,
    scheduleRender,
    bootEngine,
  };
}
