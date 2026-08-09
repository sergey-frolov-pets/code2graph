import { describe, expect, it } from "vitest";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { convertDiagram } from "@/services/conversion/pipeline/convert-diagram";
import { safeParseSourceToIr } from "@/services/conversion/parse/parse-source-to-ir";

interface GoldenRoute {
  source: string;
  sourceFormat: DiagramFormat;
  targetFormat: DiagramFormat;
  expectedTokens: string[];
  minEdges?: number;
  skipRoundTrip?: boolean;
}

function runGoldenRoute(route: GoldenRoute): void {
  it(`converts ${route.sourceFormat} → ${route.targetFormat}`, async () => {
    const forward = await convertDiagram({
      source: route.source,
      sourceFormat: route.sourceFormat,
      targetFormat: route.targetFormat,
      mode: "source",
      locale: "en",
    });

    expect(forward.ok).toBe(true);
    expect(forward.blocked).toBe(false);
    expect(forward.targetSource).toBeTruthy();

    for (const token of route.expectedTokens) {
      expect(forward.targetSource).toContain(token);
    }

    if (route.skipRoundTrip) {
      return;
    }

    const parsed = safeParseSourceToIr(
      forward.targetSource!,
      route.targetFormat,
    );
    expect(parsed.ir).toBeTruthy();
    if (route.minEdges !== undefined) {
      expect(parsed.ir?.edges.length ?? 0).toBeGreaterThanOrEqual(route.minEdges);
      return;
    }

    const hasNodes = (parsed.ir?.nodes.length ?? 0) > 0;
    const hasEdges = (parsed.ir?.edges.length ?? 0) > 0;
    expect(hasNodes || hasEdges).toBe(true);
  });
}

export function describeGoldenRoutes(
  title: string,
  routes: GoldenRoute[],
): void {
  describe(title, () => {
    for (const route of routes) {
      runGoldenRoute(route);
    }
  });
}

export async function expectBlockedConversion(
  source: string,
  sourceFormat: DiagramFormat,
  targetFormat: DiagramFormat,
): Promise<void> {
  const result = await convertDiagram({
    source,
    sourceFormat,
    targetFormat,
    mode: "source",
    locale: "en",
  });
  expect(result.ok).toBe(false);
  expect(result.blocked).toBe(true);
}
