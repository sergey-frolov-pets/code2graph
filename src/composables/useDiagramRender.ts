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
import { renderDiagramToSvg } from "@/services/diagram-render";
import {
  isMermaidReady,
  waitForMermaidReady,
} from "@/services/mermaid/mermaid-engine";
import { resolveLocalizedErrorMessage } from "@/utils/localized-app-error";

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

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

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  const formatDefinition = computed(() =>
    getDiagramFormatDefinition(diagramFormat.value),
  );

  function updateOnlineEngineStatus(): void {
    if (!isOnlineRenderMode(renderMode.value)) {
      return;
    }

    engineReady.value = navigator.onLine;
    engineStatus.value = navigator.onLine
      ? t("app.renderModeOnlineReady")
      : t("app.renderModeOnlineOffline");
  }

  function isFormatEngineReady(format: DiagramFormat): boolean {
    const definition = getDiagramFormatDefinition(format);
    if (!definition.usesPlantUmlEngine) {
      return format === "mermaid" ? isMermaidReady() : true;
    }

    if (isOnlineRenderMode(renderMode.value)) {
      return navigator.onLine;
    }

    return isEngineReady();
  }

  async function renderDiagram(): Promise<void> {
    if (!engineReady.value) {
      error.value = formatDefinition.value.usesPlantUmlEngine
        ? isOnlineRenderMode(renderMode.value)
          ? t("app.renderModeOnlineOffline")
          : t("app.engineNotReady")
        : t("app.engineNotReady");
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
    } catch (renderError) {
      svg.value = "";
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
    if (formatDefinition.value.usesPlantUmlEngine && isOnlineRenderMode(renderMode.value)) {
      updateOnlineEngineStatus();
      return;
    }

    engineStatus.value = engineReady.value
      ? t("app.engineReady")
      : t("app.engineLoading");
  }

  async function bootOfflinePlantUmlEngine(): Promise<void> {
    try {
      await waitForEngineReady();
      engineReady.value = isEngineReady();
      engineStatus.value = engineReady.value
        ? t("app.engineReady")
        : t("app.error");
      scheduleRender();
    } catch (bootError) {
      engineReady.value = false;
      engineStatus.value = resolveLocalizedErrorMessage(
        bootError,
        t,
        "app.engineLoadError",
      );
      error.value = engineStatus.value;
    }
  }

  async function bootMermaidEngine(): Promise<void> {
    try {
      await waitForMermaidReady(diagramDarkMode.value);
      engineReady.value = isMermaidReady();
      engineStatus.value = engineReady.value
        ? t("app.engineReady")
        : t("app.error");
      scheduleRender();
    } catch (bootError) {
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

    if (!definition.usesPlantUmlEngine) {
      if (format === "mermaid") {
        await bootMermaidEngine();
        return;
      }

      engineReady.value = true;
      engineStatus.value = t("app.engineReady");
      scheduleRender();
      return;
    }

    if (isOnlineRenderMode(renderMode.value)) {
      updateOnlineEngineStatus();
      scheduleRender();
      return;
    }

    await bootOfflinePlantUmlEngine();
  }

  function onNetworkStatusChange(): void {
    if (!formatDefinition.value.usesPlantUmlEngine) {
      return;
    }

    if (!isOnlineRenderMode(renderMode.value)) {
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
