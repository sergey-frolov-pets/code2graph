import { describe, expect, it } from "vitest";
import { scaffoldDiagram } from "@shared/agent-diagram";
import {
  WIREMARK_SAMPLE_IDS,
  getWiremarkSampleSource,
} from "@/constants/wiremark-sample-diagrams";
import { validateWiremarkSyntax } from "@/services/wiremark/syntax-validation";
import {
  ensureWireframePadding,
  renderWiremarkToSvg,
} from "@/services/wiremark/wiremark-engine";

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

  it("insets frame content and keeps sketch strokes inside the viewBox", () => {
    const svg = renderWiremarkToSvg(
      `Wireframe #login mobile\n  Typography h4 "Hi"`,
      { dark: false },
    );
    const textX = Number(svg.match(/<text x="([\d.]+)"/)?.[1]);
    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1]?.split(/\s+/).map(Number);

    expect(textX).toBe(16);
    expect(viewBox?.[0]).toBeLessThan(0);
    expect(viewBox?.[1]).toBeLessThan(0);
    expect(svg).toMatch(/\bwidth="\d+"/);
    expect(svg).toMatch(/\bheight="\d+"/);
  });

  it("respects an explicit frame padding", () => {
    expect(
      ensureWireframePadding('Wireframe #login mobile padding=0 // keep flush'),
    ).toBe('Wireframe #login mobile padding=0 // keep flush');
    expect(ensureWireframePadding("Wireframe #login mobile pad=1")).toBe(
      "Wireframe #login mobile pad=1",
    );

    const svg = renderWiremarkToSvg(
      `Wireframe #login mobile padding=0\n  Typography h4 "Hi"`,
      { dark: false },
    );
    expect(svg.match(/<text x="([\d.]+)"/)?.[1]).toBe("0");
  });

  it("keeps a checkbox label off the checkbox itself", () => {
    const svg = renderWiremarkToSvg(getWiremarkSampleSource("form", "en"), {
      dark: false,
    });
    const labelX = Number(
      svg.match(/<text[^>]*x="([\d.]+)"[^>]*>I agree/)?.[1],
    );
    const framePadPx = 16;
    const checkboxWidthPx = 18;
    const labelGapPx = 8;

    expect(labelX).toBe(framePadPx + checkboxWidthPx + labelGapPx);
  });

  it("rejects an empty source", () => {
    expect(validateWiremarkSyntax("   ").valid).toBe(false);
    expect(validateWiremarkSyntax("   ").issues[0]?.messageKey).toBe(
      "syntax.issue.empty",
    );
  });
});
