import { onUnmounted, ref, watch, type Ref } from "vue";
import { RENDER_DEBOUNCE_MS, type LayoutEngine } from "@/constants";
import {
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import type { AppLocale } from "@/constants/i18n";
import {
  isEngineReady,
  renderPlantUmlToSvg,
  waitForEngineReady,
} from "@/composables/usePlantUml";
import { resolveLocalizedErrorMessage } from "@/utils/localized-app-error";
import {
  preparePlantUmlSource,
  splitSourceLines,
} from "@/utils/plantuml-source";

type TranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export interface UseDiagramRenderOptions {
  source: Ref<string>;
  layout: Ref<LayoutEngine>;
  diagramDarkMode: Ref<boolean>;
  renderMode: Ref<RenderMode>;
  locale: Ref<AppLocale>;
  t: TranslateFn;
  onPersist?: () => void;
}

export function useDiagramRender(options: UseDiagramRenderOptions) {
  const { source, layout, diagramDarkMode, renderMode, locale, t, onPersist } =
    options;

  const svg = ref("");
  const error = ref("");
  const isRendering = ref(false);
  const engineReady = ref(false);
  const engineStatus = ref(t("app.engineLoading"));

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function updateOnlineEngineStatus(): void {
    if (!isOnlineRenderMode(renderMode.value)) {
      return;
    }

    engineReady.value = navigator.onLine;
    engineStatus.value = navigator.onLine
      ? t("app.renderModeOnlineReady")
      : t("app.renderModeOnlineOffline");
  }

  async function renderDiagram(): Promise<void> {
    if (!engineReady.value) {
      error.value = isOnlineRenderMode(renderMode.value)
        ? t("app.renderModeOnlineOffline")
        : t("app.engineNotReady");
      return;
    }

    isRendering.value = true;
    error.value = "";

    try {
      const prepared = await preparePlantUmlSource(source.value, layout.value);
      const lines = splitSourceLines(prepared);
      const result = await renderPlantUmlToSvg(
        lines,
        {
          dark: diagramDarkMode.value,
        },
        renderMode.value,
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
    if (isOnlineRenderMode(renderMode.value)) {
      updateOnlineEngineStatus();
      return;
    }

    engineStatus.value = engineReady.value
      ? t("app.engineReady")
      : t("app.engineLoading");
  }

  async function bootOfflineEngine(): Promise<void> {
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

  async function bootEngine(): Promise<void> {
    if (isOnlineRenderMode(renderMode.value)) {
      updateOnlineEngineStatus();
      scheduleRender();
      return;
    }

    await bootOfflineEngine();
  }

  function onNetworkStatusChange(): void {
    if (!isOnlineRenderMode(renderMode.value)) {
      return;
    }

    updateOnlineEngineStatus();
    if (engineReady.value) {
      scheduleRender();
    }
  }

  watch([source, layout, diagramDarkMode, renderMode], () => {
    onPersist?.();
    scheduleRender();
  });

  watch(locale, () => {
    updateEngineStatusLabel();
  });

  watch(renderMode, () => {
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
