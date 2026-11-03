import { describe, expect, it } from "vitest";
import { highlightGraphmlLine } from "@/utils/graphml-highlight";

describe("highlightGraphmlLine", () => {
  it("highlights xml declaration and root tag", () => {
    const tokens = highlightGraphmlLine(
      '<?xml version="1.0" encoding="UTF-8"?>',
    );
    expect(
      tokens.some(
        (token) => token.type === "preprocessor" && token.text.startsWith("<?xml"),
      ),
    ).toBe(true);
  });

  it("highlights graphml tags and attributes", () => {
    const tokens = highlightGraphmlLine(
      '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
    );
    expect(
      tokens.some((token) => token.type === "directive" && token.text === "graphml"),
    ).toBe(true);
    expect(tokens.some((token) => token.type === "variable" && token.text === "xmlns")).toBe(
      true,
    );
    expect(
      tokens.some(
        (token) =>
          token.type === "string" &&
          token.text === '"http://graphml.graphdrawing.org/xmlns"',
      ),
    ).toBe(true);
  });

  it("highlights node and edge elements", () => {
    const tokens = highlightGraphmlLine('<node id="n1"/>');
    expect(tokens.some((token) => token.type === "keyword" && token.text === "node")).toBe(
      true,
    );
    expect(tokens.some((token) => token.type === "variable" && token.text === "id")).toBe(
      true,
    );
    expect(tokens.some((token) => token.type === "string" && token.text === '"n1"')).toBe(
      true,
    );
  });

  it("highlights comments", () => {
    const tokens = highlightGraphmlLine("<!-- graph comment -->");
    expect(tokens).toEqual([{ type: "comment", text: "<!-- graph comment -->" }]);
  });
});
