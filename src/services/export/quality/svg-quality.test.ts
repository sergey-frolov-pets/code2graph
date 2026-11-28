// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { checkSvgQuality, QUALITY_CHECKS } from "./svg-quality";
import type { QualityReport } from "./types";

function svg(body: string, viewBox = "0 0 200 100"): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="200" height="100">${body}</svg>`;
}

function check(report: QualityReport, id: string) {
  const found = report.checks.find((item) => item.id === id);
  if (!found) {
    throw new Error(`проверка ${id} не выполнялась`);
  }
  return found;
}

/** Узел с подписью внутри — так выглядят PlantUML и Mermaid. */
const NODE = (x: number, y: number, label: string) =>
  `<rect x="${x}" y="${y}" width="80" height="40" fill="#fff" stroke="#000"/>` +
  `<text x="${x + 10}" y="${y + 25}" font-size="12">${label}</text>`;

const HEALTHY = svg(
  `${NODE(10, 10, "Начало")}${NODE(110, 50, "Конец")}` +
    `<line x1="90" y1="30" x2="110" y2="70" stroke="#000"/>` +
    `<text x="88" y="48" font-size="10">да</text>`,
);

describe("checkSvgQuality: агрегат", () => {
  it("здоровая диаграмма проходит без предупреждений", () => {
    const report = checkSvgQuality(HEALTHY);

    expect(report.passed).toBe(true);
    expect(report.warnings).toBe(0);
    expect(report.score).toBe(`${QUALITY_CHECKS.length}/${QUALITY_CHECKS.length}`);
    expect(report.error).toBeUndefined();
  });

  it("пустая строка — invalid-svg, без исключения", () => {
    const report = checkSvgQuality("   ");

    expect(report.passed).toBe(false);
    expect(report.error).toBe("invalid-svg");
    expect(report.checks).toEqual([]);
  });

  it("битый SVG и не-SVG — invalid-svg", () => {
    expect(checkSvgQuality("<svg><text>a</text>").error).toBe("invalid-svg");
    expect(checkSvgQuality("<div>x</div>").error).toBe("invalid-svg");
  });

  it("отчёт стабилен: два прогона одного SVG совпадают", () => {
    const first = checkSvgQuality(HEALTHY);
    const second = checkSvgQuality(HEALTHY);

    expect(second).toEqual(first);
  });

  it("агрегат: fail + warn → passed:false, score считает только pass", () => {
    const broken = svg(
      `<rect id="dup" x="0" y="0" width="10" height="10"/>` +
        `<rect id="dup" x="20" y="0" width="10" height="10"/>` +
        `<text x="30" y="80" fill="#999">серый</text>`,
    );
    const report = checkSvgQuality(broken);

    expect(report.passed).toBe(false);
    expect(check(report, "duplicate-ids").status).toBe("fail");
    expect(check(report, "contrast").status).toBe("warn");
    expect(report.warnings).toBe(1);
    expect(report.score).toBe("4/6");
  });
});

describe("duplicate-ids", () => {
  it("ловит повтор и считает его", () => {
    const report = checkSvgQuality(
      svg(`<rect id="a" width="10" height="10"/><rect id="a" x="20" width="10" height="10"/>`),
    );

    const result = check(report, "duplicate-ids");
    expect(result.status).toBe("fail");
    expect(result.count).toBe(1);
    expect(result.message).toContain("Повторяющиеся id: 1");
    expect(result.details?.[0].refs?.[0]).toBe("a ×2");
  });

  it("уникальные id проходят", () => {
    const report = checkSvgQuality(
      svg(`<rect id="a" width="10" height="10"/><rect id="b" x="20" width="10" height="10"/>`),
    );

    expect(check(report, "duplicate-ids").status).toBe("pass");
    expect(check(report, "duplicate-ids").message).toBe("Повторяющихся id нет");
  });
});

describe("contrast", () => {
  it("#999 на белом — предупреждение с коэффициентом", () => {
    const report = checkSvgQuality(svg(`<text x="10" y="20" fill="#999">серый</text>`));
    const result = check(report, "contrast");

    expect(result.status).toBe("warn");
    expect(result.count).toBe(1);
    expect(result.details?.[0].refs?.[1]).toMatch(/^\d+\.\d\d:1$/);
  });

  it("контраст к подложке узла, а не к белому холсту", () => {
    const report = checkSvgQuality(
      svg(
        `<rect x="0" y="0" width="120" height="40" fill="#222"/>` +
          `<text x="10" y="25" fill="#333">тёмное на тёмном</text>`,
      ),
    );

    expect(check(report, "contrast").status).toBe("warn");
  });

  it("порог из настроек: 2.5 пропускает #999", () => {
    const report = checkSvgQuality(svg(`<text x="10" y="20" fill="#999">серый</text>`), {
      minContrast: 2.5,
    });

    expect(check(report, "contrast").status).toBe("pass");
  });
});

describe("clipping", () => {
  it("текст за правым краем холста — fail", () => {
    const report = checkSvgQuality(
      svg(`<text x="150" y="50">За пределами холста</text>`),
    );

    const result = check(report, "clipping");
    expect(result.status).toBe("fail");
    expect(result.count).toBe(1);
    expect(report.passed).toBe(false);
  });

  it("текст внутри холста проходит", () => {
    const report = checkSvgQuality(svg(`<text x="10" y="50">внутри</text>`));

    expect(check(report, "clipping").status).toBe("pass");
  });
});

describe("overlap", () => {
  it("две подписи в одном месте — fail", () => {
    const report = checkSvgQuality(
      svg(`<text x="20" y="50">первая</text><text x="22" y="52">вторая</text>`),
    );

    const result = check(report, "overlap");
    expect(result.status).toBe("fail");
    expect(result.count).toBe(1);
    expect(result.details?.[0].refs).toEqual(["первая", "вторая"]);
  });

  it("соседние подписи с зазором проходят", () => {
    const report = checkSvgQuality(
      svg(`<text x="10" y="20">первая</text><text x="10" y="60">вторая</text>`),
    );

    expect(check(report, "overlap").status).toBe("pass");
  });
});

describe("edge-crossing", () => {
  it("связь проходит сквозь чужой узел — warn", () => {
    const report = checkSvgQuality(
      svg(
        `<rect x="80" y="30" width="40" height="40" fill="#fff" stroke="#000"/>` +
          `<line x1="10" y1="50" x2="190" y2="50" stroke="#000"/>`,
      ),
    );

    const result = check(report, "edge-crossing");
    expect(result.status).toBe("warn");
    expect(result.count).toBe(1);
    expect(result.details?.[0].refs?.[1]).toBe("rect");
  });

  it("линия, выходящая из своего узла, не считается пересечением", () => {
    const report = checkSvgQuality(
      svg(
        `<rect x="80" y="30" width="40" height="40" fill="#fff"/>` +
          `<line x1="100" y1="70" x2="100" y2="95"/>`,
      ),
    );

    expect(check(report, "edge-crossing").status).toBe("pass");
  });
});

describe("label-distance", () => {
  it("подпись в 120 px от связи — warn", () => {
    const report = checkSvgQuality(
      svg(`<line x1="10" y1="10" x2="10" y2="90"/><text x="150" y="50">далеко</text>`),
    );

    const result = check(report, "label-distance");
    expect(result.status).toBe("warn");
    expect(result.count).toBe(1);
    expect(result.details?.[0].refs?.[1]).toMatch(/\d+ px/);
  });

  it("порог из настроек: 60 px пропускает подпись рядом со связью", () => {
    const report = checkSvgQuality(
      svg(`<line x1="10" y1="10" x2="10" y2="90"/><text x="30" y="50">рядом</text>`),
      { labelDistancePx: 60 },
    );

    expect(check(report, "label-distance").status).toBe("pass");
  });

  it("подпись внутри узла не проверяется", () => {
    const report = checkSvgQuality(svg(`${NODE(10, 10, "Узел")}<line x1="150" y1="10" x2="150" y2="90"/>`));

    expect(check(report, "label-distance").status).toBe("pass");
  });
});
