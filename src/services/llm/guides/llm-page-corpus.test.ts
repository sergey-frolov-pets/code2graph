import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { LLM_PAGES, resolveLlmPagePath } from "@shared/llm-pages";
import { detectType } from "@/services/mermaid/ext";
import { waterfallEngine } from "@/services/mermaid/ext/engines/waterfall";
import { bubbleEngine } from "@/services/mermaid/ext/engines/bubble";
import { heatmapEngine } from "@/services/mermaid/ext/engines/heatmap";
import { orgchartEngine } from "@/services/mermaid/ext/engines/orgchart";
import { evEngine } from "@/services/mermaid/ext/engines/ev";
import { boxplotEngine } from "@/services/mermaid/ext/engines/boxplot";
import { treemapEngine } from "@/services/mermaid/ext/engines/treemap";
import { radarEngine } from "@/services/mermaid/ext/engines/radar";
import { voronoiEngine } from "@/services/mermaid/ext/engines/voronoi";
import { seriesEngine } from "@/services/mermaid/ext/engines/series";
import { powermapEngine } from "@/services/mermaid/ext/engines/powermap";
import { histogramEngine } from "@/services/mermaid/ext/engines/histogram";
import { infographicEngine } from "@/services/mermaid/ext/engines/infographic";
import { gaugeEngine } from "@/services/mermaid/ext/engines/gauge";
import { dashboardEngine } from "@/services/mermaid/ext/engines/dashboard";
import type { ExtEngine } from "@/services/mermaid/ext/types";

const PAGES_DIR = join(process.cwd(), "src/services/llm/guides/pages");
const MIN_BODY_LENGTH = 80;

const EXT_ENGINES: Record<string, ExtEngine<unknown>> = {
  waterfall: waterfallEngine,
  bubble: bubbleEngine,
  heatmap: heatmapEngine,
  orgchart: orgchartEngine,
  ev: evEngine,
  boxplot: boxplotEngine,
  treemap: treemapEngine,
  radar: radarEngine,
  voronoi: voronoiEngine,
  series: seriesEngine,
  powermap: powermapEngine,
  histogram: histogramEngine,
  infographic: infographicEngine,
  gauge: gaugeEngine,
  dashboard: dashboardEngine,
};

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(full));
    } else if (entry.name.endsWith(".md")) {
      found.push(full);
    }
  }
  return found;
}

function firstFence(markdown: string): string {
  const match = markdown.match(/```[^\n]*\n([\s\S]*?)```/);
  return match?.[1]?.trim() ?? "";
}

describe("llm page corpus", () => {
  const files = walk(PAGES_DIR);
  const bodies = new Map(
    files.map((file) => [relative(PAGES_DIR, file).replaceAll("\\", "/"), readFileSync(file, "utf8").trim()]),
  );

  it("matches the catalog and resolves every relative link", () => {
    expect([...bodies.keys()].sort()).toEqual(LLM_PAGES.map((page) => page.path).sort());
    for (const [path, body] of bodies) {
      for (const match of body.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
        const target = match[1];
        if (target.startsWith("http")) {
          continue;
        }
        expect(resolveLlmPagePath(target, path), `${path} -> ${target}`).not.toBeNull();
      }
    }
  });

  it("does not paste one page body into another", () => {
    const entries = [...bodies.entries()];
    for (const [path, body] of entries) {
      if (body.length < MIN_BODY_LENGTH) {
        continue;
      }
      for (const [otherPath, other] of entries) {
        if (otherPath === path) {
          continue;
        }
        expect(other.includes(body), `${otherPath} contains ${path}`).toBe(false);
      }
    }
  });

  it("starts D2 and Structurizr examples with a language keyword", () => {
    for (const page of LLM_PAGES) {
      if (page.kind !== "card") {
        continue;
      }
      if (page.language !== "d2" && page.language !== "structurizr") {
        continue;
      }
      const example = firstFence(bodies.get(page.path) ?? "");
      expect(example.length, page.path).toBeGreaterThan(0);
      if (page.language === "d2") {
        expect(example, page.path).toMatch(/direction:|shape:/);
      } else {
        expect(example.startsWith("workspace"), page.path).toBe(true);
      }
    }
  });

  it("parses the example on every Mermaid Ext page", () => {
    for (const page of LLM_PAGES) {
      if (!page.path.startsWith("mermaid/ext/") || page.kind === "shared") {
        continue;
      }
      const example = firstFence(bodies.get(page.path) ?? "");
      const type = page.diagramType ?? detectType(example);
      expect(type, page.path).toBeTruthy();
      expect(detectType(example), page.path).toBe(type);
      const engine = EXT_ENGINES[type ?? ""];
      expect(engine, page.path).toBeTruthy();
      const parsed = engine.parse(example);
      expect(parsed.ok, `${page.path}: ${parsed.errors.map((error) => error.message).join("; ")}`).toBe(true);
    }
  });
});
