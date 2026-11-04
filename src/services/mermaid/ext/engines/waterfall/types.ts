export type StepKind = "absolute" | "delta";

export interface WaterfallStep {
  kind: StepKind;
  /**
   * Для absolute — само значение; для delta — знак уже учтён в value.
   * `null` — «= без значения»: колонка повторяет накопленный итог
   * (промежуточный итог / повтор предыдущего значения).
   */
  value: number | null;
  label: string;
  /** Подпись внутри бара (перекрывает общую настройку `labels inside`). */
  labelInside?: boolean;
  /** Подпись над баром (перекрывает общую настройку `labels above`). */
  labelAbove?: boolean;
}

export interface WaterfallSeries {
  name?: string;
  steps: WaterfallStep[];
  /** Свой цвет группы (`series <имя> color=#hex`). */
  color?: string;
}

export interface WaterfallAxis {
  label?: string;
  min: number;
  max: number;
  /** true — границы посчитаны по данным, а не заданы в `y "..." min --> max`. */
  auto: boolean;
  /** Явный шаг сетки (`grid <шаг>`); без него — «круглые» деления. */
  gridStep?: number;
  /** `axis off` — не рисовать ось и подписи делений. */
  hidden?: boolean;
}

/** Цвета баров по типу шага. */
export interface WaterfallColors {
  /** Абсолютные колонки (старт, итоги). */
  total: string;
  /** Приращения вверх. */
  increase: string;
  /** Приращения вниз. */
  decrease: string;
}

/**
 * Дополнительные цвета мульти-серий (`colors s1=#hex s2=#hex ...`).
 * Ключ `sN` — цвет серии №N (нумерация с 1, как в легенде). Ключи `group1`,
 * `series1`, `g1` — синонимы. Если для серии задан и `series <имя> color=#hex`,
 * и `sN=`, побеждает `color=` у самой серии (он ближе к данным).
 */
export type WaterfallSeriesColors = Record<string, string>;

export interface WaterfallModel {
  title?: string;
  axis: WaterfallAxis;
  series: WaterfallSeries[];
  /** Подписи колонок — берутся из первой группы. */
  labels: string[];
  /** Разрывы шкалы: между `break.after` и `break.before` участок сжат. */
  breaks: WaterfallBreak[];
  /** Горизонтальные линии поверх диаграммы (`line <значение> [...]`). */
  lines?: WaterfallLine[];
  /** Куда рисовать значения: над баром (по умолчанию) и/или внутри бара. */
  valueLabels: { above: boolean; inside: boolean };
  /** Соединительные линии между барами (`connectors on|off`), по умолчанию включены. */
  connectors: boolean;
  /**
   * Базовый размер шрифта (`fontsize <px>`). Не задан — FONT_BASE (11).
   * Масштабирует подписи колонок, деления шкалы, значения, легенду и заголовок;
   * ширина колонок и высота графика растут вместе со шрифтом.
   */
  fontSize?: number;
  /** `mono` — чёрно-белый режим: бары различаются светлотой, а не цветом. */
  mono?: boolean;
  /** Свои цвета: `colors total=#hex increase=#hex decrease=#hex`. */
  colors?: Partial<WaterfallColors>;
  /** Цвета отдельных серий: `colors s1=#hex s2=#hex` (ключи нормализованы в `sN`). */
  seriesColors?: WaterfallSeriesColors;
  /**
   * Фон диаграммы (`background #hex`). Без него — фон темы (dark/light).
   * Цвет текста подбирается под фон автоматически, чтобы подписи читались.
   */
  background?: string;
  /** Цвет текста (`textcolor #hex`) — перекрывает автоподбор под фон. */
  textColor?: string;
}

/** Разрыв оси: значения выше `after` и ниже `before` рисуются вплотную. */
export interface WaterfallBreak {
  after: number;
  before: number;
  /** Подпись на линии разрыва (опционально). */
  label?: string;
}

/**
 * Горизонтальная линия поверх диаграммы (порог, план, среднее).
 * `line <значение> ["подпись"] [color=#hex] [width=<px>] [style=dash|dot|dashdot|solid]`
 */
export interface WaterfallLine {
  value: number;
  /** Подпись справа от баров — как у подписи разрыва. */
  label?: string;
  /** Цвет линии и подписи; без него — цвет текста темы. */
  color?: string;
  /** Толщина в px (0.5–12). */
  width?: number;
  style?: WaterfallLineStyle;
}

export type WaterfallLineStyle = "solid" | "dash" | "dot" | "dashdot";

// --- Разбор ---------------------------------------------------------------
