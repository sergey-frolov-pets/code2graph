import { describe, expect, it } from "vitest";
import {
  extractMermaidCompletionPrefix,
  getMermaidCompletions,
} from "@/utils/mermaid-autocomplete";

describe("getMermaidCompletions", () => {
  it("suggests diagram declarations for empty source", () => {
    const items = getMermaidCompletions({
      lines: [""],
      lineNumber: 1,
      column: 3,
      prefix: "fl",
      prefixInfo: extractMermaidCompletionPrefix("fl", 2),
    });

    expect(items.some((item) => item.label === "flowchart")).toBe(true);
    expect(items.some((item) => item.label === "sequenceDiagram")).toBe(false);
  });

  it("suggests sequence tokens only for sequence diagrams", () => {
    const items = getMermaidCompletions({
      lines: ["sequenceDiagram", "    aut"],
      lineNumber: 2,
      column: 7,
      prefix: "aut",
      prefixInfo: extractMermaidCompletionPrefix("    aut", 7),
    });

    expect(items.some((item) => item.label === "autonumber")).toBe(true);
    expect(items.some((item) => item.label === "flowchart")).toBe(false);
  });

  it("suggests flowchart tokens only for flowcharts", () => {
    const items = getMermaidCompletions({
      lines: ["flowchart TD", "    sub"],
      lineNumber: 2,
      column: 7,
      prefix: "sub",
      prefixInfo: extractMermaidCompletionPrefix("    sub", 7),
    });

    expect(items.some((item) => item.label === "subgraph")).toBe(true);
    expect(items.some((item) => item.label === "participant")).toBe(false);
  });
});
