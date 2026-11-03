import { describe, expect, it } from "vitest";
import {
  generateDiagramScaffold,
  listDiagramFormats,
  planDiagram,
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
