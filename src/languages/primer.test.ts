import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/constants/i18n";
import { DIAGRAM_LANGUAGE_MODULES } from "@/languages/registry";
import { LANGUAGE_PRIMERS, type LanguagePrimerType } from "@/languages/primer";
import { isLocaleKey } from "@/locales/types";

const MAX_TYPES_ON_THE_PAGE = 24;
const MAX_KEYWORDS_ON_THE_PAGE = 8;

const MERMAID_TYPE_IDS = [
  "flowchart",
  "sequence",
  "class",
  "state",
  "er",
  "gantt",
  "mindmap",
  "pie",
  "journey",
  "gitgraph",
  "timeline",
  "sankey",
  "xychart",
  "block",
  "c4_context",
  "requirement",
  "quadrant",
  "architecture",
  "packet",
] as const;

const MERMAID_EXT_TYPE_IDS = [
  "ext-waterfall",
  "ext-bubble",
  "ext-heatmap",
  "ext-orgchart",
  "ext-powermap",
  "ext-ev",
  "ext-boxplot",
  "ext-treemap",
  "ext-radar",
  "ext-voronoi",
  "ext-clustered",
  "ext-histogram",
] as const;

describe("language page primer", () => {
  it("covers every language that has a site page", () => {
    const siteIds = DIAGRAM_LANGUAGE_MODULES.filter((module) => module.site).map(
      (module) => module.id,
    );

    expect(Object.keys(LANGUAGE_PRIMERS).sort()).toEqual([...siteIds].sort());
  });

  it("keeps each cheat sheet short and translated", () => {
    for (const [languageId, primer] of Object.entries(LANGUAGE_PRIMERS)) {
      expect(primer.types.length, languageId).toBeGreaterThan(0);
      expect(primer.types.length, languageId).toBeLessThanOrEqual(
        MAX_TYPES_ON_THE_PAGE,
      );
      expect(primer.keywords.length, languageId).toBeGreaterThan(0);
      expect(primer.keywords.length, languageId).toBeLessThanOrEqual(
        MAX_KEYWORDS_ON_THE_PAGE,
      );

      const typeIds = primer.types.map((diagramType) => diagramType.id);
      expect(new Set(typeIds).size, languageId).toBe(typeIds.length);

      const keywordIds = primer.keywords.map((keyword) => keyword.id);
      expect(new Set(keywordIds).size, languageId).toBe(keywordIds.length);

      for (const diagramType of primer.types) {
        expect(isLocaleKey(diagramType.titleKey), diagramType.titleKey).toBe(true);
        expect(isLocaleKey(diagramType.summaryKey), diagramType.summaryKey).toBe(
          true,
        );
        expect(isLocaleKey(diagramType.syntaxKey), diagramType.syntaxKey).toBe(
          true,
        );

        for (const locale of SUPPORTED_LOCALES) {
          const example = diagramType.example[locale];
          expect(example.trim().length, `${languageId}:${diagramType.id}`).toBeGreaterThan(0);
          expect(example, `${languageId}:${diagramType.id}`).toBe(example.trim());
        }
      }

      for (const keyword of primer.keywords) {
        expect(keyword.token.trim().length, keyword.id).toBeGreaterThan(0);
        expect(isLocaleKey(keyword.hintKey), keyword.hintKey).toBe(true);

        for (const locale of SUPPORTED_LOCALES) {
          const example = keyword.example[locale];
          expect(example, `${languageId}:${keyword.id}`).toContain(keyword.token);
          expect(example, `${languageId}:${keyword.id}`).toBe(example.trim());
        }
      }

      checkTypes(primer.extTypes ?? [], `${languageId}:ext`);
    }
  });

  it("lists every shipped Mermaid diagram, including the extension", () => {
    expect(LANGUAGE_PRIMERS.mermaid.types.map((diagramType) => diagramType.id)).toEqual(
      [...MERMAID_TYPE_IDS],
    );
    expect(
      LANGUAGE_PRIMERS.mermaid.extTypes?.map((diagramType) => diagramType.id),
    ).toEqual([...MERMAID_EXT_TYPE_IDS]);
  });

  it("keeps extension types apart from the language types", () => {
    for (const [languageId, primer] of Object.entries(LANGUAGE_PRIMERS)) {
      const extTypes = primer.extTypes ?? [];
      if (extTypes.length === 0) continue;

      const typeIds = new Set(primer.types.map((diagramType) => diagramType.id));
      for (const extType of extTypes) {
        expect(typeIds.has(extType.id), `${languageId}:${extType.id}`).toBe(false);
      }
    }
  });
});

function checkTypes(
  types: readonly LanguagePrimerType[],
  label: string,
): void {
  const ids = types.map((diagramType) => diagramType.id);
  expect(new Set(ids).size, label).toBe(ids.length);

  for (const diagramType of types) {
    expect(isLocaleKey(diagramType.titleKey), diagramType.titleKey).toBe(true);
    expect(isLocaleKey(diagramType.summaryKey), diagramType.summaryKey).toBe(true);
    expect(isLocaleKey(diagramType.syntaxKey), diagramType.syntaxKey).toBe(true);

    for (const locale of SUPPORTED_LOCALES) {
      const example = diagramType.example[locale];
      expect(example.trim().length, `${label}:${diagramType.id}`).toBeGreaterThan(0);
      expect(example, `${label}:${diagramType.id}`).toBe(example.trim());
    }
  }
}
