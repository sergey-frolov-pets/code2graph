export { normalizeSvgPaintColors } from "@/services/export/svg-paint";

export {
  applySvgAccessibility,
  type SvgA11yOptions,
  type SvgA11yReport,
} from "@/services/export/svg-a11y";

export {
  applyPreviewBackground,
  isTransparentBackground,
  sanitizeSvgForPreview,
  toOpaqueColor,
  withTransparentSvgBackground,
} from "@/services/export/svg-background";

export {
  applySvgSize,
  MAX_IMAGE_SIDE,
  MIN_IMAGE_SIDE,
  normalizeSvgRootSize,
  parseSvgCssSize,
  parseSvgSize,
  wholeImagePixels,
  type ImageSize,
} from "@/services/export/svg-geometry";

export {
  copyPngBlobToClipboard,
  downloadBlob,
  downloadTextFile,
  svgToPngBlob,
} from "@/services/export/file-download";
