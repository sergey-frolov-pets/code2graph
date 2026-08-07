import { describe, expect, it } from "vitest";
import {
  buildMermaidLiveState,
  encodeMermaidStateForInk,
} from "@/utils/mermaid-encode";
import { prepareMermaidSource } from "@/utils/mermaid-source";

describe("prepareMermaidSource", () => {
  it("unwraps fenced mermaid blocks", () => {
    expect(
      prepareMermaidSource("```mermaid\nflowchart LR\nA --> B\n```"),
    ).toBe("flowchart LR\nA --> B");
  });

  it("returns trimmed plain source", () => {
    expect(prepareMermaidSource("  graph TD\nA-->B  ")).toBe("graph TD\nA-->B");
  });
});

describe("encodeMermaidStateForInk", () => {
  it("builds pako-prefixed state for mermaid.ink", async () => {
    const encoded = await encodeMermaidStateForInk("graph TD\nA-->B");
    expect(encoded.startsWith("pako:")).toBe(true);
    expect(encoded.length).toBeGreaterThan(20);
  });

  it("uses dark theme in live state", () => {
    const state = buildMermaidLiveState("graph TD\nA-->B", { dark: true });
    expect(state.mermaid).toContain("dark");
  });
});
