import { describe, expect, it } from "vitest";
import {
  checkMermaidSyntax,
  isMermaidExtDeclaration,
  parseMermaidErrorLine,
  parseMermaidErrorMessage,
} from "@/utils/mermaid-syntax";

describe("checkMermaidSyntax", () => {
  it("reports empty source", () => {
    const result = checkMermaidSyntax("   ");
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.messageKey).toBe("syntax.issue.empty");
  });

  it("reports missing diagram declaration", () => {
    const result = checkMermaidSyntax("A --> B");
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.messageKey === "syntax.issue.mermaid.missingDeclaration")).toBe(true);
  });

  it("accepts valid flowchart source", () => {
    const result = checkMermaidSyntax("flowchart TD\n  A --> B");
    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("accepts new diagram declaration types", () => {
    const types = [
      "C4Context\n    title Test",
      "requirementDiagram\n    requirement req1 { id: 1 text: test }",
      "quadrantChart\n    title Test",
      "architecture-beta\n    service svc(server)[Svc]",
      "packet-beta\n    title Test\n    0-7: field",
    ];

    for (const source of types) {
      const result = checkMermaidSyntax(source);
      expect(result.valid).toBe(true);
    }
  });

  it("accepts Mermaid Ext declarations without a false missingDeclaration", () => {
    const types = [
      "waterfall\n=10 : A\n+5 : B",
      "bubble\nx \"a\" 0 --> 10",
      "heatmap\nx A, B",
      "orgchart\nCEO [Chief]",
      "ev\ndays 1, 2",
      "%% комментарий\nWaterfall\n=10 : A",
    ];

    for (const source of types) {
      const result = checkMermaidSyntax(source);
      expect(result.valid, source).toBe(true);
      expect(result.issues, source).toEqual([]);
    }
  });

  it("keeps reporting missing declaration for unknown first line", () => {
    expect(checkMermaidSyntax("waterfallish\nA --> B").valid).toBe(false);
  });

  it("reports unclosed fenced block", () => {
    const result = checkMermaidSyntax("```mermaid\nflowchart TD\nA --> B");
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.messageKey === "syntax.issue.mermaid.unclosedFence")).toBe(true);
  });
});

describe("parseMermaidErrorLine", () => {
  it("reads line number from mermaid parser hash", () => {
    const error = {
      message: "Parse error",
      hash: { line: 4, loc: { first_line: 4 } },
    };

    expect(parseMermaidErrorLine(error)).toBe(4);
  });

  it("reads line number from error message", () => {
    expect(parseMermaidErrorLine(new Error("Parse error on line 7"))).toBe(7);
  });
});

describe("parseMermaidErrorMessage", () => {
  it("returns error message text", () => {
    expect(parseMermaidErrorMessage(new Error("Invalid syntax"))).toBe("Invalid syntax");
  });
});

describe("isMermaidExtDeclaration", () => {
  it("detects extension keywords, aliases and skips comments", () => {
    expect(isMermaidExtDeclaration("waterfall\n=1 : A")).toBe(true);
    expect(isMermaidExtDeclaration("%% note\nheatmap\nx A")).toBe(true);
    expect(isMermaidExtDeclaration("flowchart TD\nA --> B")).toBe(false);
    expect(isMermaidExtDeclaration("")).toBe(false);
  });

  it("detects extension types inside a fenced mermaid block", () => {
    expect(isMermaidExtDeclaration("```mermaid\nwaterfall\n=1 : A\n```")).toBe(true);
    expect(isMermaidExtDeclaration("```\norgchart\nCEO\n```")).toBe(true);
  });

  it("ignores a trailing PlantUML block after the extension diagram", () => {
    expect(isMermaidExtDeclaration("bubble\nx A 1\n@startuml\nA -> B\n@enduml")).toBe(true);
  });
});
