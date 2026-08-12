import { computed, ref } from "vue";
import { LAYOUT_ENGINES, type LayoutEngine } from "@/constants";
import type { DiagramLanguage } from "@/constants/diagram-library";
import {
  DEFAULT_RENDER_MODE,
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { readInitialLocale, useLocale } from "@/composables/useLocale";
import {
  bootFormatEngine,
  getFormatHandler,
  renderDiagram,
} from "@/formats";
import { resolveLibraryDiagramFormat } from "@/utils/diagram-format";
import { sanitizeSvgForPreview } from "@/utils/export";
import { resolveLocalizedErrorMessage } from "@/utils/localized-app-error";

export function useLibraryDiagramPreview() {
  const { t } = useLocale();
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
    layout: LayoutEngine,
    renderMode: RenderMode,
  ): Promise<boolean> {
    const context = {
      layout,
      diagramDarkMode: dark,
      renderMode,
    };

    if (isOnlineRenderMode(renderMode)) {
      return true;
    }

    const handler = getFormatHandler(format);
    await bootFormatEngine(format, context);

    if (!handler.isEngineReady(context)) {
      error.value = t("app.engineNotReady");
      return false;
    }

    return true;
  }

  async function renderWithMode(
    source: string,
    format: ReturnType<typeof resolveLibraryDiagramFormat>,
    options: {
      dark: boolean;
      layout: LayoutEngine;
      renderMode: RenderMode;
    },
  ): Promise<string> {
    const engineReady = await ensureEngineReady(
      format,
      options.dark,
      options.layout,
      options.renderMode,
    );
    if (!engineReady) {
      return "";
    }

    return renderDiagram(format, source, {
      layout: options.layout,
      diagramDarkMode: options.dark,
      renderMode: options.renderMode,
    });
  }

  async function renderPreview(
    source: string,
    options?: {
      watermarked?: boolean;
      renderMode?: RenderMode;
      dark?: boolean;
      layout?: LayoutEngine;
      fileName?: string;
      language?: DiagramLanguage;
    },
  ): Promise<void> {
    isRendering.value = true;
    error.value = "";
    watermark.value = options?.watermarked ?? true;

    const trimmedSource = source.trim();
    if (!trimmedSource) {
      error.value = t("library.previewSourceMissing");
      isRendering.value = false;
      return;
    }

    const format = resolveLibraryDiagramFormat(
      trimmedSource,
      options?.fileName,
      options?.language,
    );
    const renderMode = options?.renderMode ?? DEFAULT_RENDER_MODE;
    const dark = options?.dark ?? false;
    const layout = options?.layout ?? LAYOUT_ENGINES.smetana;

    try {
      if (isOnlineRenderMode(renderMode) && !navigator.onLine) {
        error.value = t("app.renderModeOnlineOffline");
        return;
      }

      let rendered = await renderWithMode(trimmedSource, format, {
        dark,
        layout,
        renderMode,
      });

      if (
        !rendered.trim() &&
        isOnlineRenderMode(renderMode) &&
        format !== "graphml"
      ) {
        rendered = await renderWithMode(trimmedSource, format, {
          dark,
          layout,
          renderMode: "offline",
        });
      }

      if (!rendered.trim()) {
        svg.value = "";
        error.value = t("library.previewEmpty");
        return;
      }

      svg.value = rendered;
    } catch (renderError) {
      if (isOnlineRenderMode(renderMode) && format !== "graphml") {
        try {
          const offlineRendered = await renderWithMode(trimmedSource, format, {
            dark,
            layout,
            renderMode: "offline",
          });
          if (offlineRendered.trim()) {
            svg.value = offlineRendered;
            return;
          }
        } catch {
          // fall through to the original error below
        }
      }

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

  function resetPreview(): void {
    svg.value = "";
    error.value = "";
    watermark.value = true;
  }

  function watermarkLabel(): string {
    const locale = readInitialLocale();
    return locale === "ru" ? "Code2Graph · превью" : "Code2Graph · preview";
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
