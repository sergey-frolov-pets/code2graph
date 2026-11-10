import { LocalizedAppError } from "@/utils/localized-app-error";

/**
 * Префикс data-URL, через который SVG рисуется на холст.
 * charset=utf-8 нужен, чтобы кириллица в подписях не ломалась при decode.
 */
const SVG_RASTER_DATA_URL_PREFIX = "data:image/svg+xml;charset=utf-8,";

/**
 * Адрес, с которого SVG можно нарисовать на холст и затем прочитать пиксели.
 *
 * Mermaid кладёт подписи в foreignObject. Chrome и Safari при загрузке такого
 * SVG через blob: помечают холст как чужой: getImageData бросает SecurityError
 * «The canvas has been tainted by cross-origin data». Тот же документ через
 * data: остаётся доступным для чтения. В Firefox blob: и так читается.
 */
export function svgRasterSourceUrl(svg: string): string {
  return `${SVG_RASTER_DATA_URL_PREFIX}${encodeURIComponent(svg)}`;
}

export function loadSvgDocumentImage(svg: string): Promise<HTMLImageElement> {
  const url = svgRasterSourceUrl(svg);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new LocalizedAppError("engine.svgLoadFailed"));
    image.src = url;
  });
}
