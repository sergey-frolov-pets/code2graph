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

  it("blocks same format conversion", () => {
    expect(getConversionRouteRule("graph", "plantuml", "plantuml").blocked).toBe(
      true,
    );
  });
});
