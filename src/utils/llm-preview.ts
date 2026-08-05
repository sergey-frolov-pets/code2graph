import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import { renderPlantUmlToSvg } from "@/composables/usePlantUml";
import {
  preparePlantUmlSource,
  splitSourceLines,
} from "@/utils/plantuml-source";

export async function renderPlantUmlPreviewSvg(
  plantuml: string,
  layout: LayoutEngine,
  darkMode: boolean,
  renderMode: RenderMode,
): Promise<string> {
  const prepared = await preparePlantUmlSource(plantuml, layout);
  const lines = splitSourceLines(prepared);
  return renderPlantUmlToSvg(lines, { dark: darkMode }, renderMode);
}

export function extractSelectionFragment(
  source: string,
  start: number,
  end: number,
): string {
  if (end <= start) {
    return "";
  }

  return source.slice(start, end);
}

export function buildSimpleDiffPreview(before: string, after: string): string {
  if (before === after) {
    return "No changes";
  }

  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  const chunks: string[] = [];

  for (let index = 0; index < maxLines; index += 1) {
    const left = beforeLines[index] ?? "";
    const right = afterLines[index] ?? "";
    if (left !== right) {
      chunks.push(`- ${left}`);
      chunks.push(`+ ${right}`);
    }
  }

  return chunks.length > 0 ? chunks.join("\n") : "Content changed";
}
