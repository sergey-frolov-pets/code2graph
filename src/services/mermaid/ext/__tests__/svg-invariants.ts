/**
 * Общие инварианты SVG для всех движков расширения.
 * Вызывается из тестов каждого движка — чтобы правила не дублировались.
 */

/** Убирает единственный легальный URL — namespace SVG. */
function stripXmlns(svg: string): string {
  return svg.replace(/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/g, "");
}

export interface SvgInvariantOptions {
  /** Ожидаемое минимальное число элементов (защита от пустого SVG). */
  minElements?: number;
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
  if (/\swidth=/.test(openTag)) fail("у корневого <svg> есть width");
  if (/\sheight=/.test(openTag)) fail("у корневого <svg> есть height");
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
