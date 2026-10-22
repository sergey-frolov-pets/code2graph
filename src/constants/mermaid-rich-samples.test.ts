// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  MERMAID_SAMPLE_IDS,
  getMermaidSampleSource,
} from "@/constants/mermaid-sample-diagrams";
import { loadMermaid } from "@/services/mermaid/mermaid-loader";

describe("mermaid samples render", () => {
  it("parses every enriched sample in both locales", async () => {
    const mermaid = await loadMermaid();
    mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });

    const failures: string[] = [];

    for (const id of MERMAID_SAMPLE_IDS) {
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
});
