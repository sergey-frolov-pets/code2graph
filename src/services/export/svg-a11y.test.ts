// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applySvgAccessibility } from "@/services/export/svg-a11y";

function parse(markup: string): Document {
  return new DOMParser().parseFromString(markup, "image/svg+xml");
}

const PLAIN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">
  <rect x="10" y="10" width="80" height="40" fill="#ffffff" stroke="#333333"/>
  <text x="20" y="40">A</text>
</svg>`;

const ID_SVG = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 200 120">
  <defs>
    <linearGradient id="grad"><stop offset="0" stop-color="#fff"/></linearGradient>
    <clipPath id="clip"><rect x="0" y="0" width="10" height="10"/></clipPath>
    <marker id="arrow"><path d="M0,0 L4,0 L2,4 Z"/></marker>
    <filter id="blur"><feGaussianBlur stdDeviation="1"/></filter>
  </defs>
  <rect id="node1" x="10" y="10" width="80" height="40" fill="url(#grad)" clip-path="url(#clip)"/>
  <rect id="node2" x="100" y="10" width="80" height="40" filter="url(#blur)"/>
  <path d="M50,50 L50,80" marker-end="url(#arrow)"/>
  <use xlink:href="#node1" x="0" y="60"/>
  <a href="#node2"><text x="110" y="40">B</text></a>
</svg>`;

describe("applySvgAccessibility", () => {
  it("помечает корень role=img и aria-labelledby", () => {
    const { svg, report } = applySvgAccessibility(PLAIN_SVG, { title: "Схема заказа" });
    const root = parse(svg).documentElement;

    expect(report.applied).toBe(true);
    expect(root.getAttribute("role")).toBe("img");
    expect(root.getAttribute("aria-labelledby")).toBe(report.titleId);
    expect(parse(svg).querySelector(`#${report.titleId}`)?.textContent).toBe("Схема заказа");
  });

  it("ставит title первым ребёнком svg", () => {
    const { svg } = applySvgAccessibility(PLAIN_SVG, { title: "Схема" });
    const root = parse(svg).documentElement;

    expect(root.firstElementChild?.localName).toBe("title");
  });

  it("добавляет desc сразу за title и ссылается на оба id", () => {
    const { svg, report } = applySvgAccessibility(PLAIN_SVG, {
      title: "Схема",
      description: "Три узла и две связи",
    });
    const root = parse(svg).documentElement;
    const title = root.firstElementChild;
    const desc = title?.nextElementSibling;

    expect(desc?.localName).toBe("desc");
    expect(desc?.textContent).toBe("Три узла и две связи");
    expect(report.descriptionId).toBe(desc?.getAttribute("id"));
    expect(root.getAttribute("aria-labelledby")).toBe(`${report.titleId} ${report.descriptionId}`);
  });

  it("экранирует спецсимволы в заголовке", () => {
    const { svg } = applySvgAccessibility(PLAIN_SVG, { title: "A & B <x>" });
    const title = parse(svg).querySelector("title");

    expect(title?.textContent).toBe("A & B <x>");
    expect(svg).toContain("&amp;");
  });

  it("префиксует id и переписывает url(#id)", () => {
    const { svg, report } = applySvgAccessibility(ID_SVG, { title: "Схема", idPrefix: "p1" });

    expect(report.renamedIds).toBe(6);
    expect(svg).toContain('id="p1-node1"');
    expect(svg).toContain("url(#p1-grad)");
    expect(svg).toContain("url(#p1-clip)");
    expect(svg).toContain("url(#p1-arrow)");
    expect(svg).toContain("url(#p1-blur)");
    expect(svg).not.toMatch(/url\(#(?:node1|grad|clip|arrow|blur)\)/);
  });

  it("переписывает href и xlink:href", () => {
    const { svg } = applySvgAccessibility(ID_SVG, { title: "Схема", idPrefix: "p2" });
    const doc = parse(svg);

    expect(doc.querySelector("use")?.getAttribute("xlink:href")).toBe("#p2-node1");
    expect(doc.querySelector("a")?.getAttribute("href")).toBe("#p2-node2");
  });

  it("переписывает ссылки внутри style", () => {
    const { svg } = applySvgAccessibility(
      `<svg xmlns="http://www.w3.org/2000/svg"><style>#n1 { fill: url(#g1); }</style><defs><linearGradient id="g1"/></defs><rect id="n1"/></svg>`,
      { title: "Схема", idPrefix: "p3" },
    );

    expect(svg).toContain("#p3-n1 { fill: url(#p3-g1); }");
  });

  it("две разные диаграммы рядом не пересекаются по id", () => {
    const first = applySvgAccessibility(ID_SVG, { title: "Первая" }).svg;
    const second = applySvgAccessibility(`${ID_SVG}<circle cx="5" cy="5" r="2"/>`, {
      title: "Вторая",
    }).svg;
    const idsOf = (markup: string) =>
      Array.from(parse(markup).querySelectorAll("[id]")).map((el) => el.getAttribute("id") ?? "");

    const firstIds = new Set(idsOf(first));
    const shared = idsOf(second).filter((id) => firstIds.has(id));

    expect(shared).toEqual([]);
  });

  it("одинаковые диаграммы изолируются явным idPrefix", () => {
    const first = applySvgAccessibility(ID_SVG, { title: "Схема", idPrefix: "tab1" }).svg;
    const second = applySvgAccessibility(ID_SVG, { title: "Схема", idPrefix: "tab2" }).svg;
    const idsOf = (markup: string) =>
      Array.from(parse(markup).querySelectorAll("[id]")).map((el) => el.getAttribute("id") ?? "");

    const firstIds = new Set(idsOf(first));
    const shared = idsOf(second).filter((id) => firstIds.has(id));

    expect(shared).toEqual([]);
  });

  it("идемпотентна: повторный вызов ничего не меняет", () => {
    const once = applySvgAccessibility(PLAIN_SVG, { title: "Схема" });
    const twice = applySvgAccessibility(once.svg, { title: "Схема" });

    expect(twice.report.applied).toBe(false);
    expect(twice.svg).toBe(once.svg);
  });

  it("пустой title подменяется фолбэком", () => {
    const { svg, report } = applySvgAccessibility(PLAIN_SVG, { title: "   " });
    const title = parse(svg).querySelector(`#${report.titleId}`);

    expect(title?.textContent).toBe("Диаграмма");
  });

  it("берёт локализованный fallbackTitle, если title пуст", () => {
    const { svg, report } = applySvgAccessibility(PLAIN_SVG, { fallbackTitle: "Diagram" });

    expect(parse(svg).querySelector(`#${report.titleId}`)?.textContent).toBe("Diagram");
  });

  it("не создаёт desc, если описание не передано", () => {
    const { svg, report } = applySvgAccessibility(PLAIN_SVG, { title: "Схема" });

    expect(report.descriptionId).toBe("");
    expect(parse(svg).querySelector("desc")).toBeNull();
  });

  it("aria-labelledby ссылается на существующие id", () => {
    const { svg } = applySvgAccessibility(ID_SVG, { title: "Схема", description: "Описание" });
    const doc = parse(svg);
    const ids = new Set(
      Array.from(doc.querySelectorAll("[id]")).map((el) => el.getAttribute("id") ?? ""),
    );
    const targets = (doc.documentElement.getAttribute("aria-labelledby") ?? "").split(" ");

    expect(targets.length).toBe(2);
    expect(targets.every((id) => ids.has(id))).toBe(true);
  });

  it("не падает на SVG без viewBox и на пустой строке", () => {
    expect(() => applySvgAccessibility("<svg xmlns='http://www.w3.org/2000/svg'><rect/></svg>", {
      title: "Без рамки",
    })).not.toThrow();

    const empty = applySvgAccessibility("", { title: "Пусто" });
    expect(empty.report.applied).toBe(false);
    expect(empty.svg).toBe("");
  });
});
