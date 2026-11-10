// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "@/constants/i18n";
import { LANGUAGE_PRIMERS, primerExample } from "@/languages/primer";
import { validateExtensionSource } from "@/services/mermaid/ext";
import { loadMermaid } from "@/services/mermaid/mermaid-loader";
import { prepareMermaidSankeyUnicode } from "@/services/mermaid/sankey-unicode";
import { isMermaidExtDeclaration } from "@/utils/mermaid-syntax";

describe("mermaid language page examples", () => {
  it("parses every primer diagram in both locales", async () => {
    const mermaid = await loadMermaid();
    mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });

    const primer = LANGUAGE_PRIMERS.mermaid;
    const diagrams = [...primer.types, ...(primer.extTypes ?? [])];
    const failures: string[] = [];

    for (const diagramType of diagrams) {
      for (const locale of SUPPORTED_LOCALES) {
        const source = primerExample(diagramType.example, locale);
        const label = `${diagramType.id}/${locale}`;
        if (isMermaidExtDeclaration(source)) {
          const result = validateExtensionSource(source);
          if (!result?.valid) {
            failures.push(`${label}: ${result?.issues[0]?.message ?? "тип не разобран"}`);
          }
          continue;
        }

        try {
          const parseSource = prepareMermaidSankeyUnicode(source).source;
          await mermaid.parse(parseSource);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          failures.push(`${label}: ${message.split("\n")[0]}`);
        }
      }
    }

    expect(failures).toEqual([]);
  }, 60_000);
});
