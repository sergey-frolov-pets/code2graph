import { describe, expect, it } from "vitest";
import {
  generateDiagramScaffold,
  listDiagramFormats,
  planDiagram,
  resolveRequestedDiagramChange,
} from "./agent-diagram.js";

describe("agent diagram planner", () => {
  it("lists every language connected to the site", () => {
    expect(listDiagramFormats().map((item) => item.format)).toEqual([
      "plantuml",
      "mermaid",
      "graphml",
      "wiremark",
      "d2",
      "structurizr",
    ]);
  });

  it("routes a wireframe request to WireMark", () => {
    const plan = planDiagram({ request: "макет экрана входа" });
    expect(plan.format).toBe("wiremark");
    expect(plan.diagramType).toBe("wireframe");
  });

  it("routes an explicit D2 sequence to D2", () => {
    const plan = planDiagram({ request: "D2 sequence diagram for checkout" });
    expect(plan.format).toBe("d2");
    expect(plan.diagramType).toBe("sequence");
  });

  it("routes a Structurizr container model to Structurizr", () => {
    const plan = planDiagram({
      request: "Structurizr C4 container diagram of the shop",
    });
    expect(plan.format).toBe("structurizr");
    expect(plan.diagramType).toBe("c4_container");
  });

  it("keeps a shared sequence on PlantUML unless a language is named", () => {
    expect(planDiagram({ request: "sequence of login" }).format).toBe("plantuml");
    expect(
      planDiagram({ request: "mermaid sequence of login" }).format,
    ).toBe("mermaid");
  });

  it("keeps an edit in the current language when the user did not ask to switch", () => {
    const change = resolveRequestedDiagramChange({
      request: "добавь участника",
      currentFormat: "mermaid",
    });
    expect(change.active).toBe(false);
    expect(change.format).toBe("mermaid");
    expect(change.diagramType).toBeNull();
  });

  it("switches type inside the current language when that language can express it", () => {
    const change = resolveRequestedDiagramChange({
      request: "переведи в диаграмму последовательности",
      currentFormat: "mermaid",
    });
    expect(change.active).toBe(true);
    expect(change.format).toBe("mermaid");
    expect(change.diagramType).toBe("sequence");
  });

  it("switches language when the user names one", () => {
    const change = resolveRequestedDiagramChange({
      request: "convert this to d2",
      currentFormat: "plantuml",
    });
    expect(change.active).toBe(true);
    expect(change.format).toBe("d2");
    expect(change.diagramType).toBeNull();
  });

  it("treats a named language and type as a switch even without a verb", () => {
    const change = resolveRequestedDiagramChange({
      request: "mermaid sequence of checkout",
      currentFormat: "plantuml",
    });
    expect(change.format).toBe("mermaid");
    expect(change.diagramType).toBe("sequence");
  });

  it("does not switch when the user only asks about a language", () => {
    const change = resolveRequestedDiagramChange({
      request: "explain mermaid syntax",
      currentFormat: "plantuml",
    });
    expect(change.active).toBe(false);
    expect(change.format).toBe("plantuml");
  });

  it("falls back when the named language cannot express the requested type", () => {
    const change = resolveRequestedDiagramChange({
      request: "переведи в graphml sequence",
      currentFormat: "plantuml",
    });
    expect(change.format).toBe("graphml");
    expect(change.diagramType).toBe("graph");
    expect(change.droppedType).toBe("sequence");
  });

  it("moves to a language that can express the requested type", () => {
    const change = resolveRequestedDiagramChange({
      request: "хочу блок-схему",
      currentFormat: "plantuml",
    });
    expect(change.format).toBe("mermaid");
    expect(change.diagramType).toBe("flowchart");
  });

  it("builds a scaffold for the planned language", () => {
    const { scaffold } = generateDiagramScaffold({
      request: "d2 architecture of the api",
      locale: "en",
    });
    expect(scaffold.format).toBe("d2");
    expect(scaffold.diagramType).toBe("architecture");
    expect(scaffold.source).toContain("shape: hexagon");
    expect(scaffold.fileName).toBe("diagram.d2");
  });

  it("lets a recognised pattern pick the diagram type", () => {
    const plan = planDiagram({ request: "статусы заявки и переходы между ними" });
    expect(plan.diagramType).toBe("state");
    expect(plan.format).toBe("plantuml");
    expect(plan.pattern).toBe("lifecycle-phase");
    expect(plan.patternLabel).toBe("Lifecycle / phase map");
    expect(plan.reason).toContain("state machine");
  });

  it("honours an explicit type over the pattern and says so", () => {
    const plan = planDiagram({
      request: "статусы заявки и переходы",
      diagramType: "activity",
    });
    expect(plan.diagramType).toBe("activity");
    expect(plan.pattern).toBe("lifecycle-phase");
    expect(plan.warnings.join(" ")).toContain("usually reads as state");
  });

  it("accepts a pattern by id and warns about an unknown one", () => {
    expect(planDiagram({ request: "схема оплаты", pattern: "governance-catalog" }).diagramType).toBe("er");

    const plan = planDiagram({ request: "схема оплаты", pattern: "nope" });
    expect(plan.pattern).toBeUndefined();
    expect(plan.warnings.join(" ")).toContain("Unknown pattern");
  });

  it("returns budget warnings for an oversized diagram", () => {
    const plan = planDiagram({
      request: "структура сервисов",
      diagramType: "component",
      complexity: { nodes: 12, edges: 20 },
    });
    expect(plan.budget?.violations.map((item) => item.metric)).toEqual([
      "nodes",
      "edges",
    ]);
    expect(plan.warnings.join(" ")).toContain("12 nodes with a budget of 9");
  });

  it("defaults the output handles and writes a fidelity receipt", () => {
    const plan = planDiagram({ request: "схема заказа" });

    expect(plan.size).toBe("doc-inline");
    expect(plan.sizePreset.fontPx).toBe(12);
    expect(plan.detail).toBe("balanced");
    expect(plan.detailLimits.nodes).toBe(12);
    expect(plan.audience).toBe("mixed");
    expect(plan.audienceRule).toContain("Plain nouns");
    expect(plan.fidelity).toContain("fidelity: plantuml");
    expect(plan.fidelity).toContain("counts not supplied");
    expect(plan.fidelity).toContain("audience mixed");
  });

  it("warns about unknown handles instead of failing", () => {
    const plan = planDiagram({
      request: "схема заказа",
      size: "billboard",
      detail: "full",
      audience: "boss",
    });

    const text = plan.warnings.join(" ");
    expect(text).toContain("Unknown size");
    expect(text).toContain("Unknown detail");
    expect(text).toContain("Unknown audience");
    expect(plan.size).toBe("doc-inline");
    expect(plan.detail).toBe("balanced");
    expect(plan.audience).toBe("mixed");
  });

  it("turns detail over the ceiling into a warning, not a cut", () => {
    const plan = planDiagram({
      request: "структура сервисов",
      diagramType: "component",
      detail: "simplified",
      complexity: { nodes: 12, edges: 20 },
    });

    expect(plan.warnings.join(" ")).toContain(
      "drop in order: decor → duplicates → leaf clusters → infrastructure",
    );
    expect(plan.fidelity).toContain("detail simplified (≤7 nodes): over");
    expect(plan.diagramType).toBe("component");
  });

  it("carries the slide size into PlantUML as skinparams", () => {
    const { plan, scaffold } = generateDiagramScaffold({
      request: "блок-схема заказа",
      format: "plantuml",
      size: "slide-16x9",
    });

    expect(plan.size).toBe("slide-16x9");
    expect(scaffold.sizeApplied).toBe(true);
    expect(scaffold.source).toContain("skinparam defaultFontSize 16");
    expect(scaffold.source).toContain("skinparam nodesep 48");
    expect(scaffold.source).toContain("skinparam ranksep 72");
    expect(scaffold.fidelity).toBe(plan.fidelity);
  });

  it("carries the size and audience into Mermaid", () => {
    const { scaffold } = generateDiagramScaffold({
      request: "блок-схема оплаты",
      format: "mermaid",
      size: "social-og",
      audience: "executive",
    });

    expect(scaffold.source).toContain(
      '%%{init: {"themeVariables":{"fontSize":"14px"}',
    );
    expect(scaffold.source).toContain('"nodeSpacing":36');
    expect(scaffold.source).toContain("audience executive: Name the outcome");
    expect(scaffold.audience).toBe("executive");
  });

  it("says when a format cannot take size hints", () => {
    const { scaffold } = generateDiagramScaffold({
      request: "контекст системы",
      format: "structurizr",
      size: "print-a4",
    });

    expect(scaffold.sizeApplied).toBe(false);
    expect(scaffold.warnings.join(" ")).toContain(
      "Size hints (print-a4) are not wired for Structurizr",
    );
  });

  it("rewrites scaffold labels for the executive audience", () => {
    const engineer = generateDiagramScaffold({
      request: "схема магазина",
      format: "d2",
      diagramType: "sequence",
      locale: "ru",
      audience: "engineer",
    });
    const executive = generateDiagramScaffold({
      request: "схема магазина",
      format: "d2",
      diagramType: "sequence",
      locale: "ru",
      audience: "executive",
    });

    expect(engineer.scaffold.source).toContain('"Заказ"');
    expect(executive.scaffold.source).toContain('"Оформление заказа"');
    expect(executive.scaffold.source).toContain("# audience executive");
  });
});
