// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { validateGraphmlSyntax } from "@/services/graphml/syntax-validation";

const VALID_GRAPHML = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph edgedefault="directed">
    <node id="n1"/>
    <node id="n2"/>
    <edge source="n1" target="n2"/>
  </graph>
</graphml>`;

describe("validateGraphmlSyntax", () => {
  it("accepts valid graphml", () => {
    expect(validateGraphmlSyntax(VALID_GRAPHML)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("rejects empty source", () => {
    const result = validateGraphmlSyntax("   ");
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.messageKey).toBe("syntax.issue.empty");
  });

  it("rejects malformed xml", () => {
    const result = validateGraphmlSyntax("<graphml><node></graphml>");
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.messageKey).toBe("graphml.parseFailed");
  });

  it("rejects graphml without nodes", () => {
    const result = validateGraphmlSyntax(`<?xml version="1.0"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <graph edgedefault="directed"/>
</graphml>`);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.messageKey).toBe("graphml.noNodes");
  });
});
