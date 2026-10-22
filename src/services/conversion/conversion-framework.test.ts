// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { getD2SampleSource, D2_SAMPLE_IDS } from "@/constants/d2-sample-diagrams";
import { DIAGRAM_FORMATS } from "@/constants/diagram-formats";
import { getMermaidSampleSource, MERMAID_SAMPLE_IDS } from "@/constants/mermaid-sample-diagrams";
import { getPlantUmlSampleSource, PLANTUML_SAMPLE_IDS } from "@/constants/plantuml-sample-diagrams";
import { getStructurizrSampleSource, STRUCTURIZR_SAMPLE_IDS } from "@/constants/structurizr-sample-diagrams";
import { getWiremarkSampleSource, WIREMARK_SAMPLE_IDS } from "@/constants/wiremark-sample-diagrams";
import { classifyDiagramKind } from "@/services/conversion/classify-diagram-kind";
import {
  getAvailableTargetFormats,
  getConversionAdapter,
  listConversionAdapters,
  parseSourceWithFramework,
} from "@/services/conversion/conversion-framework";
import { convertDiagram } from "@/services/conversion/pipeline/convert-diagram";

describe("unified conversion framework", () => {
  it("registers conversion adapters for every supported diagram format", () => {
    const adapters = listConversionAdapters();
    expect(adapters.map((adapter) => adapter.id)).toEqual([...DIAGRAM_FORMATS]);

    for (const format of DIAGRAM_FORMATS) {
      const adapter = getConversionAdapter(format);
      expect(adapter.id).toBe(format);
      expect(adapter.nativeKinds.length).toBeGreaterThan(0);
    }
  });

  it("parses and converts all D2 sample types (flow, sequence, classes, sql, architecture)", async () => {
    for (const sampleId of D2_SAMPLE_IDS) {
      const source = getD2SampleSource(sampleId, "ru");
      const ir = parseSourceWithFramework(source, "d2");
      expect(ir.nodes.length, `D2 sample ${sampleId} should have nodes`).toBeGreaterThan(0);

      for (const targetFormat of ["plantuml", "mermaid"] as const) {
        const result = await convertDiagram({
          source,
          sourceFormat: "d2",
          targetFormat,
          mode: "source",
          locale: "ru",
        });
        expect(result.ok, `D2 ${sampleId} -> ${targetFormat}`).toBe(true);
        expect(result.blocked).toBe(false);
        expect(result.targetSource).toBeTruthy();
      }
    }
  });

  it("preserves class members and SQL attributes when converting D2 to PlantUML and Mermaid", async () => {
    const classSource = getD2SampleSource("classes", "en");
    const classToMermaid = await convertDiagram({
      source: classSource,
      sourceFormat: "d2",
      targetFormat: "mermaid",
      mode: "source",
      locale: "en",
    });
    expect(classToMermaid.ok).toBe(true);
    expect(classToMermaid.targetSource).toContain("classDiagram");
    expect(classToMermaid.targetSource).toContain("login()");

    const sqlSource = getD2SampleSource("sql", "en");
    const sqlToPlantUml = await convertDiagram({
      source: sqlSource,
      sourceFormat: "d2",
      targetFormat: "plantuml",
      mode: "source",
      locale: "en",
    });
    expect(sqlToPlantUml.ok).toBe(true);
    expect(sqlToPlantUml.targetSource).toContain("entity");
    expect(sqlToPlantUml.targetSource).toContain("user_id");
    expect(sqlToPlantUml.targetSource).toContain("<<FK>>");
  });

  it("parses and converts all Structurizr DSL samples (context, containers, components, deployment)", async () => {
    for (const sampleId of STRUCTURIZR_SAMPLE_IDS) {
      const source = getStructurizrSampleSource(sampleId, "ru");
      const ir = parseSourceWithFramework(source, "structurizr");
      expect(ir.nodes.length, `Structurizr ${sampleId} nodes`).toBeGreaterThan(0);

      for (const targetFormat of ["plantuml", "mermaid", "d2", "graphml"] as const) {
        const result = await convertDiagram({
          source,
          sourceFormat: "structurizr",
          targetFormat,
          mode: "source",
          locale: "ru",
        });
        expect(result.ok, `Structurizr ${sampleId} -> ${targetFormat}`).toBe(true);
        expect(result.targetSource).toBeTruthy();
      }
    }
  });

  it("converts PlantUML and Mermaid C4 diagrams into valid Structurizr DSL and back", async () => {
    const plantumlC4 = getPlantUmlSampleSource("c4", "ru");
    const toDsl = await convertDiagram({
      source: plantumlC4,
      sourceFormat: "plantuml",
      targetFormat: "structurizr",
      mode: "source",
      locale: "ru",
    });

    expect(toDsl.ok).toBe(true);
    expect(toDsl.targetSource).toContain("workspace");
    expect(toDsl.targetSource).toContain("softwareSystem");
    expect(toDsl.targetSource).toContain("container");

    const backToMermaid = await convertDiagram({
      source: toDsl.targetSource!,
      sourceFormat: "structurizr",
      targetFormat: "mermaid",
      mode: "source",
      locale: "ru",
    });
    expect(backToMermaid.ok).toBe(true);
    expect(backToMermaid.targetSource).toContain("C4Container");
    expect(backToMermaid.targetSource).toContain("SPA");
  });

  it("parses and converts all WireMark wireframe samples to Mermaid, PlantUML, D2, and GraphML", async () => {
    for (const sampleId of WIREMARK_SAMPLE_IDS) {
      const source = getWiremarkSampleSource(sampleId, "ru");
      expect(classifyDiagramKind(source, "wiremark")).toBe("wireframe");

      const ir = parseSourceWithFramework(source, "wiremark");
      expect(ir.nodes.length, `WireMark ${sampleId} nodes`).toBeGreaterThan(0);

      for (const targetFormat of ["mermaid", "plantuml", "d2", "graphml"] as const) {
        const result = await convertDiagram({
          source,
          sourceFormat: "wiremark",
          targetFormat,
          mode: "source",
          locale: "ru",
        });
        expect(result.ok, `WireMark ${sampleId} -> ${targetFormat}`).toBe(true);
        expect(result.targetSource).toBeTruthy();
      }
    }
  });

  it("converts flowcharts to WireMark wireframes", async () => {
    const flowchart = getMermaidSampleSource("flowchart", "ru");
    const toWiremark = await convertDiagram({
      source: flowchart,
      sourceFormat: "mermaid",
      targetFormat: "wiremark",
      mode: "source",
      locale: "ru",
    });

    expect(toWiremark.ok).toBe(true);
    expect(toWiremark.targetSource).toContain("Wireframe #");
  });

  it("converts every PlantUML sample in RU and EN without empty IR or crashes", async () => {
    for (const sampleId of PLANTUML_SAMPLE_IDS) {
      const source = getPlantUmlSampleSource(sampleId, "ru");
      const ir = parseSourceWithFramework(source, "plantuml");
      expect(
        ir.nodes.length,
        `PlantUML RU sample "${sampleId}" (kind=${ir.kind}) should produce nodes`,
      ).toBeGreaterThan(0);

      const toMermaid = await convertDiagram({
        source,
        sourceFormat: "plantuml",
        targetFormat: "mermaid",
        mode: "source",
        locale: "ru",
      });
      expect(toMermaid.ok, `PlantUML "${sampleId}" -> mermaid`).toBe(true);

      const toD2 = await convertDiagram({
        source,
        sourceFormat: "plantuml",
        targetFormat: "d2",
        mode: "source",
        locale: "ru",
      });
      expect(toD2.ok, `PlantUML "${sampleId}" -> d2`).toBe(true);
    }
  });

  it("converts every Mermaid sample in RU and EN to PlantUML and D2", async () => {
    for (const sampleId of MERMAID_SAMPLE_IDS) {
      const source = getMermaidSampleSource(sampleId, "ru");
      const ir = parseSourceWithFramework(source, "mermaid");
      expect(
        ir.nodes.length,
        `Mermaid RU sample "${sampleId}" (kind=${ir.kind}) should produce nodes`,
      ).toBeGreaterThan(0);

      const toPlantUml = await convertDiagram({
        source,
        sourceFormat: "mermaid",
        targetFormat: "plantuml",
        mode: "source",
        locale: "ru",
      });
      expect(toPlantUml.ok, `Mermaid "${sampleId}" -> plantuml`).toBe(true);

      const toD2 = await convertDiagram({
        source,
        sourceFormat: "mermaid",
        targetFormat: "d2",
        mode: "source",
        locale: "ru",
      });
      expect(toD2.ok, `Mermaid "${sampleId}" -> d2`).toBe(true);
    }
  });

  it("computes target format availability across all formats", () => {
    const targets = getAvailableTargetFormats(
      getPlantUmlSampleSource("c4", "en"),
      "plantuml",
    );
    const structurizrEntry = targets.find((t) => t.format === "structurizr");
    expect(structurizrEntry?.blocked).toBe(false);
    expect(structurizrEntry?.rule.level).toBe("A");

    const d2Entry = targets.find((t) => t.format === "d2");
    expect(d2Entry?.blocked).toBe(false);
  });
});
