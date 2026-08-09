import { describe, expect, it } from "vitest";
import {
  getConversionRouteRule,
  isConversionBlocked,
} from "@/services/conversion/rules/conversion-matrix";

describe("conversion-matrix", () => {
  it("blocks gantt to graphml", () => {
    expect(isConversionBlocked("gantt", "plantuml", "graphml")).toBe(true);
    expect(getConversionRouteRule("gantt", "plantuml", "graphml").blocked).toBe(
      true,
    );
  });

  it("allows graph plantuml to mermaid", () => {
    const rule = getConversionRouteRule("graph", "plantuml", "mermaid");
    expect(rule.blocked).toBe(false);
    expect(rule.level).toBe("B");
    expect(rule.lossIds).toContain("loss.subgraphs");
  });

  it("blocks graphml to sequence plantuml", () => {
    expect(isConversionBlocked("sequence", "graphml", "plantuml")).toBe(true);
  });

  it("blocks graphml to er plantuml", () => {
    expect(isConversionBlocked("er", "graphml", "plantuml")).toBe(true);
  });

  it("allows class plantuml to mermaid", () => {
    const rule = getConversionRouteRule("class", "plantuml", "mermaid");
    expect(rule.blocked).toBe(false);
    expect(rule.level).toBe("B");
  });

  it("allows state mermaid to plantuml", () => {
    const rule = getConversionRouteRule("state", "mermaid", "plantuml");
    expect(rule.blocked).toBe(false);
    expect(rule.level).toBe("B");
  });

  it("allows er mermaid to graphml", () => {
    const rule = getConversionRouteRule("er", "mermaid", "graphml");
    expect(rule.blocked).toBe(false);
    expect(rule.level).toBe("B");
  });

  it("blocks same format conversion", () => {
    expect(getConversionRouteRule("graph", "plantuml", "plantuml").blocked).toBe(
      true,
    );
  });

  it("allows plantuml er to mermaid er", () => {
    const rule = getConversionRouteRule("er", "plantuml", "mermaid");
    expect(rule.blocked).toBe(false);
    expect(rule.level).toBe("B");
  });

  it("blocks pie to graphml", () => {
    expect(isConversionBlocked("pie", "mermaid", "graphml")).toBe(true);
  });

  it("allows mindmap cross-format conversion", () => {
    const rule = getConversionRouteRule("mindmap", "plantuml", "mermaid");
    expect(rule.blocked).toBe(false);
    expect(rule.level).toBe("B");
  });
});
