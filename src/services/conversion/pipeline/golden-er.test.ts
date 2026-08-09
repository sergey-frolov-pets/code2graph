import { describe, it, expect } from "vitest";
import { convertDiagram } from "@/services/conversion/pipeline/convert-diagram";
import { describeGoldenRoutes } from "@/services/conversion/pipeline/golden-test-utils";
import { MERMAID_ER_MINIMAL } from "@/services/conversion/__fixtures__/er-samples";

describeGoldenRoutes("er diagram golden routes", [
  {
    source: MERMAID_ER_MINIMAL,
    sourceFormat: "mermaid",
    targetFormat: "graphml",
    expectedTokens: ["<graphml", "CUSTOMER", "ORDER"],
    skipRoundTrip: true,
  },
]);

describe("er diagram degraded routes", () => {
  it("converts mermaid er to plantuml as degraded graph", async () => {
    const result = await convertDiagram({
      source: MERMAID_ER_MINIMAL,
      sourceFormat: "mermaid",
      targetFormat: "plantuml",
      mode: "source",
      locale: "en",
    });

    expect(result.ok).toBe(true);
    expect(result.targetSource).toContain("@startuml");
    expect(result.targetSource).toContain("CUSTOMER");
    expect(result.targetSource).toContain("ORDER");
  });
});
