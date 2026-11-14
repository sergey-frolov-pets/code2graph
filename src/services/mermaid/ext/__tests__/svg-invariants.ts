/**
 * Общие инварианты SVG для всех движков расширения.
 * Вызывается из тестов каждого движка — чтобы правила не дублировались.
 */

/** Убирает единственный легальный URL — namespace SVG. */
function stripXmlns(svg: string): string {
  return svg
    .replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, "")
    .replace(/xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/g, "");
}

export interface SvgInvariantOptions {
  /** Ожидаемое минимальное число элементов (защита от пустого SVG). */
  minElements?: number;
  /**
   * Ожидаемые размеры корня. Если заданы — у корневого `<svg>` обязаны быть
   * `width`/`height`, совпадающие с `viewBox` (нужно для PNG-экспорта).
   * Не заданы — наоборот, запрещены (сырой вывод движка).
   */
  expectSize?: { width: number; height: number };
}

/** Проверяет, что SVG корректен и не содержит запрещённого. */
export function assertSvgInvariants(svg: string, options: SvgInvariantOptions = {}): void {
  const fail = (message: string): never => {
    throw new Error(message);
  };

  if (!svg.startsWith("<svg")) fail(`SVG не начинается с <svg: ${svg.slice(0, 40)}`);
  if (!svg.endsWith("</svg>")) fail("SVG не закрыт");

  if (!svg.includes('xmlns="http://www.w3.org/2000/svg"')) fail("нет xmlns");

  const openTag = /^<svg[^>]*>/.exec(svg)?.[0] ?? "";
  const hasWidth = /\swidth=/.test(openTag);
  const hasHeight = /\sheight=/.test(openTag);

  if (options.expectSize) {
    // Режим экспорта: размеры обязаны быть и совпадать с viewBox.
    if (!hasWidth) fail("у корневого <svg> нет width");
    if (!hasHeight) fail("у корневого <svg> нет height");
    const width = Number(/\swidth="([\d.]+)"/.exec(openTag)?.[1]);
    const height = Number(/\sheight="([\d.]+)"/.exec(openTag)?.[1]);
    if (Math.abs(width - options.expectSize.width) > 0.5) {
      fail(`width ${width} ≠ ожидаемого ${options.expectSize.width}`);
    }
    if (Math.abs(height - options.expectSize.height) > 0.5) {
      fail(`height ${height} ≠ ожидаемого ${options.expectSize.height}`);
    }
  } else {
    if (hasWidth) fail("у корневого <svg> есть width");
    if (hasHeight) fail("у корневого <svg> есть height");
  }

  if (!/viewBox="0 0 [\d.]+ [\d.]+"/.test(openTag)) fail("нет корректного viewBox");

  const stripped = stripXmlns(svg);
  if (/https?:\/\//.test(stripped)) fail("есть внешняя ссылка");
  if (/<script/i.test(svg)) fail("есть <script>");
  if (/\son\w+=/i.test(svg)) fail("есть inline-обработчик события");
  if (/javascript:/i.test(svg)) fail("есть javascript: URL");
  if (/@/.test(stripped)) fail("есть символ @ (контакты автора?)");
  if (/<foreignObject/i.test(svg)) fail("есть foreignObject");

  const minElements = options.minElements ?? 1;
  const count = (svg.match(/<(rect|line|path|circle|text|polyline|polygon)\b/g) ?? []).length;
  if (count < minElements) fail(`слишком мало элементов: ${count} < ${minElements}`);

  // NaN/undefined в числовых атрибутах — признак сломанной раскладки
  const numericAttr = /\s(?:x|y|x1|y1|x2|y2|cx|cy|r|width|height|rx|ry|font-size|stroke-width)="([^"]*)"/g;
  for (const m of svg.matchAll(numericAttr)) {
    if (m[1] === "NaN" || m[1] === "undefined" || m[1] === "Infinity") {
      fail(`некорректное числовое значение: ${m[0]}`);
    }
  }
}
