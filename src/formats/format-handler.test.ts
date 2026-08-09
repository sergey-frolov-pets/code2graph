import { describe, expect, it } from "vitest";
import {
  getFormatHandler,
  graphmlFormatHandler,
  mermaidFormatHandler,
  plantUmlFormatHandler,
} from "@/formats";

describe("FormatHandler", () => {
  it("highlights PlantUML directives", () => {
    const html = plantUmlFormatHandler.highlightLine("@startuml");
    expect(html).toContain("tok-directive");
  });

  it("highlights Mermaid diagram types", () => {
    const html = mermaidFormatHandler.highlightLine("flowchart TD");
    expect(html).toContain("tok-keyword");
  });

  it("validates empty PlantUML source", () => {
    const result = plantUmlFormatHandler.validate("");
    expect(result.valid).toBe(false);
  });

  it("validates empty GraphML source", () => {
    const result = graphmlFormatHandler.validate("");
    expect(result.valid).toBe(false);
  });

  it("reports graphml engine as always ready", () => {
    expect(
      graphmlFormatHandler.isEngineReady({
        layout: "smetana",
        diagramDarkMode: false,
        renderMode: "offline",
      }),
    ).toBe(true);
  });

  it("routes autocomplete through format handler", () => {
    const handler = getFormatHandler("plantuml");
    const prefix = handler.extractCompletionPrefix("part", 4);
    expect(prefix.prefix).toBe("part");
    expect(handler.getCompletions({
      lines: ["part"],
      lineNumber: 1,
      column: 4,
      prefix: prefix.prefix,
      prefixInfo: prefix,
    }).length).toBeGreaterThan(0);
  });

  it("exposes render entry point on every handler", () => {
    for (const format of ["plantuml", "mermaid", "graphml"] as const) {
      expect(typeof getFormatHandler(format).render).toBe("function");
      expect(typeof getFormatHandler(format).bootEngine).toBe("function");
      expect(typeof getFormatHandler(format).isEngineReady).toBe("function");
    }
  });
});
