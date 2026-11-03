import { computed, type Ref } from "vue";
import { trackSave } from "@/analytics";
import { useAppDialog } from "@/composables/useAppDialog";
import { useDiagramIrCache } from "@/composables/useDiagramIrCache";
import { useLocale } from "@/composables/useLocale";
import { embedSvgMetadata } from "@/services/conversion/metadata/svg-metadata";
import {
  downloadBlob,
  downloadTextFile,
  isTransparentBackground,
  svgToPngBlob,
  withTransparentSvgBackground,
} from "@/utils/export";
import { resolveLocalizedErrorMessage } from "@/utils/localized-app-error";

export interface UseDiagramExportOptions {
  svg: Ref<string>;
  error: Ref<string>;
  isRendering: Ref<boolean>;
  previewBackground: Ref<string>;
  /** Размер готового PNG; null/undefined — натуральный размер SVG. */
  imageSize?: Ref<{ width: number; height: number } | null>;
}

export function useDiagramExport(options: UseDiagramExportOptions) {
  const { svg, error, isRendering, previewBackground, imageSize } = options;
  const { alert } = useAppDialog();
  const { t } = useLocale();
  const { getLastDiagramIr } = useDiagramIrCache();

  const canExport = computed(
    () => Boolean(svg.value) && !error.value && !isRendering.value,
  );

  async function exportSvg(): Promise<void> {
    if (!svg.value) {
      return;
    }

    const ir = getLastDiagramIr();
    // Прозрачный фон предпросмотра = прозрачный фон файла: снимаем плашку,
    // иначе в SVG остаётся непрозрачный прямоугольник на весь холст.
    const transparent = isTransparentBackground(previewBackground.value);
    const base = transparent ? withTransparentSvgBackground(svg.value) : svg.value;
    const payload = ir ? await embedSvgMetadata(base, ir) : base;
    downloadTextFile(payload, "diagram.svg", "image/svg+xml;charset=utf-8");
    trackSave("image-svg", "Save image: SVG");
  }

  async function exportPng(): Promise<void> {
    if (!svg.value) {
      return;
    }

    try {
      const pngBlob = await svgToPngBlob(
        svg.value,
        previewBackground.value,
        imageSize?.value ?? undefined,
      );
      downloadBlob(pngBlob, "diagram.png");
      trackSave("image-png", "Save image: PNG");
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

  return {
    canExport,
    exportSvg,
    exportPng,
  };
}
