import { describe, expect, it } from "vitest";
import type { AppLocale } from "@/constants/i18n";
import { messagesByLocale } from "@/locales/messages";
import type { LocaleKey } from "@/locales/types";
import {
  resolveLocalizedSnippet,
  wiremarkLanguageGuide,
} from "@/languages/wiremark-reference";

const LOCALES: readonly AppLocale[] = ["ru", "en"];

function expectCopy(key: LocaleKey): void {
  for (const locale of LOCALES) {
    expect(messagesByLocale[locale][key]?.trim().length).toBeGreaterThan(0);
  }
}

describe("wiremark language guide", () => {
  it("describes every diagram type and shows an example in both locales", () => {
    expect(wiremarkLanguageGuide.diagramTypes.map((type) => type.id)).toEqual([
      "login",
      "dashboard",
      "form",
      "settings",
      "product",
      "flow",
      "chrome",
    ]);

    for (const type of wiremarkLanguageGuide.diagramTypes) {
      expectCopy(type.titleKey);
      expectCopy(type.descriptionKey);
      for (const locale of LOCALES) {
        const example = resolveLocalizedSnippet(type.example, locale);
        expect(example).toContain("Wireframe");
      }
    }
  });

  it("gives every keyword a description and an example that uses it", () => {
    const ids = new Set<string>();

    expectCopy(wiremarkLanguageGuide.typesLeadKey);
    expectCopy(wiremarkLanguageGuide.keywordsLeadKey);

    for (const group of wiremarkLanguageGuide.keywordGroups) {
      expectCopy(group.titleKey);
      expect(group.keywords.length).toBeGreaterThan(0);

      for (const keyword of group.keywords) {
        expect(ids.has(keyword.id)).toBe(false);
        ids.add(keyword.id);
        expect(keyword.name.trim().length).toBeGreaterThan(0);
        expectCopy(keyword.descriptionKey);

        for (const locale of LOCALES) {
          const example = resolveLocalizedSnippet(keyword.example, locale);
          expect(example).toContain(keyword.exampleIncludes);
        }
      }
    }

    expect(ids.size).toBeGreaterThanOrEqual(40);
  });
});
