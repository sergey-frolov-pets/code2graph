import { describe, expect, it } from "vitest";
import { highlightPlantUmlLine } from "@/utils/plantuml-highlight";

function highlighted(line: string, word: string): boolean {
  return highlightPlantUmlLine(line).some(
    (token) =>
      token.text.toLowerCase() === word.toLowerCase() &&
      (token.type === "keyword" ||
        token.type === "directive" ||
        token.type === "preprocessor"),
  );
}

describe("highlightPlantUmlLine", () => {
  it("highlights keywords of every diagram family", () => {
    const cases: Array<[string, string]> = [
      ["@startuml", "@startuml"],
      ["participant API", "participant"],
      ["critical failure", "critical"],
      ["concise \"Request\" as request", "concise"],
      ["robust \"Database\" as db", "robust"],
      ["binary \"Cache\" as cache", "binary"],
      ["clock \"Tick\" as clk with period 50", "clock"],
      ["network office {", "network"],
      ["web [address = \"10.0.0.1\"]", "address"],
      ["left to right direction", "direction"],
      ["project starts 2026-01-06", "project"],
      ["[Analysis] lasts 5 days", "lasts"],
      ["[Release] happens at 2026-02-20", "happens"],
      ["saturday are closed", "saturday"],
      ["Business_Actor(customer, \"Customer\")", "Business_Actor"],
      ["Rel_Triggering(customer, checkout, \"Starts\")", "Rel_Triggering"],
      ["SystemDb(files, \"Files\")", "SystemDb"],
      ["LAYOUT_LANDSCAPE()", "LAYOUT_LANDSCAPE"],
      ["split again", "split again"],
      ["left side", "left side"],
    ];

    for (const [line, word] of cases) {
      expect(highlighted(line, word), `${word} in ${line}`).toBe(true);
    }
  });
});
