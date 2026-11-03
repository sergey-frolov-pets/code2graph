import { describe, expect, it } from "vitest";
import { AGENT_TYPES_BY_LANGUAGE, scaffoldDiagram } from "@shared/agent-diagram";
import { D2_SAMPLE_IDS, getD2SampleSource } from "@/constants/d2-sample-diagrams";
import { renderD2ToSvg } from "@/services/d2/d2-engine";
import { validateD2Syntax } from "@/services/d2/syntax-validation";

describe("d2 engine", () => {
  it("renders every sample to svg", async () => {
    for (const id of D2_SAMPLE_IDS) {
      for (const locale of ["ru", "en"] as const) {
        const svg = await renderD2ToSvg(getD2SampleSource(id, locale));
        expect(svg.trim().startsWith("<svg")).toBe(true);
        expect(svg).toMatch(/<svg[^>]*\bwidth="\d+"/);
        expect(svg).toMatch(/<svg[^>]*\bheight="\d+"/);
      }
    }
  }, 30_000);

  it("renders every wizard scaffold to svg", async () => {
    for (const diagramType of AGENT_TYPES_BY_LANGUAGE.d2) {
      const source = scaffoldDiagram({
        format: "d2",
        diagramType,
        locale: "en",
        direction: "TB",
        count: 3,
      }).source;
      const svg = await renderD2ToSvg(source);
      expect(svg.trim().startsWith("<svg")).toBe(true);
      expect((await validateD2Syntax(source)).valid).toBe(true);
    }
  }, 30_000);

  it("keeps a white mask so labeled edges stay visible", async () => {
    const svg = await renderD2ToSvg(getD2SampleSource("flow", "en"));
    expect(svg).toMatch(/<mask\b[^>]*>[\s\S]*?\bfill="white"/);
  });

  it("reports a line for invalid connections", async () => {
    const result = await validateD2Syntax("->");
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.line).toBe(1);
  });
});