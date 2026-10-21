import { describe, expect, it } from "vitest";
import { scaffoldDiagram } from "@shared/agent-diagram";
import {
  WIREMARK_SAMPLE_IDS,
  getWiremarkSampleSource,
} from "@/constants/wiremark-sample-diagrams";
import { validateWiremarkSyntax } from "@/services/wiremark/syntax-validation";
import { renderWiremarkToSvg } from "@/services/wiremark/wiremark-engine";

describe("wiremark engine", () => {
  it("renders every sample to svg", () => {
    for (const id of WIREMARK_SAMPLE_IDS) {
      for (const locale of ["ru", "en"] as const) {
        const svg = renderWiremarkToSvg(getWiremarkSampleSource(id, locale), {
          dark: false,
        });
        expect(svg).toContain("<svg");
        expect(validateWiremarkSyntax(getWiremarkSampleSource(id, locale)).valid).toBe(
          true,
        );
      }
    }
  });

  it("renders a dark theme", () => {
    const svg = renderWiremarkToSvg(getWiremarkSampleSource("login", "en"), {
      dark: true,
    });
    expect(svg).toContain("<svg");
  });

  it("reports a syntax error for unquoted text", () => {
    const result = validateWiremarkSyntax(`Wireframe #login mobile
  TextField Email`);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.line).toBeGreaterThan(0);
  });

  it("renders the wizard wireframe scaffold", () => {
    for (const locale of ["ru", "en"] as const) {
      const source = scaffoldDiagram({
        format: "wiremark",
        diagramType: "wireframe",
        locale,
        count: 3,
      }).source;
      expect(validateWiremarkSyntax(source).valid).toBe(true);
      expect(renderWiremarkToSvg(source, { dark: false })).toContain("<svg");
    }
  });

  it("rejects an empty source", () => {
    expect(validateWiremarkSyntax("   ").valid).toBe(false);
    expect(validateWiremarkSyntax("   ").issues[0]?.messageKey).toBe(
      "syntax.issue.empty",
    );
  });
});
