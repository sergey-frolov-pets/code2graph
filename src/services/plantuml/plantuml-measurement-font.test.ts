import { describe, expect, it } from "vitest";
import {
  applyPlantUmlMeasurementFont,
  estimateDiagramTextWidth,
  plantUmlMeasuredWeight,
} from "@/services/plantuml/plantuml-measurement-font";

const SANS = {
  fontFamily: "sans",
  fontWeight: "400",
  fontStyle: "normal",
} as const;

describe("plantUmlMeasuredWeight", () => {
  it("считает обычный и средний вес как normal, а полужирный и жирный как bold", () => {
    expect(plantUmlMeasuredWeight("400")).toBe("400");
    expect(plantUmlMeasuredWeight("500")).toBe("400");
    expect(plantUmlMeasuredWeight("600")).toBe("700");
    expect(plantUmlMeasuredWeight("700")).toBe("700");
    expect(plantUmlMeasuredWeight(undefined)).toBeUndefined();
  });
});

describe("applyPlantUmlMeasurementFont", () => {
  it("дописывает стек шрифта перед @enduml, чтобы раскладка совпала с подписью", () => {
    const source = "@startuml\nactor Покупатель\n@enduml\n";
    const result = applyPlantUmlMeasurementFont(source, {
      ...SANS,
      fontWeight: "600",
      fontStyle: "italic",
    });

    expect(result.startsWith("@startuml\nactor Покупатель\n")).toBe(true);
    expect(result).toContain("skinparam defaultFontName system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif");
    expect(result).toContain("FontStyle italic");
    expect(result).toContain("FontWeight 700");
    expect(result.trimEnd().endsWith("@enduml")).toBe(true);
  });

  it("не навязывает вес, если его не задали", () => {
    const result = applyPlantUmlMeasurementFont("@startuml\n@enduml", {
      fontFamily: "mono",
    });
    expect(result).toContain("FontName 'SFMono-Regular'");
    expect(result).not.toContain("FontWeight");
  });

  it("не трогает диаграммы, где лишние строки становятся содержимым", () => {
    const source = "@startditaa\n+---+\n| A |\n+---+\n@endditaa";
    expect(applyPlantUmlMeasurementFont(source, SANS)).toBe(source);
  });

  it("оставляет исходник без известного шрифта как есть", () => {
    const source = "@startuml\n@enduml";
    expect(applyPlantUmlMeasurementFont(source, { fontFamily: "papyrus" })).toBe(source);
  });
});

describe("estimateDiagramTextWidth", () => {
  it("кириллица шире латиницы той же длины, жирный шире обычного", () => {
    const latin = estimateDiagramTextWidth("privet", 14);
    const cyrillic = estimateDiagramTextWidth("привет", 14);
    expect(cyrillic).toBeGreaterThan(latin);
    expect(estimateDiagramTextWidth("привет", 14, true)).toBeGreaterThan(cyrillic);
    expect(estimateDiagramTextWidth("", 14)).toBe(0);
  });
});
