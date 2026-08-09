import { describe, expect, it } from "vitest";
import {
  getFormatHandler,
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
});
