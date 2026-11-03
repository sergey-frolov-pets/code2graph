import { render } from "@wiremark/core";
import { DiagramImageError } from "./diagram-image-error.js";

export function renderWiremarkSvg(source: string): string {
  try {
    const { svg } = render(source, { theme: "light", interactive: false });
    if (!svg.includes("<svg")) {
      throw new DiagramImageError("WireMark returned an empty image");
    }
    return svg;
  } catch (error) {
    if (error instanceof DiagramImageError) {
      throw error;
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new DiagramImageError(`WireMark render failed: ${detail}`);
  }
}
