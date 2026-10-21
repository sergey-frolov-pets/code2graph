import type { LayoutEngine } from "@/constants";
import { unwrapStructurizrSource } from "@shared/structurizr-source";
import { parseStructurizr } from "@/services/structurizr/parse-dsl";
import { structurizrToPlantUml } from "@/services/structurizr/to-plantuml";
import {
  isEngineReady,
  renderPlantUmlToSvg,
  waitForEngineReady,
} from "@/services/plantuml/plantuml-engine";
import { LocalizedAppError } from "@/utils/localized-app-error";
import {
  preparePlantUmlSource,
  splitSourceLines,
} from "@/utils/plantuml-source";

const DIAGRAM_STACK_GAP_PX = 32;
const DIAGRAM_FALLBACK_WIDTH_PX = 640;
const DIAGRAM_FALLBACK_HEIGHT_PX = 360;

const SVG_WIDTH_PATTERN = /\bwidth="([\d.]+)(?:px)?"/i;
const SVG_HEIGHT_PATTERN = /\bheight="([\d.]+)(?:px)?"/i;
const SVG_VIEW_BOX_PATTERN = /\bviewBox="([\d.\s-]+)"/i;
const XML_DECLARATION_PATTERN = /^\s*<\?xml[\s\S]*?\?>\s*/i;

export function isStructurizrReady(): boolean {
  return isEngineReady();
}

export async function bootStructurizr(): Promise<void> {
  await waitForEngineReady();
}

function svgSize(svg: string): { width: number; height: number } {
  const root = svg.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const width = Number(root.match(SVG_WIDTH_PATTERN)?.[1] ?? "");
  const height = Number(root.match(SVG_HEIGHT_PATTERN)?.[1] ?? "");
  if (width > 0 && height > 0) {
    return { width, height };
  }

  const viewBox = root.match(SVG_VIEW_BOX_PATTERN)?.[1]?.trim().split(/\s+/) ?? [];
  const boxWidth = Number(viewBox[2] ?? "");
  const boxHeight = Number(viewBox[3] ?? "");
  return {
    width: boxWidth > 0 ? boxWidth : DIAGRAM_FALLBACK_WIDTH_PX,
    height: boxHeight > 0 ? boxHeight : DIAGRAM_FALLBACK_HEIGHT_PX,
  };
}

export function stackDiagramSvgs(svgs: readonly string[]): string {
  if (svgs.length === 1) {
    return svgs[0];
  }

  const boxes = svgs.map((svg) => ({ svg: svg.replace(XML_DECLARATION_PATTERN, ""), ...svgSize(svg) }));
  const width = Math.max(...boxes.map((box) => box.width));
  const height =
    boxes.reduce((sum, box) => sum + box.height, 0) +
    DIAGRAM_STACK_GAP_PX * (boxes.length - 1);
  let offsetY = 0;
  const layers = boxes.map((box) => {
    const placed = box.svg.replace(
      /<svg\b/i,
      `<svg x="0" y="${offsetY}"`,
    );
    offsetY += box.height + DIAGRAM_STACK_GAP_PX;
    return placed;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}px" height="${height}px" viewBox="0 0 ${width} ${height}">${layers.join("")}</svg>`;
}

export interface StructurizrRenderOptions {
  dark?: boolean;
  layout: LayoutEngine;
}

export async function renderStructurizrToSvg(
  source: string,
  options: StructurizrRenderOptions,
): Promise<string> {
  const prepared = unwrapStructurizrSource(source);
  if (!prepared) {
    throw new LocalizedAppError("syntax.issue.empty");
  }

  const diagrams = structurizrToPlantUml(parseStructurizr(prepared));
  const svgs: string[] = [];
  for (const diagram of diagrams) {
    const plantUml = await preparePlantUmlSource(diagram, options.layout);
    svgs.push(
      await renderPlantUmlToSvg(
        splitSourceLines(plantUml),
        { dark: options.dark },
        "offline",
      ),
    );
  }

  return stackDiagramSvgs(svgs);
}
