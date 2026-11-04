import type { AppLocale } from "@/constants/i18n";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { wizardThumbnailFileName } from "@/constants/wizard-gallery";

const thumbnailUrls = import.meta.glob("../assets/wizard-thumbnails/*/*.svg", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

export function wizardThumbnailUrl(
  format: DiagramFormat,
  sampleId: string,
  locale: AppLocale,
): string | null {
  const suffix = `/${locale}/${wizardThumbnailFileName(format, sampleId)}`;
  const match = Object.entries(thumbnailUrls).find(([path]) => path.endsWith(suffix));
  return match?.[1] ?? null;
}
