import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { effectVisualAt, type EffectVisual } from "@/services/presentation/effects";
import { overlayArtwork, paintArtwork } from "@/services/presentation/glyph-art";
import { overlayCssColor } from "@/services/presentation/overlay-color";
import {
  overlayTextFontSize,
  overlayTextLinePlacements,
} from "@/services/presentation/overlay-text";
import {
  blockArrowPath,
  lineArrowPath,
  overlayOutline,
  overlayRotates,
  positiveBox,
} from "@/services/presentation/overlay-geometry";
import {
  PRESENTATION_FULL_CIRCLE,
  PRESENTATION_HALF_CIRCLE,
  PRESENTATION_GIF_FALLBACK_BACKGROUND,
  PRESENTATION_GIF_PALETTE_SIZE,
} from "@/services/presentation/constants";
import {
  gifFrameDelaysMs,
  gifOutputSize,
  gifScenePlacement,
  samplePresentationGifFrames,
  type PresentationGifFrame,
} from "@/services/presentation/gif-timeline";
import type {
  NormPoint,
  PresentationOverlay,
  PresentationTrack,
  Viewpoint,
} from "@/services/presentation/types";
import { isTransparentBackground } from "@/services/export/svg-background";
import { parseSvgCssSize } from "@/services/export/svg-geometry";
import { loadSvgDocumentImage } from "@/services/export/svg-raster-source";
import { LocalizedAppError } from "@/utils/localized-app-error";

const GIF_MIME_TYPE = "image/gif";
const ARROW_HEAD_LENGTH = 12;
const TEXT_FONT_FAMILY = "sans-serif";

export interface PresentationGifTheme {
  background: string;
  accent: string;
  surface: string;
  text: string;
}

export interface PresentationGifSource {
  svg: string;
  /** Dropped picture shown under the diagram. Empty when the diagram has no frame. */
  frameHref?: string | null;
  track: PresentationTrack;
  showOverlays: boolean;
  imageWidth: number;
  imageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  theme: PresentationGifTheme;
}

interface ScreenPoint {
  x: number;
  y: number;
}

function loadFrameImage(href: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = href;
  });
}

function toScreen(
  point: NormPoint,
  panX: number,
  panY: number,
  scale: number,
  imageWidth: number,
  imageHeight: number,
): ScreenPoint {
  return {
    x: panX + point.x * imageWidth * scale,
    y: panY + point.y * imageHeight * scale,
  };
}

function screenBox(
  overlay: PresentationOverlay,
  panX: number,
  panY: number,
  scale: number,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number; width: number; height: number } {
  const origin = toScreen(overlay, panX, panY, scale, imageWidth, imageHeight);
  const corner = toScreen(
    { x: overlay.x + overlay.width, y: overlay.y + overlay.height },
    panX,
    panY,
    scale,
    imageWidth,
    imageHeight,
  );
  return {
    x: origin.x,
    y: origin.y,
    width: corner.x - origin.x,
    height: corner.y - origin.y,
  };
}

function drawArrowHead(
  context: CanvasRenderingContext2D,
  tip: ScreenPoint,
  toward: ScreenPoint,
): void {
  const angle = Math.atan2(tip.y - toward.y, tip.x - toward.x);
  context.save();
  context.translate(tip.x, tip.y);
  context.rotate(angle);
  context.beginPath();
  context.moveTo(0, 0);
  context.lineTo(-ARROW_HEAD_LENGTH, ARROW_HEAD_LENGTH * 0.45);
  context.lineTo(-ARROW_HEAD_LENGTH, -ARROW_HEAD_LENGTH * 0.45);
  context.closePath();
  context.fill();
  context.restore();
}

function drawArrow(
  context: CanvasRenderingContext2D,
  overlay: PresentationOverlay,
  panX: number,
  panY: number,
  scale: number,
  imageWidth: number,
  imageHeight: number,
): void {
  const start = toScreen(overlay, panX, panY, scale, imageWidth, imageHeight);
  const end = toScreen(
    { x: overlay.x + overlay.width, y: overlay.y + overlay.height },
    panX,
    panY,
    scale,
    imageWidth,
    imageHeight,
  );
  const path = new Path2D(lineArrowPath(
    { x: start.x, y: start.y, width: end.x - start.x, height: end.y - start.y },
    overlay.arrowKind,
  ));
  context.stroke(path);

  const showEnd = overlay.arrowHead === "end" || overlay.arrowHead === "both";
  const showStart = overlay.arrowHead === "start" || overlay.arrowHead === "both";
  if (showEnd) {
    const from = overlay.arrowKind === "elbow" ? { x: end.x, y: start.y } : start;
    drawArrowHead(context, end, from);
  }
  if (showStart) {
    const toward = overlay.arrowKind === "elbow" ? { x: end.x, y: start.y } : end;
    drawArrowHead(context, start, toward);
  }
}

function drawWithVisual(
  context: CanvasRenderingContext2D,
  visual: EffectVisual,
  box: { x: number; y: number; width: number; height: number },
  draw: () => void,
): void {
  const placed = positiveBox(box);
  const centerX = placed.x + placed.width / 2;
  const centerY = placed.y + placed.height / 2;
  context.save();
  context.globalAlpha *= visual.opacity;
  if (visual.clip && visual.clip.length >= 3) {
    context.beginPath();
    for (let index = 0; index < visual.clip.length; index += 1) {
      const point = visual.clip[index];
      const x = placed.x + point.x * placed.width;
      const y = placed.y + point.y * placed.height;
      if (index === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    }
    context.closePath();
    context.clip();
  }
  context.translate(centerX, centerY);
  context.translate(visual.translateX * placed.width, visual.translateY * placed.height);
  context.rotate((visual.rotate * Math.PI) / PRESENTATION_HALF_CIRCLE);
  context.scale(visual.scale, visual.scale);
  context.translate(-centerX, -centerY);
  draw();
  context.restore();
}

function drawOverlay(
  context: CanvasRenderingContext2D,
  overlay: PresentationOverlay,
  panX: number,
  panY: number,
  scale: number,
  imageWidth: number,
  imageHeight: number,
  theme: PresentationGifTheme,
  visual: EffectVisual,
): void {
  const box = screenBox(overlay, panX, panY, scale, imageWidth, imageHeight);
  drawWithVisual(context, visual, box, () => {
    paintOverlay(context, overlay, panX, panY, scale, imageWidth, imageHeight, theme);
  });
}

function paintOverlay(
  context: CanvasRenderingContext2D,
  overlay: PresentationOverlay,
  panX: number,
  panY: number,
  scale: number,
  imageWidth: number,
  imageHeight: number,
  theme: PresentationGifTheme,
): void {
  context.save();
  context.strokeStyle = overlayCssColor(overlay.stroke, theme.accent);
  context.fillStyle = overlayCssColor(overlay.fill, theme.surface);
  context.lineWidth = 2;
  context.setLineDash(overlay.line === "dashed" ? [8, 5] : []);

  const box = screenBox(overlay, panX, panY, scale, imageWidth, imageHeight);
  if (overlay.shape === "arrow" && overlay.arrowForm === "line") {
    context.strokeStyle = overlayCssColor(overlay.stroke, theme.accent);
    context.fillStyle = overlayCssColor(overlay.stroke, theme.accent);
    drawArrow(context, overlay, panX, panY, scale, imageWidth, imageHeight);
    context.restore();
    return;
  }

  const artwork = overlayArtwork(overlay);
  if (artwork) {
    paintArtwork(context, box, artwork, overlayRotates(overlay) ? overlay.rotation : 0);
  } else if (overlay.shape === "arrow" && overlay.arrowForm === "shape") {
    const placed = positiveBox(box);
    const centerX = placed.x + placed.width / 2;
    const centerY = placed.y + placed.height / 2;
    context.save();
    if (overlay.rotation % PRESENTATION_FULL_CIRCLE !== 0) {
      context.translate(centerX, centerY);
      context.rotate((overlay.rotation * Math.PI) / PRESENTATION_HALF_CIRCLE);
      context.translate(-centerX, -centerY);
    }
    const path = new Path2D(blockArrowPath(box));
    context.fill(path);
    context.stroke(path);
    context.restore();
  } else {
    const outline = overlayOutline(overlay, box);
    if (outline) {
      const path = new Path2D(outline);
      context.fill(path);
      context.stroke(path);
    }
  }

  if (overlay.shape === "text" && overlay.text) {
    const fontSize = overlayTextFontSize(box.height);
    const fontFamily = overlay.font === "serif"
      ? "serif"
      : overlay.font === "mono"
        ? "monospace"
        : TEXT_FONT_FAMILY;
    context.fillStyle = overlayCssColor(overlay.textColor, theme.text);
    context.font = `${fontSize}px ${fontFamily}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    for (const line of overlayTextLinePlacements(overlay.text, fontSize)) {
      context.fillText(line.text, centerX, centerY + line.centerOffset);
    }
  }
  context.restore();
}

function hostViewpoint(
  track: PresentationTrack,
  frame: PresentationGifFrame,
): Viewpoint | undefined {
  if (frame.ownerKind === "viewpoint") {
    return track.viewpoints.find((viewpoint) => viewpoint.id === frame.ownerId);
  }
  const transition = track.transitions.find((item) => item.id === frame.ownerId);
  return track.viewpoints.find((viewpoint) => viewpoint.id === transition?.fromId);
}

function paintFrame(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  frameImage: HTMLImageElement | null,
  source: PresentationGifSource,
  frame: PresentationGifFrame,
  layout: { width: number; height: number },
  width: number,
  height: number,
): void {
  const background = isTransparentBackground(source.theme.background)
    ? PRESENTATION_GIF_FALLBACK_BACKGROUND
    : source.theme.background;
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const placed = gifScenePlacement(
    { anchorX: frame.anchorX, anchorY: frame.anchorY, scale: frame.scale },
    source.imageWidth,
    source.imageHeight,
    layout.width,
    layout.height,
    width,
    height,
    source.viewportWidth,
  );
  const host = hostViewpoint(source.track, frame);
  const effects = frame.ownerKind === "viewpoint" ? host?.effects ?? [] : [];
  const scene = (visual: EffectVisual, bitmap: HTMLImageElement) => {
    drawWithVisual(
      context,
      visual,
      { x: placed.panX, y: placed.panY, width: placed.width, height: placed.height },
      () => {
        context.drawImage(bitmap, placed.panX, placed.panY, placed.width, placed.height);
      },
    );
  };
  if (frameImage) {
    scene(effectVisualAt(effects, frame.effectElapsedMs, "frame"), frameImage);
  }
  scene(effectVisualAt(effects, frame.effectElapsedMs, "diagram"), image);

  if (!source.showOverlays) {
    return;
  }

  const overlays = source.track.overlays.filter(
    (overlay) => overlay.owner.kind === frame.ownerKind && overlay.owner.id === frame.ownerId,
  );
  for (const overlay of overlays) {
    drawOverlay(
      context,
      overlay,
      placed.panX,
      placed.panY,
      placed.scale,
      source.imageWidth,
      source.imageHeight,
      source.theme,
      effectVisualAt(host?.effects ?? [], frame.effectElapsedMs, "overlay", overlay.id),
    );
  }
}

function writeFrameWithDelay(
  gif: ReturnType<typeof GIFEncoder>,
  index: Uint8Array,
  width: number,
  height: number,
  palette: number[][],
  delayMs: number,
): void {
  for (const delay of gifFrameDelaysMs(delayMs)) {
    gif.writeFrame(index, width, height, { palette, delay, repeat: 0 });
  }
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

export async function renderPresentationGif(source: PresentationGifSource): Promise<Blob> {
  const frames = samplePresentationGifFrames(source.track);
  if (
    frames.length === 0
    || source.imageWidth <= 0
    || source.imageHeight <= 0
    || source.viewportWidth <= 0
    || source.viewportHeight <= 0
  ) {
    throw new LocalizedAppError("app.exportGifFailed");
  }

  const { width, height } = gifOutputSize(source.viewportWidth, source.viewportHeight);
  const layout = parseSvgCssSize(source.svg, {
    width: source.imageWidth,
    height: source.imageHeight,
  });
  const image = await loadSvgDocumentImage(source.svg);
  const frameImage = source.frameHref ? await loadFrameImage(source.frameHref) : null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new LocalizedAppError("engine.canvasUnavailable");
  }

  const gif = GIFEncoder();
  for (const frame of frames) {
    paintFrame(context, image, frameImage, source, frame, layout, width, height);
    const pixels = new Uint8Array(context.getImageData(0, 0, width, height).data);
    const palette = quantize(pixels, PRESENTATION_GIF_PALETTE_SIZE);
    const indexed = applyPalette(pixels, palette);
    writeFrameWithDelay(gif, indexed, width, height, palette, frame.delayMs);
    await yieldToUi();
  }
  gif.finish();

  const bytes = gif.bytes();
  return new Blob([bytes], { type: GIF_MIME_TYPE });
}
