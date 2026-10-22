import { Resvg } from "@resvg/resvg-js";
import { DiagramImageError } from "./diagram-image-error.js";
import { PREVIEW_BACKGROUND, PREVIEW_WIDTH_PX } from "./render-limits.js";

export function rasterizeSvg(svg: string): Uint8Array {
  if (!svg.includes("<svg")) {
    throw new DiagramImageError("Renderer returned an empty SVG");
  }

  try {
    const image = new Resvg(svg, {
      fitTo: { mode: "width", value: PREVIEW_WIDTH_PX },
      background: PREVIEW_BACKGROUND,
      font: { loadSystemFonts: true },
    });
    return image.render().asPng();
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new DiagramImageError(`SVG rasterization failed: ${detail}`);
  }
}
