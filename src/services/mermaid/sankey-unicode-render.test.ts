// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { prepareMermaidSankeyUnicode } from "@/services/mermaid/sankey-unicode";
import { loadMermaid } from "@/services/mermaid/mermaid-loader";

beforeAll(() => {
  // jsdom не считает раскладку SVG, а Mermaid вызывает getBBox в конце отрисовки.
  const graphics = SVGElement.prototype as SVGElement & {
    getBBox?: () => DOMRect;
  };
  if (typeof graphics.getBBox !== "function") {
    graphics.getBBox = () =>
      ({
        x: 0,
        y: 0,
        width: 160,
        height: 24,
        top: 0,
        left: 0,
        right: 160,
        bottom: 24,
        toJSON: () => ({}),
      }) as DOMRect;
  }
});

const SOURCE = `---
title: Воронка
config:
  sankey:
    prefix: "₽"
    nodeColors:
      Реклама: "#c62828"
      Сайт: "#1565c0"
---
sankey-beta
Реклама,Сайт,90
Прямой,Сайт,40
Сайт,"Отказ, без клика",25
Сайт,太阳能,15
`;

describe("sankey unicode render", () => {
  it("draws non-Latin labels through Mermaid", async () => {
    const prep = prepareMermaidSankeyUnicode(SOURCE);
    const mermaid = await loadMermaid();
    mermaid.initialize({ startOnLoad: false, securityLevel: "strict" });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const rendered = await mermaid.render("sankey-unicode-probe", prep.source, container);
    const svg = prep.restore(rendered.svg);
    container.remove();

    expect(svg).toContain("Реклама");
    expect(svg).toContain("Сайт");
    expect(svg).toContain("Прямой");
    expect(svg).toContain("Отказ, без клика");
    expect(svg).toContain("太阳能");
    expect(svg).toContain("₽90");
    expect(svg).not.toMatch(/sknu\d/);
    expect(svg).toMatch(/fill="#c62828"|fill:#c62828/i);
    expect(svg).toMatch(/fill="#1565c0"|fill:#1565c0/i);
  });
});
