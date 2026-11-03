import { describe, expect, it } from "vitest";
import {
  emitPlantUmlComponentNode,
  flattenPlantUmlLabel,
  formatPlantUmlEdgeSuffix,
} from "@/services/conversion/emit/plantuml-emit-utils";

describe("plantuml-emit-utils", () => {
  it("flattens multiline labels to a single line", () => {
    expect(
      flattenPlantUmlLabel("Support \nrequired outside \nof RCA"),
    ).toBe("Support required outside of RCA");
  });

  it("emits bracket syntax for simple labels", () => {
    expect(emitPlantUmlComponentNode("n4", "GO")).toBe("[GO] as n4");
  });

  it("emits quoted rectangle syntax for multiline labels", () => {
    expect(
      emitPlantUmlComponentNode("n0", "Support \nrequired outside \nof RCA"),
    ).toBe(
      'rectangle "Support required outside of RCA" as n0',
    );
  });

  it("escapes quotes in edge labels", () => {
    expect(formatPlantUmlEdgeSuffix('Say "Yes"')).toBe(' : Say \\"Yes\\"');
  });
});
