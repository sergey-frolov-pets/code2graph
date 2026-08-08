import { computed, type Ref } from "vue";
import { useAppDialog } from "@/composables/useAppDialog";
import { useDiagramIrCache } from "@/composables/useDiagramIrCache";
import { useLocale } from "@/composables/useLocale";
import { embedSvgMetadata } from "@/services/conversion/metadata/svg-metadata";
import {
  downloadBlob,
  downloadTextFile,
  svgToPngBlob,
} from "@/utils/export";
import { resolveLocalizedErrorMessage } from "@/utils/localized-app-error";

export interface UseDiagramExportOptions {
  svg: Ref<string>;
  error: Ref<string>;
  isRendering: Ref<boolean>;
  previewBackground: Ref<string>;
}

export function useDiagramExport(options: UseDiagramExportOptions) {
  const { svg, error, isRendering, previewBackground } = options;
  const { alert } = useAppDialog();
  const { t } = useLocale();
  const { getLastDiagramIr } = useDiagramIrCache();

  const canExport = computed(
    () => Boolean(svg.value) && !error.value && !isRendering.value,
  );

  function exportSvg(): void {
    if (!svg.value) {
      return;
    }

    const ir = getLastDiagramIr();
    const payload = ir ? embedSvgMetadata(svg.value, ir) : svg.value;
    downloadTextFile(payload, "diagram.svg", "image/svg+xml;charset=utf-8");
  }

  async function exportPng(): Promise<void> {
    if (!svg.value) {
      return;
    }

    try {
      const pngBlob = await svgToPngBlob(svg.value, previewBackground.value);
      downloadBlob(pngBlob, "diagram.png");
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
