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

  it("lists samples only for the selected language", () => {
    expect(listSampleIds("plantuml")).toEqual([...PLANTUML_SAMPLE_IDS]);
    expect(listSampleIds("mermaid")).toEqual([...MERMAID_SAMPLE_IDS]);
    expect(listSampleIds("wiremark")).toEqual([...WIREMARK_SAMPLE_IDS]);
    expect(listSampleIds("d2")).toEqual([...D2_SAMPLE_IDS]);
    expect(listSampleIds("structurizr")).toEqual([...STRUCTURIZR_SAMPLE_IDS]);
    expect(listSampleIds("graphml")).toEqual([...GRAPHML_SAMPLE_IDS]);
  });
});
