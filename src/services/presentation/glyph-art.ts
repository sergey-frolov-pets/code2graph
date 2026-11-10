import { PRESENTATION_FULL_CIRCLE, PRESENTATION_HALF_CIRCLE } from "@/services/presentation/constants";
import {
  POINTER_HAND_GLYPH,
  PRESENTATION_MARK_GLYPHS,
  type OverlayGlyph,
} from "@/services/presentation/glyph-data";
import { positiveBox, type OverlayBox } from "@/services/presentation/overlay-geometry";
import type { PresentationOverlay } from "@/services/presentation/types";

const MATRIX_PATTERN = /matrix\(\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)[\s,]+([-\d.eE+]+)\s*\)/;
const TRANSLATE_PATTERN = /translate\(\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)\s*\)/;
const TWO = 2;

export function overlayArtwork(overlay: PresentationOverlay): OverlayGlyph | null {
  if (overlay.shape === "arrow" && overlay.arrowForm === "pointer") {
    return POINTER_HAND_GLYPH;
  }
  if (overlay.shape === "mark") {
    return PRESENTATION_MARK_GLYPHS[overlay.mark];
  }
  return null;
}

export function artworkFitTransform(box: OverlayBox, glyph: OverlayGlyph): string {
  const placed = positiveBox(box);
  const [originX, originY, width, height] = glyph.viewBox;
  const scaleX = width === 0 ? 1 : placed.width / width;
  const scaleY = height === 0 ? 1 : placed.height / height;
  return `translate(${placed.x} ${placed.y}) scale(${scaleX} ${scaleY}) translate(${-originX} ${-originY})`;
}

export function rotationTransform(box: OverlayBox, rotation: number): string | undefined {
  if (rotation % PRESENTATION_FULL_CIRCLE === 0) {
    return undefined;
  }
  const placed = positiveBox(box);
  const centerX = placed.x + placed.width / TWO;
  const centerY = placed.y + placed.height / TWO;
  return `rotate(${rotation} ${centerX} ${centerY})`;
}

function applySvgTransform(context: CanvasRenderingContext2D, transform: string): void {
  const matrix = MATRIX_PATTERN.exec(transform);
  if (matrix) {
    context.transform(
      Number(matrix[1]),
      Number(matrix[2]),
      Number(matrix[3]),
      Number(matrix[4]),
      Number(matrix[5]),
      Number(matrix[6]),
    );
    return;
  }
  const translate = TRANSLATE_PATTERN.exec(transform);
  if (translate) {
    context.translate(Number(translate[1]), Number(translate[2]));
  }
}

export function paintArtwork(
  context: CanvasRenderingContext2D,
  box: OverlayBox,
  glyph: OverlayGlyph,
  rotation: number,
): void {
  const placed = positiveBox(box);
  const [originX, originY, width, height] = glyph.viewBox;
  const scaleX = width === 0 ? 1 : placed.width / width;
  const scaleY = height === 0 ? 1 : placed.height / height;
  const centerX = placed.x + placed.width / TWO;
  const centerY = placed.y + placed.height / TWO;
  context.save();
  if (rotation % PRESENTATION_FULL_CIRCLE !== 0) {
    context.translate(centerX, centerY);
    context.rotate((rotation * Math.PI) / PRESENTATION_HALF_CIRCLE);
    context.translate(-centerX, -centerY);
  }
  context.translate(placed.x, placed.y);
  context.scale(scaleX, scaleY);
  context.translate(-originX, -originY);
  if (glyph.transform) {
    applySvgTransform(context, glyph.transform);
  }
  for (const part of glyph.parts) {
    const path = new Path2D(part.d);
    if (part.fill !== "none") {
      context.fillStyle = part.fill;
      context.fill(path);
    }
    if (part.stroke !== "none" && part.strokeWidth > 0) {
      context.strokeStyle = part.stroke;
      context.lineWidth = part.strokeWidth;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.stroke(path);
    }
  }
  context.restore();
}
