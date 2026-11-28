/**
 * Контракт проверок качества SVG.
 *
 * Проверка — чистая функция над разобранным DOM: получает корень и настройки,
 * возвращает счётчик нарушений и подробности. Статус (`fail` / `warn`)
 * назначает оркестратор по таблице `STATUS: Record<QualityCheckId, …>`.
 */

export type QualityCheckId =
  | "duplicate-ids"
  | "contrast"
  | "clipping"
  | "overlap"
  | "edge-crossing"
  | "label-distance";

export type QualityStatus = "pass" | "warn" | "fail";

/** Одно нарушение: координаты и ссылки на элементы (подписи, цвета). */
export interface QualityIssue {
  x?: number;
  y?: number;
  /** Короткие пометки: id, цвета, тексты — для раскрытия в UI. */
  refs?: string[];
}

export interface QualityCheckResult {
  id: QualityCheckId;
  status: QualityStatus;
  /** Сколько нарушений нашла проверка. */
  count: number;
  /** Готовый русский текст; UI берёт `messageKey` и подставляет `count`. */
  message: string;
  messageKey: string;
  details?: QualityIssue[];
}

export interface QualityReport {
  /** false — есть хотя бы один `fail`. Предупреждения проходят. */
  passed: boolean;
  /** «прошли/всего», например "5/6". */
  score: string;
  warnings: number;
  checks: QualityCheckResult[];
  /** Причина, по которой проверки не выполнялись (битый SVG, нет DOM). */
  error?: "invalid-svg" | "dom-unavailable";
}

export interface QualityOptions {
  /** Порог контраста текста (WCAG AA для обычного текста — 4.5). */
  minContrast?: number;
  /** Допуск при проверке наложений подписей, px. */
  labelSlackPx?: number;
  /** Максимальное расстояние подписи до своей связи, px. */
  labelDistancePx?: number;
}

/** Вход проверки: корень SVG и вычисленные границы холста. */
export interface CheckInput {
  root: Element;
  width: number;
  height: number;
  minContrast: number;
  labelSlackPx: number;
  labelDistancePx: number;
}

export interface CheckFindings {
  count: number;
  details: QualityIssue[];
}

export interface QualityCheck {
  id: QualityCheckId;
  run(input: CheckInput): CheckFindings;
}

/** Статус по числу нарушений: только «ломающее картинку» даёт `fail`. */
export const FAILING_CHECKS: ReadonlySet<QualityCheckId> = new Set<QualityCheckId>([
  "duplicate-ids",
  "clipping",
  "overlap",
]);
