import { describe, expect, it } from "vitest";
import {
  expandViewBox,
  fitPlantUmlSvgText,
  horizontalTextLimit,
} from "@/services/plantuml/plantuml-text-fit";

describe("horizontalTextLimit", () => {
  const shape = { x: 10, y: 20, width: 100, height: 40 };

  it("оставляет подпись, которая помещается в блок", () => {
    expect(horizontalTextLimit({
      anchor: "start",
      textX: 16,
      textWidth: 80,
      shape,
    })).toBeNull();
  });

  it("ограничивает строку, которая выходит за правый край", () => {
    expect(horizontalTextLimit({
      anchor: "start",
      textX: 16,
      textWidth: 120,
      shape,
    })).toBeCloseTo(91);
  });

  it("для выравнивания по центру берёт меньшую половину блока", () => {
    expect(horizontalTextLimit({
      anchor: "middle",
      textX: 40,
      textWidth: 80,
      shape,
    })).toBeCloseTo(54);
  });

  it("для выравнивания вправо меряет место слева от якоря", () => {
    expect(horizontalTextLimit({
      anchor: "end",
      textX: 100,
      textWidth: 120,
      shape,
    })).toBeCloseTo(87);
  });
});

describe("expandViewBox", () => {
  it("расширяет холст, когда заголовок вылезает за viewBox", () => {
    const expanded = expandViewBox(
      { x: 0, y: 0, width: 200, height: 100 },
      [{ x: -12, y: 4, width: 240, height: 16 }],
    );
    expect(expanded).toEqual({ x: -14, y: 0, width: 244, height: 100 });
  });

  it("не меняет холст, если текст уже внутри", () => {
    expect(expandViewBox(
      { x: 0, y: 0, width: 200, height: 100 },
      [{ x: 10, y: 10, width: 40, height: 16 }],
    )).toBeNull();
  });
});

describe("fitPlantUmlSvgText", () => {
  it("в среде без нативного getBBox возвращает SVG без правок", () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 20"><text x="2" y="14">Покупатель</text></svg>`;
    expect(fitPlantUmlSvgText(svg)).toBe(svg);
  });
});
