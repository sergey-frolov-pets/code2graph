import type { LayoutEngine } from "@/constants";
import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  DEFAULT_RENDER_MODE,
  type RenderMode,
} from "@/constants/render-settings";
import { renderPlantUmlToSvg } from "@/services/plantuml/plantuml-engine";
import { renderMermaidToSvg } from "@/services/mermaid/mermaid-engine";
import { renderGraphmlToSvg } from "@/services/graphml/graphml-engine";
import {
  preparePlantUmlSource,
  splitSourceLines,
} from "@/utils/plantuml-source";

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
  switch (format) {
    case "plantuml": {
      const layout = options.layout;
      if (!layout) {
        throw new Error("PlantUML layout is required");
      }

      const prepared = await preparePlantUmlSource(source, layout);
      const lines = splitSourceLines(prepared);
      return renderPlantUmlToSvg(
        lines,
        { dark: Boolean(options.dark) },
        options.renderMode ?? DEFAULT_RENDER_MODE,
      );
    }
    case "mermaid":
      return renderMermaidToSvg(source, { dark: Boolean(options.dark) }, options.renderMode ?? DEFAULT_RENDER_MODE);
    case "graphml":
      return renderGraphmlToSvg(source, { dark: Boolean(options.dark) });
    default:
      throw new Error(`Unsupported diagram format: ${format satisfies never}`);
  }
}
