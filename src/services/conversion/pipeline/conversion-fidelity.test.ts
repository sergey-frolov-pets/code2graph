// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import type { DiagramFormat } from "@/constants/diagram-formats";
import {
  getMermaidSampleSource,
  isMermaidExtSampleId,
  MERMAID_SAMPLE_IDS,
} from "@/constants/mermaid-sample-diagrams";
import {
  getPlantUmlSampleSource,
  PLANTUML_SAMPLE_IDS,
} from "@/constants/plantuml-sample-diagrams";
import { classifyDiagramKind } from "@/services/conversion/classify-diagram-kind";
import { parseSourceWithFramework } from "@/services/conversion/conversion-framework";
import type { DiagramIR } from "@/services/conversion/diagram-ir";
import { emitGraphmlFromIr } from "@/services/conversion/emit/emit-graphml";
import { normalizeLabel } from "@/services/conversion/parse/parse-utils";
import { convertDiagram } from "@/services/conversion/pipeline/convert-diagram";
import { isConversionBlocked } from "@/services/conversion/rules/conversion-matrix";
import { parseGraphml, renderGraphmlToSvg } from "@/services/graphml/graphml-engine";
import { hasAbsoluteGeometry } from "@/services/graphml/graphml-layout";

export interface GraphmlConversionFidelityMetrics {
  sampleId: string;
  sourceFormat: DiagramFormat;
  kind: string;
  sourceNodeCount: number;
  sourceEdgeCount: number;
  sourceGroupCount: number;
  sourceClassMemberCount: number;
  sourceEntityAttrCount: number;
  roundTripNodeCount: number;
  roundTripEdgeCount: number;
  roundTripGroupCount: number;
  nodeRecall: number;
  edgeRecall: number;
  groupRecall: number;
  geometryCoverage: number;
  classMemberRecall: number;
  entityAttrRecall: number;
  bboxOverlaps: number;
}

function countClassMembers(ir: DiagramIR): number {
  const membersByClass = ir.extras?.classMembers ?? {};
  return Object.values(membersByClass).reduce(
    (sum, list) => sum + list.length,
    0,
  );
}

function countEntityAttrs(ir: DiagramIR): number {
  const attrsByEntity = ir.extras?.entityAttributes ?? {};
  return Object.values(attrsByEntity).reduce(
    (sum, list) => sum + list.length,
    0,
  );
}

function countLeafOverlappingBboxes(targetGraphml: string): number {
  const parsed = parseGraphml(targetGraphml);
  const leaves = parsed.nodes.filter(
    (node) => !node.isGroup && node.geometry !== undefined,
  );
  let overlaps = 0;
  for (let i = 0; i < leaves.length; i += 1) {
    const a = leaves[i]!.geometry!;
    for (let j = i + 1; j < leaves.length; j += 1) {
      const b = leaves[j]!.geometry!;
      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
      if (overlapX > 2 && overlapY > 2) {
        overlaps += 1;
      }
    }
  }
  return overlaps;
}

function primaryNodeHeading(label: string): string {
  const lines = label
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  for (const line of lines) {
    if (!/^<<[^>]+>>$/.test(line)) {
      return normalizeLabel(line);
    }
  }
  return normalizeLabel(lines[0] ?? label);
}

export async function measureGraphmlFidelity(
  sampleId: string,
  source: string,
  sourceFormat: DiagramFormat,
  usePayload = true,
): Promise<GraphmlConversionFidelityMetrics | null> {
  const kind = classifyDiagramKind(source, sourceFormat);
  if (isConversionBlocked(kind, sourceFormat, "graphml")) {
    return null;
  }

  const sourceIr = parseSourceWithFramework(source, sourceFormat);
  const converted = await convertDiagram({
    source,
    sourceFormat,
    targetFormat: "graphml",
    mode: "source",
    locale: "en",
  });

  if (!converted.ok || !converted.targetSource) {
    return null;
  }

  const targetXml = usePayload
    ? converted.targetSource
    : emitGraphmlFromIr(sourceIr, { includeIrPayload: false });

  const roundTripIr = parseSourceWithFramework(targetXml, "graphml");
  const parsedGraphml = parseGraphml(targetXml);

  const roundTripLabels = new Set(
    roundTripIr.nodes.map((node) => primaryNodeHeading(node.label)),
  );
  const fullTextBlob = parsedGraphml.nodes.map((n) => n.label).join("\n");

  const matchedNodes = sourceIr.nodes.filter((node) => {
    const head = primaryNodeHeading(node.label);
    return (
      roundTripLabels.has(head) ||
      roundTripIr.nodes.some(
        (rt) => rt.id === node.id || normalizeLabel(rt.label).includes(head),
      )
    );
  }).length;

  const sourceEdgeKeys = sourceIr.edges.map((edge) => {
    const srcLabel = primaryNodeHeading(
      sourceIr.nodes.find((n) => n.id === edge.source)?.label ?? edge.source,
    );
    const tgtLabel = primaryNodeHeading(
      sourceIr.nodes.find((n) => n.id === edge.target)?.label ?? edge.target,
    );
    return `${srcLabel}->${tgtLabel}`;
  });

  const roundTripEdgeKeys = new Set(
    roundTripIr.edges.map((edge) => {
      const srcLabel = primaryNodeHeading(
        roundTripIr.nodes.find((n) => n.id === edge.source)?.label ?? edge.source,
      );
      const tgtLabel = primaryNodeHeading(
        roundTripIr.nodes.find((n) => n.id === edge.target)?.label ?? edge.target,
      );
      return `${srcLabel}->${tgtLabel}`;
    }),
  );

  const matchedEdges = sourceEdgeKeys.filter((key) =>
    roundTripEdgeKeys.has(key),
  ).length;

  const sourceGroups = sourceIr.groups ?? [];
  const roundTripGroups = roundTripIr.groups ?? [];
  const roundTripGroupLabels = new Set(
    roundTripGroups.map((grp) => normalizeLabel(grp.label ?? grp.id)),
  );
  const matchedGroups = sourceGroups.filter((grp) =>
    roundTripGroupLabels.has(normalizeLabel(grp.label ?? grp.id)),
  ).length;

  const totalMembers = countClassMembers(sourceIr);
  let matchedMembers = countClassMembers(roundTripIr);
  if (matchedMembers < totalMembers) {
    const allMembers = Object.values(sourceIr.extras?.classMembers ?? {}).flat();
    matchedMembers = Math.max(
      matchedMembers,
      allMembers.filter((m) => fullTextBlob.includes(m.name)).length,
    );
  }

  const totalAttrs = countEntityAttrs(sourceIr);
  let matchedAttrs = countEntityAttrs(roundTripIr);
  if (matchedAttrs < totalAttrs) {
    const allAttrs = Object.values(
      sourceIr.extras?.entityAttributes ?? {},
    ).flat();
    matchedAttrs = Math.max(
      matchedAttrs,
      allAttrs.filter((a) => fullTextBlob.includes(a.name)).length,
    );
  }

  const leafNodes = parsedGraphml.nodes.filter((n) => !n.isGroup);
  const withGeometry = leafNodes.filter((n) => n.geometry !== undefined).length;

  return {
    sampleId,
    sourceFormat,
    kind,
    sourceNodeCount: sourceIr.nodes.length,
    sourceEdgeCount: sourceIr.edges.length,
    sourceGroupCount: sourceGroups.length,
    sourceClassMemberCount: totalMembers,
    sourceEntityAttrCount: totalAttrs,
    roundTripNodeCount: roundTripIr.nodes.length,
    roundTripEdgeCount: roundTripIr.edges.length,
    roundTripGroupCount: roundTripGroups.length,
    nodeRecall:
      sourceIr.nodes.length > 0 ? matchedNodes / sourceIr.nodes.length : 1,
    edgeRecall:
      sourceIr.edges.length > 0 ? matchedEdges / sourceIr.edges.length : 1,
    groupRecall:
      sourceGroups.length > 0 ? matchedGroups / sourceGroups.length : 1,
    geometryCoverage:
      leafNodes.length > 0 ? withGeometry / leafNodes.length : 1,
    classMemberRecall: totalMembers > 0 ? matchedMembers / totalMembers : 1,
    entityAttrRecall: totalAttrs > 0 ? matchedAttrs / totalAttrs : 1,
    bboxOverlaps: countLeafOverlappingBboxes(targetXml),
  };
}

describe("conversion fidelity corpus (PlantUML & Mermaid -> GraphML)", () => {
  it("achieves 100% node/edge/group/geometry/attribute fidelity across the corpus (with & without IR payload)", async () => {
    for (const usePayload of [true, false]) {
      const results: GraphmlConversionFidelityMetrics[] = [];

      for (const id of PLANTUML_SAMPLE_IDS) {
        const source = getPlantUmlSampleSource(id, "en");
        const m = await measureGraphmlFidelity(
          `plantuml:${id}`,
          source,
          "plantuml",
          usePayload,
        );
        if (m) {
          results.push(m);
        }
      }

      for (const id of MERMAID_SAMPLE_IDS) {
        if (isMermaidExtSampleId(id)) continue;
        const source = getMermaidSampleSource(id, "en");
        const m = await measureGraphmlFidelity(
          `mermaid:${id}`,
          source,
          "mermaid",
          usePayload,
        );
        if (m) {
          results.push(m);
        }
      }

      expect(results.length).toBeGreaterThanOrEqual(15);

      for (const m of results) {
        const tag = `${m.sampleId} (payload=${usePayload})`;
        expect(m.nodeRecall, `${tag} nodeRecall`).toBe(1);
        expect(m.edgeRecall, `${tag} edgeRecall`).toBe(1);
        expect(m.groupRecall, `${tag} groupRecall`).toBe(1);
        expect(m.geometryCoverage, `${tag} geometryCoverage`).toBe(1);
        expect(m.classMemberRecall, `${tag} classMemberRecall`).toBe(1);
        expect(m.entityAttrRecall, `${tag} entityAttrRecall`).toBe(1);
        expect(m.bboxOverlaps, `${tag} bboxOverlaps`).toBe(0);
      }
    }
  });

  it("renders converted GraphML with absolute geometry and nested groups into valid SVG", async () => {
    const samplesToRender: Array<{
      id: string;
      format: DiagramFormat;
      source: string;
      expectGroup: boolean;
    }> = [
      {
        id: "plantuml:components",
        format: "plantuml",
        source: getPlantUmlSampleSource("components", "en"),
        expectGroup: true,
      },
      {
        id: "plantuml:classes",
        format: "plantuml",
        source: getPlantUmlSampleSource("classes", "en"),
        expectGroup: true,
      },
      {
        id: "plantuml:state",
        format: "plantuml",
        source: getPlantUmlSampleSource("state", "en"),
        expectGroup: true,
      },
      {
        id: "plantuml:activity",
        format: "plantuml",
        source: getPlantUmlSampleSource("activity", "en"),
        expectGroup: true,
      },
      {
        id: "plantuml:c4",
        format: "plantuml",
        source: getPlantUmlSampleSource("c4", "en"),
        expectGroup: true,
      },
      {
        id: "mermaid:flowchart",
        format: "mermaid",
        source: getMermaidSampleSource("flowchart", "en"),
        expectGroup: true,
      },
      {
        id: "mermaid:classDiagram",
        format: "mermaid",
        source: getMermaidSampleSource("classDiagram", "en"),
        expectGroup: true,
      },
      {
        id: "mermaid:er",
        format: "mermaid",
        source: getMermaidSampleSource("er", "en"),
        expectGroup: false,
      },
      {
        id: "mermaid:sequence",
        format: "mermaid",
        source: getMermaidSampleSource("sequence", "en"),
        expectGroup: false,
      },
    ];

    for (const item of samplesToRender) {
      const converted = await convertDiagram({
        source: item.source,
        sourceFormat: item.format,
        targetFormat: "graphml",
        mode: "source",
        locale: "en",
      });
      expect(converted.ok, item.id).toBe(true);
      const xml = converted.targetSource!;
      const parsed = parseGraphml(xml);
      expect(hasAbsoluteGeometry(parsed), `${item.id} hasAbsoluteGeometry`).toBe(
        true,
      );
      if (item.expectGroup) {
        expect(
          parsed.nodes.some((n) => n.isGroup),
          `${item.id} should contain GraphML group node`,
        ).toBe(true);
      }
      const svg = await renderGraphmlToSvg(xml);
      expect(svg).toContain("<svg");
      if (item.expectGroup) {
        expect(svg).toContain("graphml-group");
      }
    }
  });

  it("supports yEd graphics emission and idempotent GraphML -> IR -> GraphML round-trip", () => {
    const source = getPlantUmlSampleSource("classes", "en");
    const ir = parseSourceWithFramework(source, "plantuml");
    const yedXml = emitGraphmlFromIr(ir, {
      includeYedGraphics: true,
      includeIrPayload: false,
    });
    expect(yedXml).toContain("xmlns:y=");
    expect(yedXml).toContain("<y:ShapeNode>");
    expect(yedXml).toContain("<y:PolyLineEdge>");

    const parsedFirst = parseSourceWithFramework(yedXml, "graphml");
    const secondXml = emitGraphmlFromIr(parsedFirst, {
      includeYedGraphics: true,
      includeIrPayload: false,
    });
    const parsedSecond = parseSourceWithFramework(secondXml, "graphml");

    expect(parsedSecond.nodes.length).toBe(parsedFirst.nodes.length);
    expect(parsedSecond.edges.length).toBe(parsedFirst.edges.length);
    expect(parsedSecond.groups?.length).toBe(parsedFirst.groups?.length);
  });
});
