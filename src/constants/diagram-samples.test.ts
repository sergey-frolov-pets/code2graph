import { describe, expect, it } from "vitest";
import { getWizardTypesForLanguage } from "@/constants/llm-wizard";
import { listSampleIds } from "@/constants/sample-diagrams";
import {
  D2_SAMPLE_IDS,
  getD2SampleSource,
} from "@/constants/d2-sample-diagrams";
import {
  GRAPHML_SAMPLE_IDS,
  getGraphmlSampleSource,
} from "@/constants/graphml-sample-diagrams";
import {
  STRUCTURIZR_SAMPLE_IDS,
  getStructurizrSampleSource,
} from "@/constants/structurizr-sample-diagrams";
import {
  WIREMARK_SAMPLE_IDS,
  getWiremarkSampleSource,
} from "@/constants/wiremark-sample-diagrams";
import {
  MERMAID_SAMPLE_IDS,
  MERMAID_SAMPLE_WIZARD_TYPES,
  getMermaidSampleSource,
} from "@/constants/mermaid-sample-diagrams";
import { parseSankeyMermaid } from "@/services/conversion/parse/mermaid-kind-parsers";
import {
  PLANTUML_SAMPLE_IDS,
  PLANTUML_SAMPLE_WIZARD_TYPES,
  getPlantUmlSampleSource,
} from "@/constants/plantuml-sample-diagrams";

describe("diagram samples coverage", () => {
  it("covers every PlantUML wizard diagram type", () => {
    const coveredTypes = new Set(
      PLANTUML_SAMPLE_IDS.map((id) => PLANTUML_SAMPLE_WIZARD_TYPES[id]),
    );

    for (const diagramType of getWizardTypesForLanguage("plantuml")) {
      expect(coveredTypes.has(diagramType)).toBe(true);
    }
  });

  it("covers every Mermaid wizard diagram type", () => {
    const coveredTypes = new Set(
      MERMAID_SAMPLE_IDS.map((id) => MERMAID_SAMPLE_WIZARD_TYPES[id]),
    );

    for (const diagramType of getWizardTypesForLanguage("mermaid")) {
      expect(coveredTypes.has(diagramType)).toBe(true);
    }
  });

  it("returns non-empty sources for all samples", () => {
    for (const id of PLANTUML_SAMPLE_IDS) {
      expect(getPlantUmlSampleSource(id, "ru").trim().length).toBeGreaterThan(0);
      expect(getPlantUmlSampleSource(id, "en").trim().length).toBeGreaterThan(0);
    }

    for (const id of MERMAID_SAMPLE_IDS) {
      expect(getMermaidSampleSource(id, "ru").trim().length).toBeGreaterThan(0);
      expect(getMermaidSampleSource(id, "en").trim().length).toBeGreaterThan(0);
    }

    for (const id of WIREMARK_SAMPLE_IDS) {
      expect(getWiremarkSampleSource(id, "ru").trim().length).toBeGreaterThan(0);
      expect(getWiremarkSampleSource(id, "en").trim().length).toBeGreaterThan(0);
    }

    for (const id of D2_SAMPLE_IDS) {
      expect(getD2SampleSource(id, "ru").trim().length).toBeGreaterThan(0);
      expect(getD2SampleSource(id, "en").trim().length).toBeGreaterThan(0);
    }

    for (const id of STRUCTURIZR_SAMPLE_IDS) {
      expect(getStructurizrSampleSource(id, "ru").trim().length).toBeGreaterThan(0);
      expect(getStructurizrSampleSource(id, "en").trim().length).toBeGreaterThan(0);
    }

    for (const id of GRAPHML_SAMPLE_IDS) {
      expect(getGraphmlSampleSource(id, "ru").trim().length).toBeGreaterThan(0);
      expect(getGraphmlSampleSource(id, "en").trim().length).toBeGreaterThan(0);
      expect(getGraphmlSampleSource(id, "ru")).toContain("<graphml");
      expect(getGraphmlSampleSource(id, "en")).toContain("<edge");
    }
  });

  it("shows most documented capabilities in the sample sources", () => {
    const joined = (parts: string[]) => parts.join("\n");

    const d2 = joined(
      D2_SAMPLE_IDS.flatMap((id) => [
        getD2SampleSource(id, "ru"),
        getD2SampleSource(id, "en"),
      ]),
    );
    for (const token of [
      "direction:",
      "shape: person",
      "shape: cylinder",
      "shape: sequence_diagram",
      "shape: class",
      "shape: sql_table",
      "shape: diamond",
      "shape: cloud",
      "shape: queue",
      "shape: document",
      "shape: page",
      "shape: step",
      "shape: callout",
      "shape: stored_data",
      "shape: text",
      "shape: hexagon",
      "shape: oval",
      "shape: circle",
      "shape: package",
      "shape: parallelogram",
      "shape: square",
      "classes:",
      "class: accent",
      "constraint: primary_key",
      "constraint: foreign_key",
      "constraint: unique",
      "tooltip:",
      "link:",
      "near:",
      "grid-rows:",
      "grid-columns:",
      "grid-gap:",
      "animated: true",
      "stroke-dash:",
      "double-border:",
      "fill-pattern:",
      "text-transform:",
      "font: mono",
      "icon:",
      "login()",
      "user_id",
    ]) {
      expect(d2, token).toContain(token);
    }

    const structurizr = joined(
      STRUCTURIZR_SAMPLE_IDS.flatMap((id) => [
        getStructurizrSampleSource(id, "en"),
      ]),
    );
    for (const token of [
      "workspace",
      "softwareSystem",
      "container ",
      "component ",
      "deploymentNode",
      "deploymentEnvironment",
      "containerInstance",
      "softwareSystemInstance",
      "infrastructureNode",
      "group ",
      "include *",
      "autolayout",
      "styles",
      "element ",
      "relationship ",
      "tags ",
      "properties",
      "theme ",
      "systemContext",
      "systemLandscape",
      "dynamic ",
      "filtered ",
      "url ",
      "!identifiers",
      "!impliedRelationships",
      "!docs",
      "!adrs",
      "configuration",
      "perspectives",
    ]) {
      expect(structurizr, token).toContain(token);
    }

    const graphml = joined(
      GRAPHML_SAMPLE_IDS.map((id) => getGraphmlSampleSource(id, "en")),
    );
    for (const token of [
      "<graphml",
      "<graph",
      "<node",
      "<edge",
      "<key",
      "<data",
      "<desc>",
      "<port",
      "<hyperedge",
      "<endpoint",
      'key="loc"',
      "diamond",
      "ellipse",
      "hexagon",
      "dashed",
    ]) {
      expect(graphml, token).toContain(token);
    }

    const plantuml = joined(
      PLANTUML_SAMPLE_IDS.map((id) => getPlantUmlSampleSource(id, "en")),
    );
    for (const token of [
      "Enterprise_Boundary",
      "entity ",
      "usecase ",
      "artifact ",
      "object ",
      "concise ",
      "@startwbs",
      "@startnwdiag",
      "Business_Actor",
      "Rel_Flow",
      "Rel_Triggering",
      "with period",
      "skinparam",
      "@startmindmap",
      "@startgantt",
    ]) {
      expect(plantuml, token).toContain(token);
    }

    const mermaid = joined(
      MERMAID_SAMPLE_IDS.map((id) => getMermaidSampleSource(id, "en")),
    );
    for (const token of [
      "flowchart",
      "sequenceDiagram",
      "classDiagram",
      "C4Component",
      "stateDiagram-v2",
      "erDiagram",
      "gantt",
      "mindmap",
      "pie showData",
      "journey",
      "gitGraph",
      "timeline",
      "sankey-beta",
      "linkColor",
      "nodeAlignment",
      "showValues",
      "nodeColors",
      "labelStyle",
      "xychart-beta",
      "block-beta",
      "C4Context",
      "requirementDiagram",
      "quadrantChart",
      "architecture-beta",
      "packet-beta",
      "linkStyle",
      "namespace ",
      "classDef",
    ]) {
      expect(mermaid, token).toContain(token);
    }
  });

  it("keeps the mermaid sankey sample balanced and documents options", () => {
    for (const locale of ["ru", "en"] as const) {
      const source = getMermaidSampleSource("sankey", locale);
      expect(source).toContain("linkColor");
      expect(source).toContain("nodeAlignment");
      expect(source).toContain("showValues");
      expect(source).toContain("nodeColors");
      expect(source).toContain('"Pay, card"');

      const flows = parseSankeyMermaid(source, "mermaid").extras?.sankeyFlows ?? [];
      expect(flows).toHaveLength(28);

      const incoming = new Map<string, number>();
      const outgoing = new Map<string, number>();
      for (const flow of flows) {
        outgoing.set(flow.source, (outgoing.get(flow.source) ?? 0) + flow.value);
        incoming.set(flow.target, (incoming.get(flow.target) ?? 0) + flow.value);
      }

      for (const node of new Set([...incoming.keys(), ...outgoing.keys()])) {
        const inn = incoming.get(node) ?? 0;
        const out = outgoing.get(node) ?? 0;
        if (inn > 0 && out > 0) {
          expect(out, `${locale}:${node}`).toBe(inn);
        }
      }

      expect(outgoing.get("Site")).toBe(170);
      expect(incoming.get("Paid")).toBe(70);
    }
  });

  it("shows every series line and cagr option", () => {
    for (const locale of ["ru", "en"] as const) {
      const lines = getMermaidSampleSource("seriesLines", locale);
      for (const token of ["style=solid", "style=dash", "style=dot", "style=dashdot", "width=", "color=#", ", -", ", ,", "null"]) {
        expect(lines, `${locale}:${token}`).toContain(token);
      }

      const cagr = getMermaidSampleSource("seriesCagr", locale);
      expect(cagr).toMatch(/^cagr\s*$/m);
      expect(cagr).not.toMatch(/^cagr \d/m);

      const ranges = getMermaidSampleSource("seriesCagrRanges", locale);
      expect(ranges).toContain('cagr 1, 2 format="0%"');
      expect(ranges).toContain('cagr 2, 3 format="0.00" prefix=');
      expect(ranges).toContain('cagr 3, 5 format="0.0%" prefix=');
      expect(ranges).toMatch(/^cagr 5, 6 label=/m);
      expect(ranges).toMatch(/^title .+\nratio 16x6$/m);
      expect(ranges).toContain('cagr 8, 9 format="+0.0%"\ncagr 6, 7 format="0%" prefix=');

      const axisBreak = getMermaidSampleSource("seriesBreak", locale);
      expect(axisBreak).toMatch(/^break \d+ --> \d+/m);

      const levels = getMermaidSampleSource("seriesThresholds", locale);
      expect(levels).toMatch(/^line \d+ /m);
      expect(levels).toContain("color=#cf222e");
      expect(levels).toContain("style=dot");

      const histogram = [
        "histogram",
        "histogramBins",
        "histogramCurves",
        "histogramLabels",
        "histogramClean",
        "histogramDensity",
        "histogramMono",
        "histogramRotate",
        "histogramLine",
      ].map((id) => getMermaidSampleSource(id as "histogram", locale)).join("\n");
      for (const token of [
        "bins auto",
        "bins 8",
        "bins 0 --> 10, 10 --> 25, 25 --> 50, 50 --> 80",
        "binwidth 10",
        "scale count",
        "scale density",
        "gap 0",
        "gap 1",
        "gap 100%",
        "labels above",
        "labels inside",
        "labels none",
        "fontcolor auto",
        "axis y off",
        "axis x off",
        "rotate 90",
        "fontsize",
        "ratio 16x9",
        "mono",
        "fit normal",
        "fit weibull",
        "curve weibull",
        "outliers iqr",
        "missing drop",
        "errors drop",
        "stats mean median sd var ci",
        "ci 0.95",
        "line 5",
      ]) {
        expect(histogram, `${locale}:${token}`).toContain(token);
      }

      const unnamed = getMermaidSampleSource("seriesUnnamed", locale);
      expect(unnamed).toMatch(/^series : /m);
      expect(unnamed).toMatch(/^line : /m);
      expect(unnamed).toContain("color=#8250df");
      expect(unnamed).toContain("style=dash");
    }
  });

  it("lists samples only for the selected language", () => {
    expect(listSampleIds("plantuml")).toEqual([...PLANTUML_SAMPLE_IDS]);
    expect(listSampleIds("mermaid")).toEqual([...MERMAID_SAMPLE_IDS]);
    expect(listSampleIds("wiremark")).toEqual([...WIREMARK_SAMPLE_IDS]);
    expect(listSampleIds("d2")).toEqual([...D2_SAMPLE_IDS]);
    expect(listSampleIds("structurizr")).toEqual([...STRUCTURIZR_SAMPLE_IDS]);
    expect(listSampleIds("graphml")).toEqual([...GRAPHML_SAMPLE_IDS]);
  });
});
