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
});
