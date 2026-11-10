import { computed, type Ref } from "vue";
import { trackClipboardImageCopy, trackDiagramExport } from "@/analytics";
import { useAppDialog } from "@/composables/useAppDialog";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { useDiagramIrCache } from "@/composables/useDiagramIrCache";
import { useLocale } from "@/composables/useLocale";
import { isFeatureAllowed } from "@/composables/useFeatureGate";
import { embedSvgMetadata } from "@/services/conversion/metadata/svg-metadata";
import {
  applyPreviewBackground,
  copyPngBlobToClipboard,
  downloadBlob,
  downloadTextFile,
  isTransparentBackground,
  svgToPngBlob,
  withTransparentSvgBackground,
} from "@/utils/export";
import {
  LocalizedAppError,
  resolveLocalizedErrorMessage,
} from "@/utils/localized-app-error";

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

  function themedExportSvg(): string | null {
    if (!svg.value) {
      return null;
    }

    // Фон диаграммы применяется всегда: вырезы под подписи (разрыв, линия)
    // должны совпадать с выбранным фоном, а не с цветом темы.
    const themed = applyPreviewBackground(svg.value, previewBackground.value);
    // Прозрачный фон предпросмотра = прозрачный фон файла: снимаем плашку,
    // иначе в SVG и PNG остаётся непрозрачный прямоугольник на весь холст.
    return isTransparentBackground(previewBackground.value)
      ? withTransparentSvgBackground(themed)
      : themed;
  }

  function createPngBlob(): Promise<Blob> {
    const prepared = themedExportSvg();
    if (!prepared) {
      return Promise.reject(new LocalizedAppError("app.exportPngFailed"));
    }

    return svgToPngBlob(
      prepared,
      previewBackground.value,
      imageSize?.value ?? undefined,
    );
  }

  async function exportSvg(): Promise<void> {
    if (!isFeatureAllowed("editor.export")) {
      return;
    }

    const base = themedExportSvg();
    if (!base) {
      return;
    }

    const ir = getLastDiagramIr();
    const payload = ir ? await embedSvgMetadata(base, ir) : base;
    downloadTextFile(payload, "diagram.svg", "image/svg+xml;charset=utf-8");
    trackDiagramExport("svg", diagramFormat.value, source.value);
  }

  async function exportPng(): Promise<void> {
    if (!isFeatureAllowed("editor.export") || !svg.value) {
      return;
    }

    try {
      const pngBlob = await createPngBlob();
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

  async function copyPng(): Promise<boolean> {
    if (!isFeatureAllowed("editor.export") || !svg.value) {
      return false;
    }

    try {
      await copyPngBlobToClipboard(createPngBlob());
      trackClipboardImageCopy(diagramFormat.value, source.value);
      return true;
    } catch (copyError) {
      const message = resolveLocalizedErrorMessage(
        copyError,
        t,
        "app.copyPngFailed",
      );
      void alert({
        title: t("app.exportError"),
        message,
        variant: "error",
      });
      return false;
    }
  }

  return {
    canExport,
    exportSvg,
    exportPng,
    copyPng,
  };
}
