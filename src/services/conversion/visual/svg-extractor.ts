import type { VisualHints } from "@/services/conversion/visual/visual-hints";

function parseNumeric(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function readElementBBox(element: Element | null | undefined): DOMRect | null {
  if (!element || typeof (element as SVGGraphicsElement).getBBox !== "function") {
    return null;
  }

  try {
    return (element as SVGGraphicsElement).getBBox();
  } catch {
    return null;
  }
}

export function extractMermaidVisualHints(svg: string): VisualHints {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const nodes: VisualHints["nodes"] = [];

  for (const group of doc.querySelectorAll("g.node")) {
    const id = group.getAttribute("id") ?? undefined;
    const label =
      group.querySelector(".nodeLabel")?.textContent?.trim() ??
      group.querySelector("text")?.textContent?.trim() ??
      "";
    if (!label) {
      continue;
    }

    const rect = group.querySelector("rect, polygon, circle, ellipse");
    const bbox = readElementBBox(rect);
    const semanticId = id?.match(/flowchart-([^-]+)-/i)?.[1];

    nodes.push({
      domId: id,
      semanticId,
      label,
      bbox: bbox
        ? {
            x: bbox.x,
            y: bbox.y,
            width: bbox.width,
            height: bbox.height,
          }
        : { x: 0, y: 0, width: 0, height: 0 },
      fill: rect?.getAttribute("fill") ?? undefined,
      stroke: rect?.getAttribute("stroke") ?? undefined,
      shape: group.querySelector("polygon") ? "diamond" : "rect",
    });
  }

  const edges: VisualHints["edges"] = [];
  for (const labelGroup of doc.querySelectorAll("g.edgeLabel")) {
    const label = labelGroup.textContent?.trim();
    if (label) {
      edges.push({ label });
    }
  }

  return { nodes, edges, source: "mermaid-dom" };
}

export function extractPlantUmlVisualHints(svg: string): VisualHints {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, "image/svg+xml");
  const textElements = [...doc.querySelectorAll("text")].map((element) => ({
    label: element.textContent?.trim() ?? "",
    x: parseNumeric(element.getAttribute("x")) ?? 0,
    y: parseNumeric(element.getAttribute("y")) ?? 0,
  }));

  const rects = [...doc.querySelectorAll("rect")].map((element) => ({
    x: parseNumeric(element.getAttribute("x")) ?? 0,
    y: parseNumeric(element.getAttribute("y")) ?? 0,
    width: parseNumeric(element.getAttribute("width")) ?? 0,
    height: parseNumeric(element.getAttribute("height")) ?? 0,
    fill: element.getAttribute("fill") ?? undefined,
    stroke: element.getAttribute("stroke") ?? undefined,
  }));

  const nodes: VisualHints["nodes"] = [];

  for (const text of textElements) {
    if (!text.label || text.label.length > 80) {
      continue;
    }

    let nearest = rects[0];
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const rect of rects) {
      const centerX = rect.x + rect.width / 2;
      const centerY = rect.y + rect.height / 2;
      const distance = Math.hypot(centerX - text.x, centerY - text.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = rect;
      }
    }

    if (!nearest || nearestDistance > 120) {
      continue;
    }

    nodes.push({
      label: text.label,
      bbox: {
        x: nearest.x,
        y: nearest.y,
        width: nearest.width,
        height: nearest.height,
      },
      fill: nearest.fill ?? undefined,
      stroke: nearest.stroke ?? undefined,
      shape: "rect",
    });
  }

  return { nodes, edges: [], source: "plantuml-geometry" };
}

export function extractVisualHintsFromSvg(
  svg: string,
  sourceFormat?: "plantuml" | "mermaid" | "graphml",
): VisualHints {
  if (!svg.includes("<svg")) {
    return { nodes: [], edges: [], source: "plantuml-geometry" };
  }

  if (svg.includes('class="node"') || svg.includes("flowchart-")) {
    return extractMermaidVisualHints(svg);
  }

  if (sourceFormat === "mermaid") {
    return extractMermaidVisualHints(svg);
  }

  return extractPlantUmlVisualHints(svg);
}
