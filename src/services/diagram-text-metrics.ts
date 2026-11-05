import { measureText } from "@/services/mermaid/ext/common";

/** Запас к оценке ширины, чтобы подпись оставалась внутри блока. */
export const DIAGRAM_TEXT_WIDTH_SAFETY = 1.08;

/** Насколько жирное начертание шире обычного. */
export const DIAGRAM_TEXT_BOLD_FACTOR = 1.08;

const DEFAULT_FONT_SIZE_PX = 16;
const EMPTY_BOX_WIDTH_PX = 8;
const ASCENT_EM = 0.8;
const HEIGHT_EM = 1.2;

export interface DiagramTextBox {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface CanvasTextMetrics {
  width: number;
  actualBoundingBoxAscent: number;
  actualBoundingBoxDescent: number;
  fontBoundingBoxAscent: number;
  fontBoundingBoxDescent: number;
}

function parseSize(raw: string | null | undefined): number | null {
  if (!raw) {
    return null;
  }

  const match = raw.trim().match(/^([\d.]+)(?:px)?$/i);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function isBoldToken(value: string): boolean {
  return /(?:^|\s)(?:bold|bolder|[6-9]00)(?:\s|$)/i.test(value);
}

export function parseCanvasFont(font: string): { sizePx: number; bold: boolean } {
  const sizeMatch = font.match(/([\d.]+)px/i);
  const sizePx = sizeMatch ? Number(sizeMatch[1]) : DEFAULT_FONT_SIZE_PX;
  return {
    sizePx: Number.isFinite(sizePx) && sizePx > 0 ? sizePx : DEFAULT_FONT_SIZE_PX,
    bold: isBoldToken(font),
  };
}

export function estimateTextWidthPx(text: string, sizePx: number, bold = false): number {
  if (!text) {
    return 0;
  }

  const weighted =
    measureText(text, sizePx) *
    (bold ? DIAGRAM_TEXT_BOLD_FACTOR : 1) *
    DIAGRAM_TEXT_WIDTH_SAFETY;
  return Math.max(1, weighted);
}

export function canvasTextMetrics(text: string, font: string): CanvasTextMetrics {
  const { sizePx, bold } = parseCanvasFont(font);
  const ascent = sizePx * ASCENT_EM;
  const descent = sizePx * (HEIGHT_EM - ASCENT_EM);
  return {
    width: estimateTextWidthPx(text, sizePx, bold),
    actualBoundingBoxAscent: ascent,
    actualBoundingBoxDescent: descent,
    fontBoundingBoxAscent: ascent,
    fontBoundingBoxDescent: descent,
  };
}

export function elementFontSizePx(element: Element): number {
  let current: Element | null = element;
  while (current) {
    const styled = current as HTMLElement;
    const parsed =
      parseSize(styled.style?.fontSize) ??
      parseSize(current.getAttribute?.("font-size"));
    if (parsed) {
      return parsed;
    }

    const computed = globalThis.getComputedStyle?.(current)?.fontSize;
    const fromComputed = parseSize(computed);
    if (fromComputed) {
      return fromComputed;
    }

    current = current.parentElement;
  }

  return DEFAULT_FONT_SIZE_PX;
}

export function elementIsBold(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    const styled = current as HTMLElement;
    const weight = styled.style?.fontWeight || current.getAttribute?.("font-weight") || "";
    if (weight && isBoldToken(weight)) {
      return true;
    }

    current = current.parentElement;
  }

  return false;
}

/** Размер подписи для jsdom, где нет настоящей раскладки шрифта. */
export function estimateElementTextBox(element: Element): DiagramTextBox {
  const text = element.textContent ?? "";
  const sizePx = elementFontSizePx(element);
  const width = text
    ? estimateTextWidthPx(text, sizePx, elementIsBold(element))
    : EMPTY_BOX_WIDTH_PX;
  const height = sizePx * HEIGHT_EM;
  const y = -sizePx * ASCENT_EM;
  return {
    x: 0,
    y,
    width,
    height,
    top: y,
    right: width,
    bottom: y + height,
    left: 0,
  };
}
