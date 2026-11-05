import { isTransparentBackground } from "@/services/export/svg-background";
import {
  clampImageSide,
  parseSvgSize,
  type ImageSize,
} from "@/services/export/svg-geometry";
import { LocalizedAppError } from "@/utils/localized-app-error";

const PNG_MIME_TYPE = "image/png";

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new LocalizedAppError("engine.svgLoadFailed"));
    image.src = url;
  });
}

export function downloadTextFile(
  content: string,
  fileName: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function svgToPngBlob(
  svg: string,
  backgroundColor = "#ffffff",
  size?: ImageSize,
): Promise<Blob> {
  const natural = parseSvgSize(svg);
  const { width, height } = size
    ? { width: clampImageSide(size.width), height: clampImageSide(size.height) }
    : natural;
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);

    const context = canvas.getContext("2d");
    if (!context) {
      throw new LocalizedAppError("engine.canvasUnavailable");
    }

    if (!isTransparentBackground(backgroundColor)) {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new LocalizedAppError("engine.pngCreateFailed"));
      }, PNG_MIME_TYPE);
    });

    return pngBlob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

type ClipboardWrite = (items: ClipboardItem[]) => Promise<void>;

function clipboardWrite(): ClipboardWrite | null {
  if (typeof navigator === "undefined" || typeof ClipboardItem === "undefined") {
    return null;
  }

  const clipboard = navigator.clipboard;
  if (!clipboard || typeof clipboard.write !== "function") {
    return null;
  }

  return clipboard.write.bind(clipboard);
}

function asPngBlob(blob: Blob): Blob {
  return blob.type === PNG_MIME_TYPE ? blob : new Blob([blob], { type: PNG_MIME_TYPE });
}

function clipboardItem(
  payload: Blob | Promise<Blob>,
): ClipboardItem | null {
  try {
    return new ClipboardItem({ [PNG_MIME_TYPE]: payload });
  } catch {
    return null;
  }
}

/**
 * Кладёт PNG в буфер обмена.
 * Promise передаётся в ClipboardItem сразу, пока ещё жив жест пользователя:
 * Safari отклоняет запись, если растр дожидаются до вызова write.
 */
export async function copyPngBlobToClipboard(png: Promise<Blob>): Promise<void> {
  const write = clipboardWrite();
  if (!write) {
    throw new LocalizedAppError("app.copyPngUnsupported");
  }

  const pngBlob = png.then(asPngBlob);
  const pendingItem = clipboardItem(pngBlob);
  if (pendingItem) {
    try {
      await write([pendingItem]);
      return;
    } catch {
      await pngBlob;
    }
  }

  try {
    const blob = await pngBlob;
    const readyItem = clipboardItem(blob);
    if (!readyItem) {
      throw new LocalizedAppError("app.copyPngUnsupported");
    }
    await write([readyItem]);
  } catch (error) {
    if (error instanceof LocalizedAppError) {
      throw error;
    }
    throw new LocalizedAppError("app.copyPngFailed");
  }
}
