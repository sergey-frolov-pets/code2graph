import type { AppLocale } from "@/constants/i18n";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { wizardThumbnailFileName } from "@/constants/wizard-gallery";

const thumbnailSources = import.meta.glob("../assets/wizard-thumbnails/*/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

/** PlantUML repeats xmlns, which makes the SVG invalid as an image. */
export function sanitizeThumbnailSvg(svg: string): string {
  return svg.replace(/<svg\b[^>]*>/gi, (tag) => {
    let seenXmlns = false;
    return tag.replace(/\sxmlns="[^"]*"/g, (attribute) => {
      if (seenXmlns) {
        return "";
      }
      seenXmlns = true;
      return attribute;
    });
  });
}

export function wizardThumbnailSvg(
  format: DiagramFormat,
  sampleId: string,
  locale: AppLocale,
): string | null {
  const suffix = `/${locale}/${wizardThumbnailFileName(format, sampleId)}`;
  const match = Object.entries(thumbnailSources).find(([sourcePath]) =>
    sourcePath.endsWith(suffix),
  );
  if (!match) {
    return null;
  }

  return sanitizeThumbnailSvg(match[1]);
}
