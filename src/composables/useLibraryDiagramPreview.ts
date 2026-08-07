import { computed, ref } from "vue";
import { LAYOUT_ENGINES } from "@/constants";
import type { DiagramLanguage } from "@/constants/diagram-library";
import {
  DEFAULT_RENDER_MODE,
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { readInitialLocale } from "@/composables/useLocale";
import {
  isEngineReady,
  waitForEngineReady,
} from "@/composables/usePlantUml";
import { renderDiagramToSvg } from "@/services/diagram-render";
import {
  isMermaidReady,
  waitForMermaidReady,
} from "@/services/mermaid/mermaid-engine";
import { resolveLibraryDiagramFormat } from "@/utils/diagram-format";
import { sanitizeSvgForPreview } from "@/utils/export";

export function useLibraryDiagramPreview() {
  const svg = ref("");
  const error = ref("");
  const isRendering = ref(false);
  const watermark = ref(true);

  const previewMarkup = computed(() =>
    svg.value ? sanitizeSvgForPreview(svg.value) : "",
  );

  async function ensureEngineReady(
    format: ReturnType<typeof resolveLibraryDiagramFormat>,
    dark: boolean,
  ): Promise<boolean> {
    if (format === "mermaid") {
      await waitForMermaidReady(dark);
      if (!isMermaidReady()) {
        error.value = "Engine not ready";
        return false;
      }
      return true;
    }

    if (format === "plantuml") {
      await waitForEngineReady();
      if (!isEngineReady()) {
        error.value = "Engine not ready";
        return false;
      }
      return true;
    }

    return true;
  }

  async function renderPreview(
    source: string,
    options?: {
      watermarked?: boolean;
      renderMode?: RenderMode;
      dark?: boolean;
      fileName?: string;
      language?: DiagramLanguage;
    },
  ): Promise<void> {
    isRendering.value = true;
    error.value = "";
    watermark.value = options?.watermarked ?? true;

    const format = resolveLibraryDiagramFormat(
      source,
      options?.fileName,
      options?.language,
    );
    const renderMode = options?.renderMode ?? DEFAULT_RENDER_MODE;
    const dark = options?.dark ?? false;

    try {
      if (isOnlineRenderMode(renderMode) && !navigator.onLine) {
        error.value = "Offline";
        return;
      }

      const engineReady = await ensureEngineReady(format, dark);
      if (!engineReady) {
        return;
      }

      svg.value = await renderDiagramToSvg(source, format, {
        dark,
        layout: LAYOUT_ENGINES.elk,
        renderMode,
      });
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
