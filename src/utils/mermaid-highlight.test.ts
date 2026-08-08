import { describe, expect, it } from "vitest";
import { highlightMermaidLine } from "@/utils/mermaid-highlight";

describe("highlightMermaidLine", () => {
  it("highlights diagram declaration and arrows", () => {
    const tokens = highlightMermaidLine("flowchart TD");
    expect(tokens.some((token) => token.type === "directive" && token.text === "flowchart")).toBe(true);
    expect(tokens.some((token) => token.type === "keyword" && token.text === "TD")).toBe(true);
  });

  it("highlights comments", () => {
    const tokens = highlightMermaidLine("%% comment");
    expect(tokens).toEqual([{ type: "comment", text: "%% comment" }]);
  });

  it("highlights arrows and colors", () => {
    const tokens = highlightMermaidLine('A --> B : link');
    expect(tokens.some((token) => token.type === "arrow" && token.text === "-->")).toBe(true);
  });

  it("highlights strings", () => {
    const tokens = highlightMermaidLine('participant App as "Web App"');
    expect(tokens.some((token) => token.type === "string" && token.text === '"Web App"')).toBe(true);
  });
});
