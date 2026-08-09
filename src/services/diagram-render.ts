import type { LayoutEngine } from "@/constants";
import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  DEFAULT_RENDER_MODE,
  type RenderMode,
} from "@/constants/render-settings";
import { renderDiagram } from "@/formats";

export interface DiagramRenderOptions {
  dark?: boolean;
  layout?: LayoutEngine;
  renderMode?: RenderMode;
}

export async function renderDiagramToSvg(
  source: string,
  format: DiagramFormat,
  options: DiagramRenderOptions = {},
): Promise<string> {
  const layout = options.layout;
  if (format === "plantuml" && !layout) {
    throw new Error("PlantUML layout is required");
  }

  return renderDiagram(format, source, {
    layout: layout ?? ("smetana" as LayoutEngine),
    diagramDarkMode: Boolean(options.dark),
    renderMode: options.renderMode ?? DEFAULT_RENDER_MODE,
  });
}
