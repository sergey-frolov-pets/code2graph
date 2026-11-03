import { describe, expect, it } from "vitest";
import { DIAGRAM_FORMATS, type DiagramFormat } from "@/constants/diagram-format-ids";
import {
  d2FormatHandler,
  extractDiagramCompletionPrefix,
  getDiagramCompletions,
  getFormatHandler,
  structurizrFormatHandler,
  graphmlFormatHandler,
  mermaidFormatHandler,
  plantUmlFormatHandler,
  wiremarkFormatHandler,
} from "@/formats";
import { getLanguageModule } from "@/languages/registry";
import type { CompletionQuery } from "@/utils/completion-types";

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

  it("highlights WireMark components", () => {
    const html = wiremarkFormatHandler.highlightLine('Button "Sign in" contained');
    expect(html).toContain("tok-keyword");
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

  it("highlights D2 keywords", () => {
    const html = d2FormatHandler.highlightLine("direction: right");
    expect(html).toContain("tok-keyword");
  });

  it("highlights Structurizr keywords", () => {
    const html = structurizrFormatHandler.highlightLine("workspace {");
    expect(html).toContain("tok-keyword");
  });

  it("exposes render entry point on every handler", () => {
    for (const format of DIAGRAM_FORMATS) {
      expect(typeof getFormatHandler(format).render).toBe("function");
      expect(typeof getFormatHandler(format).bootEngine).toBe("function");
      expect(typeof getFormatHandler(format).isEngineReady).toBe("function");
    }
  });

  it("offers keyword hints for every language through one engine", () => {
    const samples: Record<
      DiagramFormat,
      { line: string; label: string; insertText?: string }
    > = {
      plantuml: { line: "spr", label: "sprite" },
      mermaid: { line: "cli", label: "click" },
      d2: { line: "dire", label: "direction", insertText: "direction: " },
      structurizr: { line: "soft", label: "softwareSystem", insertText: "softwareSystem " },
      graphml: { line: "<nod", label: "node" },
      wiremark: { line: "But", label: "Button", insertText: "Button " },
    };

    for (const format of DIAGRAM_FORMATS) {
      const language = getLanguageModule(format);
      const sample = samples[format];
      expect(language.keywords.length).toBeGreaterThan(0);
      expect(language.supportsAutocomplete).toBe(true);

      const prefix = extractDiagramCompletionPrefix(
        format,
        sample.line,
        sample.line.length,
      );
      const query: CompletionQuery = {
        lines: [sample.line],
        lineNumber: 1,
        column: sample.line.length,
        prefix: prefix.prefix,
        prefixInfo: prefix,
      };
      const items = getDiagramCompletions(format, query);
      const match = items.find((item) => item.label === sample.label);

      expect(prefix.prefix.toLowerCase()).toBe(
        sample.line.replace(/^</, "").toLowerCase(),
      );
      expect(match).toBeDefined();
      if (sample.insertText) {
        expect(match?.insertText).toBe(sample.insertText);
      }
    }
  });
});
