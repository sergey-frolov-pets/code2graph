/**
 * Gate качества SVG: прогоняет проверки и собирает отчёт.
 *
 * Рекомендательный по решению от 28.11.2026: экспорт не блокируется, UI
 * показывает бейдж с числом предупреждений. `passed: false` означает лишь,
 * что в картинке есть изъян — скачивание остаётся доступным.
 *
 * Функция чистая: строка SVG на входе, отчёт на выходе. Подходит и приложению,
 * и MCP (там DOM нужен из jsdom — при его отсутствии отчёт придёт с
 * `error: "dom-unavailable"`).
 */

import { parseSvgSize } from "../svg-geometry";
import { clippingCheck } from "./checks/clipping";
import { contrastCheck } from "./checks/contrast";
import { duplicateIdsCheck } from "./checks/duplicate-ids";
import { edgeCrossingCheck } from "./checks/edge-crossing";
import { labelDistanceCheck } from "./checks/label-distance";
import { overlapCheck } from "./checks/overlap";
import {
  FAILING_CHECKS,
  type CheckInput,
  type QualityCheck,
  type QualityCheckId,
  type QualityReport,
  type QualityOptions,
  type QualityStatus,
} from "./types";

/** Порядок важен только для читаемости отчёта: от простого к сложному. */
export const QUALITY_CHECKS: readonly QualityCheck[] = [
  duplicateIdsCheck,
  contrastCheck,
  clippingCheck,
  overlapCheck,
  edgeCrossingCheck,
  labelDistanceCheck,
];

const DEFAULT_MIN_CONTRAST = 4.5;
const DEFAULT_LABEL_SLACK_PX = 2;
const DEFAULT_LABEL_DISTANCE_PX = 40;

const MESSAGES: Record<QualityCheckId, (count: number) => string> = {
  "duplicate-ids": (count) => `Повторяющиеся id: ${count}`,
  contrast: (count) => `Подписи с низким контрастом: ${count}`,
  clipping: (count) => `Текст за пределами холста: ${count}`,
  overlap: (count) => `Подписи наложены друг на друга: ${count}`,
  "edge-crossing": (count) => `Связи пересекают узлы: ${count}`,
  "label-distance": (count) => `Подписи далеко от связи: ${count}`,
};

const PASS_MESSAGES: Record<QualityCheckId, string> = {
  "duplicate-ids": "Повторяющихся id нет",
  contrast: "Контраст подписей в норме",
  clipping: "Текст внутри холста",
  overlap: "Подписи не наложены",
  "edge-crossing": "Связи не пересекают узлы",
  "label-distance": "Подписи рядом со связями",
};

export const QUALITY_MESSAGE_KEYS: Record<QualityCheckId, string> = {
  "duplicate-ids": "export.quality.duplicateIds",
  contrast: "export.quality.contrast",
  clipping: "export.quality.clipping",
  overlap: "export.quality.overlap",
  "edge-crossing": "export.quality.edgeCrossing",
  "label-distance": "export.quality.labelDistance",
};

function statusFor(id: QualityCheckId, count: number): QualityStatus {
  if (count === 0) {
    return "pass";
  }
  return FAILING_CHECKS.has(id) ? "fail" : "warn";
}

function parseRoot(svg: string): Element | null {
  const parser = (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
  if (!parser) {
    return null;
  }
  const document = new parser().parseFromString(svg, "image/svg+xml");
  if (document.querySelector("parsererror")) {
    return null;
  }
  const root = document.documentElement;
  if (!root || root.tagName.toLowerCase() !== "svg") {
    return null;
  }
  return root;
}

export function checkSvgQuality(svg: string, options: QualityOptions = {}): QualityReport {
  const empty: QualityReport = { passed: false, score: `0/${QUALITY_CHECKS.length}`, warnings: 0, checks: [] };

  const trimmed = svg.trim();
  if (!trimmed) {
    return { ...empty, error: "invalid-svg" };
  }
  const root = parseRoot(trimmed);
  if (!root) {
    const hasDom = typeof (globalThis as { DOMParser?: unknown }).DOMParser !== "undefined";
    return { ...empty, error: hasDom ? "invalid-svg" : "dom-unavailable" };
  }

  const size = parseSvgSize(trimmed);
  const input: CheckInput = {
    root,
    width: size.width,
    height: size.height,
    minContrast: options.minContrast ?? DEFAULT_MIN_CONTRAST,
    labelSlackPx: options.labelSlackPx ?? DEFAULT_LABEL_SLACK_PX,
    labelDistancePx: options.labelDistancePx ?? DEFAULT_LABEL_DISTANCE_PX,
  };

  const checks = QUALITY_CHECKS.map((check) => {
    const findings = check.run(input);
    const status = statusFor(check.id, findings.count);
    return {
      id: check.id,
      status,
      count: findings.count,
      message: findings.count === 0 ? PASS_MESSAGES[check.id] : MESSAGES[check.id](findings.count),
      messageKey: QUALITY_MESSAGE_KEYS[check.id],
      details: findings.count === 0 ? undefined : findings.details,
    };
  });

  const passedChecks = checks.filter((check) => check.status === "pass").length;
  return {
    passed: checks.every((check) => check.status !== "fail"),
    score: `${passedChecks}/${checks.length}`,
    warnings: checks.filter((check) => check.status === "warn").length,
    checks,
  };
}
