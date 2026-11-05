import { computed, type Ref } from "vue";
import { trackDiagramExport } from "@/analytics";
import { useAppDialog } from "@/composables/useAppDialog";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { useDiagramIrCache } from "@/composables/useDiagramIrCache";
import { useLocale } from "@/composables/useLocale";
import { embedSvgMetadata } from "@/services/conversion/metadata/svg-metadata";
import {
  applyPreviewBackground,
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
  source: Ref<string>;
  diagramFormat: Ref<DiagramFormat>;
  /** Размер готового PNG; null/undefined — натуральный размер SVG. */
  imageSize?: Ref<{ width: number; height: number } | null>;
}

export function useDiagramExport(options: UseDiagramExportOptions) {
  const { svg, error, isRendering, previewBackground, imageSize, source, diagramFormat } =
    options;
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
    // Фон диаграммы применяется всегда: вырезы под подписи (разрыв, линия)
    // должны совпадать с выбранным фоном, а не с цветом темы.
    const themed = applyPreviewBackground(svg.value, previewBackground.value);
    // Прозрачный фон предпросмотра = прозрачный фон файла: снимаем плашку,
    // иначе в SVG остаётся непрозрачный прямоугольник на весь холст.
    const transparent = isTransparentBackground(previewBackground.value);
    const base = transparent ? withTransparentSvgBackground(themed) : themed;
    const payload = ir ? await embedSvgMetadata(base, ir) : base;
    downloadTextFile(payload, "diagram.svg", "image/svg+xml;charset=utf-8");
    trackDiagramExport("svg", diagramFormat.value, source.value);
  }

  async function exportPng(): Promise<void> {
    if (!svg.value) {
      return;
    }

    try {
      const transparent = isTransparentBackground(previewBackground.value);
      // Фон диаграммы применяется и к растре: вырезы под подписи должны
      // совпадать с выбранным фоном. Прозрачный фон = без плашки холста,
      // иначе PNG приходит с белым (или тёмным) прямоугольником.
      const themed = applyPreviewBackground(svg.value, previewBackground.value);
      const pngBlob = await svgToPngBlob(
        transparent ? withTransparentSvgBackground(themed) : themed,
        previewBackground.value,
        imageSize?.value ?? undefined,
      );
      downloadBlob(pngBlob, "diagram.png");
      trackDiagramExport("png", diagramFormat.value, source.value);
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
