/**
 * Типы расширения Mermaid (свои диаграммы, которых нет в upstream).
 * Код изолирован: в прод попадает только при __MERMAID_EXT__ = true.
 */

export type ExtDiagramType =
  | "waterfall"
  | "bubble"
  | "heatmap"
  | "orgchart"
  | "powermap"
  | "ev"
  | "boxplot"
  | "treemap"
  | "radar"
  | "voronoi"
  | "series"
  | "histogram"
  | "infographic"
  | "gauge"
  | "dashboard";

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
  /** Язык интерфейса. Легенда powermap берёт его, если в диаграмме нет `lang`. */
  locale?: string;
  /** Ошибка вместо фолбэка при нераспознанном типе */
  strict?: boolean;
  /** Обводка каждого элемента + его id (для отладки раскладки) */
  debugFrames?: boolean;
  /** Готовые SVG ячеек дашборда. Ключ — `diagram:<id>` или `link:<user>/<slug>`. */
  zoneSvgs?: Record<string, string>;
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
