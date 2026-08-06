import { computed, ref } from "vue";
import { LAYOUT_ENGINES } from "@/constants";
import {
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { readInitialLocale } from "@/composables/useLocale";
import {
  isEngineReady,
  renderPlantUmlToSvg,
  waitForEngineReady,
} from "@/composables/usePlantUml";
import { preparePlantUmlSource, splitSourceLines } from "@/utils/plantuml-source";
import { sanitizeSvgForPreview } from "@/utils/export";

export function useLibraryDiagramPreview() {
  const svg = ref("");
  const error = ref("");
  const isRendering = ref(false);
  const watermark = ref(true);

  const previewMarkup = computed(() =>
    svg.value ? sanitizeSvgForPreview(svg.value) : "",
  );

  async function renderPreview(
    source: string,
    options?: {
      watermarked?: boolean;
      renderMode?: RenderMode;
      dark?: boolean;
    },
  ): Promise<void> {
    isRendering.value = true;
    error.value = "";
    watermark.value = options?.watermarked ?? true;

    try {
      await waitForEngineReady();
      if (!isEngineReady()) {
        error.value = "Engine not ready";
        return;
      }

      const prepared = await preparePlantUmlSource(
        source,
        LAYOUT_ENGINES.elk,
      );
      const lines = splitSourceLines(prepared);
      const renderMode = options?.renderMode ?? "offline";
      if (isOnlineRenderMode(renderMode) && !navigator.onLine) {
        error.value = "Offline";
        return;
      }

      svg.value = await renderPlantUmlToSvg(
        lines,
        { dark: options?.dark ?? false },
        renderMode,
      );
    } catch (renderError) {
      svg.value = "";
      error.value =
        renderError instanceof Error ? renderError.message : "Render failed";
    } finally {
      isRendering.value = false;
    }
  }

  function resetPreview(): void {
    svg.value = "";
    error.value = "";
    watermark.value = true;
  }

  function watermarkLabel(): string {
    const locale = readInitialLocale();
    return locale === "ru" ? "vuePlantUML · превью" : "vuePlantUML · preview";
  }

  return {
    svg,
    error,
    isRendering,
    watermark,
    previewMarkup,
    renderPreview,
    resetPreview,
    watermarkLabel,
  };
}
