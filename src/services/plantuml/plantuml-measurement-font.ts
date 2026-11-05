import type { DiagramTypographyInput } from "@/services/diagram-typography";
import { resolveDiagramTypography } from "@/services/diagram-typography";

/**
 * Оффлайн-движок измеряет подписи тем шрифтом, который записан в исходнике.
 * Окно «Внешний вид» подменяет шрифт уже после раскладки, поэтому блоки
 * остаются узкими, а текст вылезает наружу или обрезается viewBox.
 * Перед рендером в исходник дописывается тот же стек, вес и начертание.
 */

const LITERAL_DIAGRAM_START =
  /@(?:startditaa|startdot|startmath|startlatex|startregex|startebnf)\b/i;
const END_MARKER_LINE = /^[ \t]*@end[a-z0-9]+.*$/im;

const NORMAL_MEASURED_WEIGHT = "400";
const BOLD_MEASURED_WEIGHT = "700";
const BOLD_UI_WEIGHTS = new Set(["600", "700"]);

const ESTIMATE_BOLD_FACTOR = 1.08;
const ESTIMATE_DIGIT_EM = 0.56;
const ESTIMATE_LOWER_LATIN_EM = 0.52;
const ESTIMATE_UPPER_LATIN_EM = 0.66;
const ESTIMATE_LOWER_CYRILLIC_EM = 0.54;
const ESTIMATE_UPPER_CYRILLIC_EM = 0.68;
const ESTIMATE_UNKNOWN_EM = 0.58;

const ESTIMATE_CHAR_EM: Record<string, number> = {
  " ": 0.28,
  ".": 0.28,
  ",": 0.28,
  ":": 0.28,
  ";": 0.28,
  "'": 0.22,
  "|": 0.25,
  "!": 0.32,
  i: 0.25,
  l: 0.25,
  I: 0.32,
  "«": 0.45,
  "»": 0.45,
  "—": 1,
  "–": 0.5,
};

export function plantUmlMeasuredWeight(weight: string | undefined): string | undefined {
  if (!weight) return undefined;
  return BOLD_UI_WEIGHTS.has(weight) ? BOLD_MEASURED_WEIGHT : NORMAL_MEASURED_WEIGHT;
}

/**
 * Грубая ширина подписи для окружений без Canvas (генерация миниатюр).
 * В браузере раскладку считает сам PlantUML через measureText.
 */
export function estimateDiagramTextWidth(
  text: string,
  fontSize: number,
  bold = false,
): number {
  if (!text || fontSize <= 0) return 0;
  let em = 0;
  for (const char of text) {
    em += glyphEm(char);
  }
  return em * fontSize * (bold ? ESTIMATE_BOLD_FACTOR : 1);
}

function glyphEm(char: string): number {
  const known = ESTIMATE_CHAR_EM[char];
  if (known !== undefined) return known;
  if (char >= "0" && char <= "9") return ESTIMATE_DIGIT_EM;
  if (/[a-z]/.test(char)) return ESTIMATE_LOWER_LATIN_EM;
  if (/[A-Z]/.test(char)) return ESTIMATE_UPPER_LATIN_EM;
  if (/[а-яё]/.test(char)) return ESTIMATE_LOWER_CYRILLIC_EM;
  if (/[А-ЯЁ]/.test(char)) return ESTIMATE_UPPER_CYRILLIC_EM;
  return ESTIMATE_UNKNOWN_EM;
}

export function buildPlantUmlMeasurementBlock(
  input: DiagramTypographyInput,
): string | null {
  const typography = resolveDiagramTypography(input);
  if (!typography?.stack) return null;

  const fontStyle = typography.fontStyle === "italic" ? "italic" : "normal";
  const weight = plantUmlMeasuredWeight(typography.weight);
  const lines = [
    `skinparam defaultFontName ${typography.stack}`,
    "<style>",
    "root {",
    `  FontName ${typography.stack}`,
    `  FontStyle ${fontStyle}`,
  ];
  if (weight) {
    lines.push(`  FontWeight ${weight}`);
  }
  lines.push("}", "</style>");
  return lines.join("\n");
}

export function plantUmlMeasuresItalic(input: DiagramTypographyInput): boolean {
  const typography = resolveDiagramTypography(input);
  return typography?.fontStyle === "italic" && Boolean(typography.stack);
}

export function applyPlantUmlMeasurementFont(
  source: string,
  input: DiagramTypographyInput,
): string {
  const block = buildPlantUmlMeasurementBlock(input);
  if (!block || LITERAL_DIAGRAM_START.test(source)) return source;

  const end = END_MARKER_LINE.exec(source);
  if (!end || end.index === undefined) {
    return `${source.replace(/\s*$/, "")}\n${block}\n`;
  }

  return `${source.slice(0, end.index)}${block}\n${source.slice(end.index)}`;
}

export async function withItalicTextMeasurement<T>(
  italic: boolean,
  task: () => Promise<T>,
): Promise<T> {
  if (!italic || typeof CanvasRenderingContext2D === "undefined") {
    return task();
  }

  const original = CanvasRenderingContext2D.prototype.measureText;
  CanvasRenderingContext2D.prototype.measureText = function measureItalic(
    text: string,
  ) {
    const previous = this.font;
    if (!/\bitalic\b/i.test(previous)) {
      this.font = `italic ${previous}`;
    }
    try {
      return original.call(this, text);
    } finally {
      this.font = previous;
    }
  };

  try {
    return await task();
  } finally {
    CanvasRenderingContext2D.prototype.measureText = original;
  }
}
