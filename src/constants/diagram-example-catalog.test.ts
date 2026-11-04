import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DIAGRAM_EXAMPLES,
  exampleDomains,
  exampleTagKey,
  filterDiagramExamples,
  listCloudTags,
} from "@/constants/diagram-example-catalog";
import {
  diagramExamplePrompt,
  diagramExampleTitle,
} from "@/constants/diagram-example-text";
import { D2_SAMPLE_IDS } from "@/constants/d2-sample-diagrams";
import { GRAPHML_SAMPLE_IDS } from "@/constants/graphml-sample-diagrams";
import { MERMAID_SAMPLE_IDS } from "@/constants/mermaid-sample-diagrams";
import { PLANTUML_SAMPLE_IDS } from "@/constants/plantuml-sample-diagrams";
import { STRUCTURIZR_SAMPLE_IDS } from "@/constants/structurizr-sample-diagrams";
import { WIREMARK_SAMPLE_IDS } from "@/constants/wiremark-sample-diagrams";
import {
  WIZARD_TAG_FONT_SIZE_MAX_PX,
  WIZARD_TAG_FONT_SIZE_MIN_PX,
  wizardTagFontSizePx,
} from "@/constants/wizard-gallery";
import { wizardThumbnailFileName } from "@/constants/wizard-gallery";
import type { AppLocale } from "@/constants/i18n";
import { formatMessage } from "@/locales/messages";
import { enMessages } from "@/locales/en";
import { ruMessages } from "@/locales/ru";
import type { TranslateFn } from "@/locales/types";

const thumbnailRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../assets/wizard-thumbnails",
);

function translate(locale: AppLocale): TranslateFn {
  const messages = locale === "ru" ? ruMessages : enMessages;
  return (key, params) => formatMessage(messages[key], params);
}

describe("diagram example catalog", () => {
  it("lists every sample once", () => {
    const ids = DIAGRAM_EXAMPLES.map((example) => example.id);
    expect(new Set(ids).size).toBe(ids.length);

    const expected = [
      ...PLANTUML_SAMPLE_IDS.map((id) => `plantuml:${id}`),
      ...MERMAID_SAMPLE_IDS.map((id) => `mermaid:${id}`),
      ...D2_SAMPLE_IDS.map((id) => `d2:${id}`),
      ...GRAPHML_SAMPLE_IDS.map((id) => `graphml:${id}`),
      ...STRUCTURIZR_SAMPLE_IDS.map((id) => `structurizr:${id}`),
      ...WIREMARK_SAMPLE_IDS.map((id) => `wiremark:${id}`),
    ];
    expect(ids.sort()).toEqual([...expected].sort());
  });

  it("gives every example a language, a diagram type, and a domain", () => {
    for (const example of DIAGRAM_EXAMPLES) {
      expect(example.tags.some((tag) => tag.axis === "language")).toBe(true);
      expect(example.tags.some((tag) => tag.axis === "diagramType")).toBe(true);
      expect(exampleDomains(example).length).toBeGreaterThan(0);
    }
  });

  it("keeps examples that contain every selected domain", () => {
    const visible = filterDiagramExamples(
      DIAGRAM_EXAMPLES,
      [
        { axis: "domain", id: "finance" },
        { axis: "domain", id: "project" },
      ],
      "",
      (example) => example.id,
    );
    const ids = visible.map((example) => example.id);

    expect(ids).toContain("plantuml:gantt");
    expect(ids).toContain("mermaid:gantt");
    expect(ids).toContain("mermaid:ev");
    expect(ids).not.toContain("mermaid:pie");
  });

  it("intersects tag filters with the localized title", () => {
    const t = translate("en");
    const visible = filterDiagramExamples(
      DIAGRAM_EXAMPLES,
      [{ axis: "domain", id: "finance" }],
      "gantt",
      (example) => diagramExampleTitle(example, t),
    );

    expect(visible.map((example) => example.id).sort()).toEqual([
      "mermaid:gantt",
      "plantuml:gantt",
    ]);
  });

  it("writes a distinct prompt for each example in both locales", () => {
    for (const locale of ["ru", "en"] as const) {
      const t = translate(locale);
      const prompts = DIAGRAM_EXAMPLES.map((example) => diagramExamplePrompt(example, t));
      const titles = DIAGRAM_EXAMPLES.map((example) => diagramExampleTitle(example, t));

      expect(prompts.every((prompt) => prompt.trim().length > 0)).toBe(true);
      expect(new Set(prompts).size).toBe(prompts.length);
      expect(new Set(titles).size).toBe(titles.length);
    }

    const t = translate("en");
    const broken = DIAGRAM_EXAMPLES.find((example) => example.id === "mermaid:waterfallBreak");
    const mono = DIAGRAM_EXAMPLES.find((example) => example.id === "mermaid:waterfallMono");
    expect(diagramExamplePrompt(broken!, t)).not.toBe(diagramExamplePrompt(mono!, t));
    expect(diagramExamplePrompt(broken!, t)).toContain("Axis break");
  });

  it("sizes cloud tags from how many examples carry them", () => {
    expect(wizardTagFontSizePx(2, 2, 2)).toBe(WIZARD_TAG_FONT_SIZE_MIN_PX);
    expect(wizardTagFontSizePx(1, 1, 5)).toBe(WIZARD_TAG_FONT_SIZE_MIN_PX);
    expect(wizardTagFontSizePx(5, 1, 5)).toBe(WIZARD_TAG_FONT_SIZE_MAX_PX);

    const cloud = listCloudTags(DIAGRAM_EXAMPLES);
    const finance = cloud.find((tag) => exampleTagKey(tag) === "domain:finance");
    const organization = cloud.find((tag) => exampleTagKey(tag) === "domain:organization");
    expect(finance!.count).toBeGreaterThan(organization!.count);
    expect(finance!.fontSizePx).toBeGreaterThan(organization!.fontSizePx);
  });

  it("stores a light thumbnail for every example in both locales", () => {
    for (const example of DIAGRAM_EXAMPLES) {
      for (const locale of ["ru", "en"] as const) {
        const filePath = path.join(
          thumbnailRoot,
          locale,
          wizardThumbnailFileName(example.format, example.sampleId),
        );
        expect(existsSync(filePath), filePath).toBe(true);
      }
    }
  });
});
