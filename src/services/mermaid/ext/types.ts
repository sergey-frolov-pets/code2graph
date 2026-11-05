/**
 * Типы расширения Mermaid (свои диаграммы, которых нет в upstream).
 * Код изолирован: в прод попадает только при __MERMAID_EXT__ = true.
 */

export type ExtDiagramType =
  | "waterfall"
  | "bubble"
  | "heatmap"
  | "orgchart"
  | "ev"
  | "boxplot"
  | "treemap"
  | "radar"
  | "voronoi"
  | "series";

export interface ExtParseError {
  message: string;
  /** 1-based строка исходника */
  line: number;
  /** 0-based колонка */
  col: number;
}

export interface ExtRenderOptions {
  dark?: boolean;
  /**
   * Фон диаграммы (`background #hex`) — перекрывает плашку холста. Цвет текста
   * подбирается под него автоматически, если не задан `textColor`.
   */
  background?: string;
  /** Цвет текста (`textcolor #hex`) — ручное перекрытие автоподбора. */
  textColor?: string;
  /** Шрифт и его стиль — задаются в окне «Внешний вид». */
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  /** Ошибка вместо фолбэка при нераспознанном типе */
  strict?: boolean;
  /** Обводка каждого элемента + его id (для отладки раскладки) */
  debugFrames?: boolean;
}

export interface ExtParseResult<T> {
  ok: boolean;
  value?: T;
  errors: ExtParseError[];
}

export interface ExtEngine<T> {
  type: ExtDiagramType;
  aliases: string[];
  parse(source: string): ExtParseResult<T>;
  render(model: T, options: ExtRenderOptions): string;
}
