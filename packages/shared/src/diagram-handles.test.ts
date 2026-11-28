import { describe, expect, it } from "vitest";
import {
  AUDIENCE_LABEL_RULES,
  DEFAULT_DIAGRAM_AUDIENCE,
  DEFAULT_DIAGRAM_DETAIL,
  DEFAULT_DIAGRAM_SIZE,
  DETAIL_DEGRADATION_LADDER,
  DIAGRAM_SIZE_PRESETS,
  audienceRule,
  checkDiagramDetail,
  diagramDetailBudget,
  diagramFidelity,
  diagramSizePreset,
  isDiagramAudience,
  isDiagramDetail,
  isDiagramSize,
} from "./diagram-handles.js";

describe("diagram output handles", () => {
  it("keeps a preset for every size with larger labels on a slide", () => {
    const doc = DIAGRAM_SIZE_PRESETS["doc-inline"];
    const slide = DIAGRAM_SIZE_PRESETS["slide-16x9"];

    expect(slide.fontPx).toBeGreaterThan(doc.fontPx);
    expect(slide.nodeSpacing).toBeGreaterThan(doc.nodeSpacing);
    expect(slide.rankSpacing).toBeGreaterThan(doc.rankSpacing);
    expect(slide.height).toBe(900);
    expect(DIAGRAM_SIZE_PRESETS["social-og"].height).toBe(630);
    expect(DIAGRAM_SIZE_PRESETS["print-a4"].width).toBe(1240);
  });

  it("guards the handle values", () => {
    expect(isDiagramSize("slide-16x9")).toBe(true);
    expect(isDiagramSize("slide-4x3")).toBe(false);
    expect(isDiagramDetail("faithful")).toBe(true);
    expect(isDiagramDetail("full")).toBe(false);
    expect(isDiagramAudience("executive")).toBe(true);
    expect(isDiagramAudience("boss")).toBe(false);
    expect(diagramSizePreset(DEFAULT_DIAGRAM_SIZE).width).toBe(960);
    expect(DEFAULT_DIAGRAM_DETAIL).toBe("balanced");
    expect(DEFAULT_DIAGRAM_AUDIENCE).toBe("mixed");
  });

  it("shrinks the node ceiling as detail drops", () => {
    expect(diagramDetailBudget("faithful").nodes).toBe(24);
    expect(diagramDetailBudget("balanced").nodes).toBe(12);
    expect(diagramDetailBudget("simplified").nodes).toBe(7);
  });

  it("reports an oversized plan without touching the diagram", () => {
    const report = checkDiagramDetail("balanced", { nodes: 20, edges: 30 });

    expect(report.over.map((item) => item.metric)).toEqual(["nodes", "edges"]);
    expect(report.ladder).toEqual([...DETAIL_DEGRADATION_LADDER]);
    expect(report.warnings[0]).toContain("drop in order: decor → duplicates → leaf clusters → infrastructure");
    expect(report.warnings[0]).toContain("Nothing was removed");
  });

  it("stays quiet inside the ceiling and without counts", () => {
    const fits = checkDiagramDetail("faithful", { nodes: 24, edges: 36 });
    expect(fits.over).toEqual([]);
    expect(fits.ladder).toEqual([]);
    expect(fits.warnings).toEqual([]);

    const unknown = checkDiagramDetail("simplified");
    expect(unknown.warnings).toEqual([]);
    expect(unknown.ladder).toEqual([]);
  });

  it("writes a receipt with counts, detail verdict, size and audience", () => {
    const line = diagramFidelity({
      format: "plantuml",
      diagramType: "flowchart",
      size: "slide-16x9",
      detail: "balanced",
      audience: "executive",
      counts: { nodes: 6, edges: 7 },
    });

    expect(line).toContain("fidelity: plantuml flowchart");
    expect(line).toContain("6 nodes, 7 connections");
    expect(line).toContain("detail balanced (≤12 nodes): within limits");
    expect(line).toContain("size slide-16x9 (1600px×900px, 16px labels)");
    expect(line).toContain("audience executive");
  });

  it("says plainly when a format cannot carry size hints", () => {
    const line = diagramFidelity({
      format: "structurizr",
      size: "print-a4",
      detail: "simplified",
      audience: "engineer",
      sizeApplied: false,
    });

    expect(line).toContain("counts not supplied");
    expect(line).toContain("size hints not wired for this format");
  });

  it("spells the over-limit verdict in the receipt", () => {
    const line = diagramFidelity({
      format: "mermaid",
      size: "doc-inline",
      detail: "simplified",
      audience: "mixed",
      counts: { nodes: 20 },
    });

    expect(line).toContain("detail simplified (≤7 nodes): over — 20 nodes (≤7)");
    expect(line).toContain("next to drop:");
  });

  it("keeps one wording rule per audience", () => {
    expect(audienceRule("engineer")).toContain("Technical names");
    expect(audienceRule("executive")).toContain("Name the outcome");
    expect(Object.keys(AUDIENCE_LABEL_RULES)).toEqual(["engineer", "mixed", "executive"]);
  });
});
