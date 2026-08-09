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
import {
  isEngineReady,
  waitForEngineReady,
} from "@/composables/usePlantUml";
import { useDiagramIrCache } from "@/composables/useDiagramIrCache";
import { renderDiagramToSvg } from "@/services/diagram-render";
import { buildDiagramIrForCache } from "@/services/conversion/pipeline/convert-diagram";
import {
  isMermaidReady,
  waitForMermaidReady,
} from "@/services/mermaid/mermaid-engine";
import type { TranslateFn } from "@/locales/types";
import { resolveLocalizedErrorMessage } from "@/utils/localized-app-error";

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

  function updateOnlineEngineStatus(): void {
    if (!usesOnlineRender.value) {
      return;
    }

    engineReady.value = navigator.onLine;
    engineStatus.value = navigator.onLine
      ? t("app.renderModeOnlineReady")
      : t("app.renderModeOnlineOffline");
  }

  function isFormatEngineReady(format: DiagramFormat): boolean {
    const definition = getDiagramFormatDefinition(format);

    if (definition.supportsOnlineRender && isOnlineRenderMode(renderMode.value)) {
      return navigator.onLine;
    }

    if (definition.usesPlantUmlEngine) {
      return isEngineReady();
    }

    if (format === "mermaid") {
      return isMermaidReady();
    }

    return true;
  }

  function resolveEngineNotReadyMessage(): string {
    if (usesOnlineRender.value) {
      return t("app.renderModeOnlineOffline");
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

  async function renderDiagram(): Promise<void> {
    if (!engineReady.value) {
      error.value = resolveEngineNotReadyMessage();
      return;
    }

    isRendering.value = true;
    error.value = "";

    try {
      const result = await renderDiagramToSvg(
        source.value,
        diagramFormat.value,
        {
          dark: diagramDarkMode.value,
          layout: layout.value,
          renderMode: renderMode.value,
        },
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
      void renderDiagram();
    }, RENDER_DEBOUNCE_MS);
  }

  function updateEngineStatusLabel(): void {
    if (usesOnlineRender.value) {
      updateOnlineEngineStatus();
      return;
    }

    engineStatus.value = engineReady.value
      ? t("app.engineReady")
      : t("app.engineLoading");
  }

  function isStaleBoot(expectedFormat: DiagramFormat): boolean {
    return diagramFormat.value !== expectedFormat;
  }

  async function bootOfflinePlantUmlEngine(
    expectedFormat: DiagramFormat,
  ): Promise<void> {
    try {
      await waitForEngineReady();
      if (isStaleBoot(expectedFormat)) {
        return;
      }

      engineReady.value = isEngineReady();
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

  async function bootMermaidEngine(expectedFormat: DiagramFormat): Promise<void> {
    try {
      await waitForMermaidReady(diagramDarkMode.value);
      if (isStaleBoot(expectedFormat)) {
        return;
      }

      engineReady.value = isMermaidReady();
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
      updateOnlineEngineStatus();
      scheduleRender();
      return;
    }

    if (definition.usesPlantUmlEngine) {
      await bootOfflinePlantUmlEngine(format);
      return;
    }

    if (format === "mermaid") {
      await bootMermaidEngine(format);
      return;
    }

    engineReady.value = true;
    engineStatus.value = t("app.engineReady");
    scheduleRender();
  }

  function onNetworkStatusChange(): void {
    if (!usesOnlineRender.value) {
      return;
    }

    updateOnlineEngineStatus();
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
    engineReady.value = isFormatEngineReady(diagramFormat.value);
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
    renderDiagram,
    scheduleRender,
    bootEngine,
  };
}
