import { describe, expect, it } from "vitest";
import { getMermaidSampleSource } from "@/constants/mermaid-sample-diagrams";
import { parseMermaidSankeyCsvLine } from "@/services/conversion/emit/mermaid-emit-utils";
import { prepareMermaidSankeyUnicode } from "@/services/mermaid/sankey-unicode";

const SANKEY_TEXTDATA = /^[\u0020-\u0021\u0023-\u002B\u002D-\u007E]*$/;

function expectLexerSafe(source: string): void {
  for (const line of source.split(/\r?\n/)) {
    const flow = parseMermaidSankeyCsvLine(line);
    if (!flow) {
      continue;
    }
    expect(flow.source, line).toMatch(SANKEY_TEXTDATA);
    expect(flow.target, line).toMatch(SANKEY_TEXTDATA);
  }
}

describe("prepareMermaidSankeyUnicode", () => {
  it("leaves a flowchart and an ASCII sankey untouched", () => {
    const flow = "flowchart TD\n  A[Реклама] --> B[Сайт]";
    const flowPrep = prepareMermaidSankeyUnicode(flow);
    expect(flowPrep.source).toBe(flow);
    expect(flowPrep.restore("<svg><text>Реклама</text></svg>")).toBe(
      "<svg><text>Реклама</text></svg>",
    );

    const sankey = 'sankey-beta\nAds,Site,90\nSite,"Bounce, no click",40\n';
    const sankeyPrep = prepareMermaidSankeyUnicode(sankey);
    expect(sankeyPrep.source).toBe(sankey);

    for (const locale of ["ru", "en"] as const) {
      const sample = getMermaidSampleSource("sankey", locale);
      expect(prepareMermaidSankeyUnicode(sample).source).toBe(sample);
    }
  });

  it("aliases non-Latin labels and restores them in SVG text", () => {
    const source = `---
title: Воронка
config:
  sankey:
    prefix: "₽"
    suffix: " шт"
    nodeColors:
      "Реклама": "#f00"
      Сайт: "#0f0"
---
sankey-beta
%% комментарий Реклама остаётся
Реклама,Сайт,90
Сайт,"Отказ, без клика",10.50
Café,太阳能,3
%%{init: {'sankey': {'nodeColors': {'Реклама': '#123'}}} }%%
`;
    const prep = prepareMermaidSankeyUnicode(source);

    expect(prep.source).toContain("title: Воронка");
    expect(prep.source).toContain('prefix: "₽"');
    expect(prep.source).toContain('suffix: " шт"');
    expect(prep.source).toContain("%% комментарий Реклама остаётся");
    expect(prep.source).toContain("10.50");
    expect(prep.source).not.toMatch(/^Реклама,/m);
    expect(prep.source).not.toContain('"Отказ, без клика"');
    expect(prep.source).not.toContain("太阳能");
    expect(prep.source).not.toContain("Café");
    expectLexerSafe(prep.source);

    const colorBlock = prep.source.slice(
      prep.source.indexOf("nodeColors:"),
      prep.source.indexOf("sankey-beta"),
    );
    expect(colorBlock).not.toContain("Реклама");
    expect(colorBlock).not.toContain("Сайт");
    expect(prep.source).toContain("#f00");
    expect(prep.source).toContain("#0f0");
    expect(prep.source).not.toContain("{'Реклама':");

    const labels = new Map<string, string>();
    for (const line of prep.source.split(/\r?\n/)) {
      const flow = parseMermaidSankeyCsvLine(line);
      if (!flow) {
        continue;
      }
      labels.set(flow.source, flow.source);
      labels.set(flow.target, flow.target);
    }
    const svg = `<svg viewBox="0 0 600 400">${[...labels.keys()]
      .map((alias) => `<text class="node">${alias}</text>`)
      .join("")}</svg>`;
    const restored = prep.restore(svg);

    expect(restored).toContain("Реклама");
    expect(restored).toContain("Сайт");
    expect(restored).toContain("Отказ, без клика");
    expect(restored).toContain("Café");
    expect(restored).toContain("太阳能");
    expect(restored).not.toMatch(/sknu\d/);
  });

  it("escapes restored labels and keeps an ASCII id that looks like an alias", () => {
    const source = "sankey-beta\nsknu0001,Р&Д,5\n价格<100,Сайт,2\n";
    const prep = prepareMermaidSankeyUnicode(source);
    expectLexerSafe(prep.source);
    expect(prep.source).toContain("sknu0001,");

    const flows = prep.source
      .split(/\r?\n/)
      .map((line) => parseMermaidSankeyCsvLine(line))
      .filter((flow) => flow !== null);
    const svg = flows
      .map((flow) => `<text>${flow.source}</text><text>${flow.target}</text>`)
      .join("");
    const restored = prep.restore(`<svg>${svg}</svg>`);

    expect(restored).toContain("sknu0001");
    expect(restored).toContain("Р&amp;Д");
    expect(restored).toContain("价格&lt;100");
    expect(restored).toContain("Сайт");
    expect(restored).not.toContain("Р&Д");
    expect(restored).not.toContain("价格<100");
  });
});
