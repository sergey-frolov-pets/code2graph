import { GIFEncoder, applyPalette, quantize } from "gifenc";
import { frameToPan } from "@/services/presentation/camera";
import { overlayArtwork, paintArtwork } from "@/services/presentation/glyph-art";
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
  PRESENTATION_GIF_MAX_DELAY_CS,
  PRESENTATION_GIF_PALETTE_SIZE,
} from "@/services/presentation/constants";
import {
  gifOutputSize,
  samplePresentationGifFrames,
  type PresentationGifFrame,
} from "@/services/presentation/gif-timeline";
import type { NormPoint, PresentationOverlay, PresentationTrack } from "@/services/presentation/types";
import { isTransparentBackground } from "@/services/export/svg-background";
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

function loadSvgImage(svg: string): Promise<HTMLImageElement> {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new LocalizedAppError("engine.svgLoadFailed"));
    };
    image.src = url;
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

function drawOverlay(
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
  context.strokeStyle = overlay.stroke || theme.accent;
  context.fillStyle = overlay.fill || theme.surface;
  context.lineWidth = 2;
  context.setLineDash(overlay.line === "dashed" ? [8, 5] : []);

  const box = screenBox(overlay, panX, panY, scale, imageWidth, imageHeight);
  if (overlay.shape === "arrow" && overlay.arrowForm === "line") {
    context.strokeStyle = overlay.stroke || theme.accent;
    context.fillStyle = overlay.stroke || theme.accent;
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
    const fontSize = Math.max(12, Math.min(28, Math.abs(box.height) * 0.45));
    const fontFamily = overlay.font === "serif"
      ? "serif"
      : overlay.font === "mono"
        ? "monospace"
        : TEXT_FONT_FAMILY;
    context.fillStyle = overlay.textColor || theme.text;
    context.font = `${fontSize}px ${fontFamily}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(overlay.text, box.x + box.width / 2, box.y + box.height / 2);
  }
  context.restore();
}

function paintFrame(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  source: PresentationGifSource,
  frame: PresentationGifFrame,
  width: number,
  height: number,
): void {
  const background = isTransparentBackground(source.theme.background)
    ? PRESENTATION_GIF_FALLBACK_BACKGROUND
    : source.theme.background;
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  const placed = frameToPan(
    { anchorX: frame.anchorX, anchorY: frame.anchorY, scale: frame.scale },
    source.imageWidth,
    source.imageHeight,
    width,
    height,
  );
  context.drawImage(
    image,
    placed.panX,
    placed.panY,
    source.imageWidth * placed.scale,
    source.imageHeight * placed.scale,
  );

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
  let remaining = Math.max(1, Math.round(delayMs / 10));
  while (remaining > 0) {
    const delay = Math.min(PRESENTATION_GIF_MAX_DELAY_CS, remaining);
    gif.writeFrame(index, width, height, { palette, delay, repeat: 0 });
    remaining -= delay;
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
  const image = await loadSvgImage(source.svg);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new LocalizedAppError("engine.canvasUnavailable");
  }

  const gif = GIFEncoder();
  for (const frame of frames) {
    paintFrame(context, image, source, frame, width, height);
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
