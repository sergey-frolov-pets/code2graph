// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  MERMAID_EXT_SAMPLE_IDS,
  MERMAID_EXT_SAMPLE_NOTICE,
  MERMAID_SAMPLE_IDS,
  getMermaidSampleSource,
  isMermaidExtSampleId,
} from "@/constants/mermaid-sample-diagrams";
import { loadMermaid } from "@/services/mermaid/mermaid-loader";
import { validateExtensionSource } from "@/services/mermaid/ext";

describe("mermaid samples render", () => {
  it("parses every enriched sample in both locales", async () => {
    const mermaid = await loadMermaid();
    mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });

    const failures: string[] = [];

    for (const id of MERMAID_SAMPLE_IDS) {
      // Типы расширения штатный Mermaid не знает — их проверяет ext-парсер.
      if (isMermaidExtSampleId(id)) continue;

      for (const locale of ["en", "ru"] as const) {
        const source = getMermaidSampleSource(id, locale);
        try {
          await mermaid.parse(source);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push(`${id}/${locale}: ${message.split("\n")[0]}`);
        }
      }
    }

    expect(failures).toEqual([]);
  }, 60_000);

  it("parses every extension sample in both locales", () => {
    const failures: string[] = [];

    for (const id of MERMAID_EXT_SAMPLE_IDS) {
      for (const locale of ["en", "ru"] as const) {
        const source = getMermaidSampleSource(id, locale);
        if (!source.startsWith(`${MERMAID_EXT_SAMPLE_NOTICE[locale]}\n`)) {
          failures.push(`${id}/${locale}: нет комментария про расширение Mermaid`);
          continue;
        }
        const result = validateExtensionSource(source);
        if (!result) {
          failures.push(`${id}/${locale}: тип не распознан как расширение`);
          continue;
        }
        if (!result.valid) {
          failures.push(`${id}/${locale}: ${result.issues[0]?.message ?? "ошибка"}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
