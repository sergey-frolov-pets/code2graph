import type { AppLocale } from "@/constants/i18n";
import { normalizeSvgPaintColors } from "@/services/export/svg-paint";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { wizardThumbnailFileName } from "@/constants/wizard-gallery";

const thumbnailSources = import.meta.glob("../assets/wizard-thumbnails/*/*.svg", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

const SVG_ID_PATTERN = /\bid="([^"]+)"/g;
const SVG_VIEW_BOX_PATTERN = /viewBox="([^"]+)"/i;
const SVG_OPEN_TAG_PATTERN = /<svg\b([^>]*)>/i;

export interface SvgNaturalSize {
  width: number;
  height: number;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function svgIdPrefix(prefix: string): string {
  const cleaned = prefix.replace(/[^A-Za-z0-9_-]/g, "");
  const safe = cleaned || "svg";
  return /^[A-Za-z_]/.test(safe) ? safe : `svg${safe}`;
}

/** Give each painted copy its own ids so clip paths and style selectors do not collide. */
export function namespaceSvgIds(svg: string, prefix: string): string {
  const safePrefix = svgIdPrefix(prefix);
  const ids = [...svg.matchAll(SVG_ID_PATTERN)].map((match) => match[1] ?? "");
  const uniqueIds = [...new Set(ids)].filter(Boolean).sort((left, right) => right.length - left.length);
  let result = svg;

  for (const id of uniqueIds) {
    const escaped = escapeRegExp(id);
    const nextId = `${safePrefix}-${id}`;
    result = result
      .replace(new RegExp(`\\bid="${escaped}"`, "g"), `id="${nextId}"`)
      .replace(new RegExp(`#${escaped}\\b`, "g"), `#${nextId}`);
  }

  return result;
}

export function svgNaturalSize(svg: string): SvgNaturalSize | null {
  const viewBox = svg.match(SVG_VIEW_BOX_PATTERN);
  if (!viewBox?.[1]) {
    return null;
  }

  const parts = viewBox[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }

  const width = parts[2] ?? 0;
  const height = parts[3] ?? 0;
  if (width <= 0 || height <= 0) {
    return null;
  }

  return { width, height };
}

/** Scale that fits a diagram into a frame without cropping. */
export function svgFitScale(
  natural: SvgNaturalSize,
  frameWidth: number,
  frameHeight: number,
): number {
  if (
    frameWidth <= 0 ||
    frameHeight <= 0 ||
    natural.width <= 0 ||
    natural.height <= 0
  ) {
    return 1;
  }

  return Math.min(frameWidth / natural.width, frameHeight / natural.height);
}

/** Set the root size from the viewBox so a zoomed copy is not scaled to its container. */
export function svgAtNaturalSize(svg: string): string {
  const size = svgNaturalSize(svg);
  if (!size) {
    return svg;
  }

  return svg.replace(SVG_OPEN_TAG_PATTERN, (_tag, attrs: string) => {
    const withoutSize = attrs
      .replace(/\swidth="[^"]*"/i, "")
      .replace(/\sheight="[^"]*"/i, "")
      .replace(/\sstyle="([^"]*)"/i, (_style, style: string) => {
        const cleaned = style
          .replace(/(?:^|;)\s*max-width\s*:[^;]*/gi, "")
          .replace(/(?:^|;)\s*max-height\s*:[^;]*/gi, "")
          .replace(/(?:^|;)\s*width\s*:[^;]*/gi, "")
          .replace(/(?:^|;)\s*height\s*:[^;]*/gi, "")
          .replace(/^;+|;+$/g, "")
          .trim();
        return cleaned ? ` style="${cleaned}"` : "";
      });

    return `<svg${withoutSize} width="${size.width}" height="${size.height}">`;
  });
}

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

  return normalizeSvgPaintColors(sanitizeThumbnailSvg(match[1]));
}
