import { fmt, monoFlagsFromMode, niceRange, parseHexColor, parseMonoDirective } from "../../common";
import type { ExtParseError, ExtParseResult } from "../../types";
import {
  parseAxis,
  parseBreak,
  parseColors,
  parseLabelsMode,
  parseLine,
  parseNumber,
  parseSeriesHeader,
  parseStep,
} from "./directive-parsers";
import { parseAspectDirective, type ChartAspect } from "../../chart-aspect";
import type {
  WaterfallAxis,
  WaterfallBarGap,
  WaterfallBreak,
  WaterfallColors,
  WaterfallLine,
  WaterfallModel,
  WaterfallSeries,
  WaterfallSeriesColors,
} from "./types";

export function parseWaterfall(source: string): ExtParseResult<WaterfallModel> {
  const errors: ExtParseError[] = [];
  const series: WaterfallSeries[] = [];
  const breaks: WaterfallBreak[] = [];
  const thresholdLines: WaterfallLine[] = [];
  let current: WaterfallSeries | null = null;
  let title: string | undefined;
  let axis: WaterfallAxis | null = null;
  let gridStep: number | undefined;
  let grid = true;
  let axisHidden = false;
  let categoryAxisHidden = false;
  let barGap: WaterfallBarGap | undefined;
  let labelAuto = false;
  let valueLabels = { above: true, inside: false };
  let connectors = true;
  let fontSize: number | undefined;
  let ratio: ChartAspect | undefined;
  let mono = false;
  let monoInvert = false;
  let colors: Partial<WaterfallColors> | undefined;
  let seriesColors: WaterfallSeriesColors | undefined;
  let background: string | undefined;
  let textColor: string | undefined;

  const lines = source.split(/\r?\n/);
  let seenType = false;

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    const lineNo = i + 1;
    if (!raw || raw.startsWith("%%")) continue;

    if (!seenType) {
      seenType = true;
      continue; // первая значимая строка — ключевое слово типа
    }

    if (/^title\b/i.test(raw)) {
      title = raw.replace(/^title\s*/i, "").trim() || undefined;
      continue;
    }

    if (/^y\b/i.test(raw)) {
      const parsed = parseAxis(raw.slice(1).trim());
      if (!parsed) {
        errors.push({
          message: `ожидается «y "<подпись>" <min> --> <max>"»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      axis = { label: parsed.label, min: parsed.min, max: parsed.max, auto: false, grid };
      continue;
    }

    if (/^background\b/i.test(raw)) {
      const value = raw.replace(/^background\s*/i, "").trim();
      if (!parseHexColor(value)) {
        errors.push({
          message: `ожидается «background #hex», получено «${value}»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      background = value;
      continue;
    }

    if (/^(?:textcolou?r|fontcolou?r|fgcolou?r)\b/i.test(raw)) {
      const value = raw.replace(/^(?:textcolou?r|fontcolou?r|fgcolou?r)\s*/i, "").trim();
      if (!parseHexColor(value)) {
        errors.push({
          message: `ожидается «textcolor #hex», получено «${value}»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      textColor = value;
      continue;
    }

    if (/^grid\b/i.test(raw)) {
      const arg = raw.slice(4).trim();
      if (/^y2\b/i.test(arg)) {
        errors.push({
          message: `у waterfall нет второй оси: «grid y2» не поддерживается`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      const body = arg.toLowerCase();
      if (!body || body === "on") {
        grid = true;
        gridStep = undefined;
      } else if (body === "off") {
        grid = false;
        gridStep = undefined;
      } else {
        const value = parseNumber(body);
        if (value === null || !(value > 0)) {
          errors.push({
            message: `ожидается «grid», «grid off» или «grid <положительный шаг>», получено «${arg}»`,
            line: lineNo,
            col: 0,
          });
          continue;
        }
        grid = true;
        gridStep = value;
      }
      continue;
    }

    if (/^axis\b/i.test(raw)) {
      const parts = raw.slice(4).trim().toLowerCase().split(/\s+/).filter(Boolean);
      const isOn = (token: string) => token === "on" || token === "auto";
      const isOff = (token: string) => token === "off" || token === "none" || token === "hidden";
      if (parts.length === 0 || (parts.length === 1 && isOn(parts[0]))) {
        axisHidden = false;
        continue;
      }
      if (parts.length === 1 && isOff(parts[0])) {
        axisHidden = true;
        grid = false;
        continue;
      }
      if (parts[0] === "y2") {
        errors.push({
          message: `у waterfall нет второй оси`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      if (parts.length === 2 && (parts[0] === "x" || parts[0] === "y") && (isOn(parts[1]) || isOff(parts[1]))) {
        if (parts[0] === "x") categoryAxisHidden = isOff(parts[1]);
        else {
          axisHidden = isOff(parts[1]);
          if (axisHidden) grid = false;
        }
        continue;
      }
      errors.push({
        message: `ожидается «axis on|off» или «axis x|y on|off», получено «${raw.slice(4).trim()}»`,
        line: lineNo,
        col: 0,
      });
      continue;
    }

    if (/^gap\b/i.test(raw)) {
      const arg = raw.replace(/^gap\s*/i, "").trim();
      const percent = /^(.*)\s*%$/.exec(arg);
      if (percent) {
        const value = parseNumber(percent[1]);
        if (value === null || value < 0 || value >= 100) {
          errors.push({
            message: `ожидается «gap <число>%» от 0 до 100 не включая 100, получено «${arg}»`,
            line: lineNo,
            col: 0,
          });
        } else {
          barGap = { unit: "percent", value };
        }
      } else {
        const value = parseNumber(arg);
        if (value === null || value < 0) {
          errors.push({
            message: `ожидается «gap <пиксели>» или «gap <процент>%», получено «${arg}»`,
            line: lineNo,
            col: 0,
          });
        } else {
          barGap = { unit: "px", value };
        }
      }
      continue;
    }

    if (/^labels\b/i.test(raw)) {
      const { mode, auto, error } = parseLabelsMode(raw.slice(6), lineNo);
      if (error) errors.push(error);
      else {
        if (mode) valueLabels = mode;
        if (auto) labelAuto = true;
      }
      continue;
    }

    if (/^connectors?\b/i.test(raw)) {
      const token = raw.replace(/^connectors?\s*/i, "").trim().toLowerCase();
      if (token === "off" || token === "none" || token === "false" || token === "no") {
        connectors = false;
      } else if (token === "on" || token === "true" || token === "yes" || token === "") {
        connectors = true;
      } else {
        errors.push({
          message: `ожидается «connectors on» или «connectors off», получено «${token}»`,
          line: lineNo,
          col: 0,
        });
      }
      continue;
    }

    const aspect = parseAspectDirective(raw);
    if (aspect) {
      if ("error" in aspect) errors.push({ message: aspect.error, line: lineNo, col: 0 });
      else ratio = aspect.aspect;
      continue;
    }

    if (/^fontsize\b/i.test(raw)) {
      const value = parseNumber(raw.replace(/^fontsize\s*/i, ""));
      if (value === null || !(value > 0)) {
        errors.push({
          message: `ожидается «fontsize <положительное число>», получено «${raw.replace(/^fontsize\s*/i, "").trim()}»`,
          line: lineNo,
          col: 0,
        });
        continue;
      }
      fontSize = value;
      continue;
    }

    if (/^mono\b/i.test(raw)) {
      const parsed = parseMonoDirective(raw.replace(/^mono\s*/i, ""));
      if ("error" in parsed) {
        errors.push({ message: parsed.error, line: lineNo, col: 0 });
      } else {
        const flags = monoFlagsFromMode(parsed.mode);
        mono = flags.mono;
        monoInvert = flags.monoInvert;
      }
      continue;
    }

    if (/^colou?rs?\b/i.test(raw)) {
      const { colors: parsed, seriesColors: parsedSeries, error } = parseColors(
        raw.replace(/^colou?rs?\s*/i, ""),
        lineNo,
      );
      if (error) errors.push(error);
      else {
        if (parsed && Object.keys(parsed).length) colors = { ...colors, ...parsed };
        if (parsedSeries && Object.keys(parsedSeries).length) {
          seriesColors = { ...seriesColors, ...parsedSeries };
        }
      }
      continue;
    }

    if (/^break\b/i.test(raw)) {
      const { brk, error } = parseBreak(raw.slice(5), lineNo);
      if (error) errors.push(error);
      else if (brk) breaks.push(brk);
      continue;
    }

    if (/^line\b/i.test(raw)) {
      const { line: parsedLine, error } = parseLine(raw.slice(4), lineNo);
      if (error) errors.push(error);
      else if (parsedLine) thresholdLines.push(parsedLine);
      continue;
    }

    if (/^series\b/i.test(raw)) {
      if (current && current.steps.length === 0) {
        errors.push({
          message: `группа «${current.name ?? ""}» не содержит данных`,
          line: lineNo,
          col: 0,
        });
      }
      const header = parseSeriesHeader(raw);
      current = { name: header.name, steps: [] };
      if (header.color) current.color = header.color;
      series.push(current);
      continue;
    }

    if (!current) {
      current = { steps: [] };
      series.push(current);
    }
    const { step, error } = parseStep(raw, lineNo);
    if (error) {
      errors.push(error);
      continue;
    }
    if (step) current.steps.push(step);
  }

  if (current && current.steps.length === 0 && series.length > 1) {
    errors.push({
      message: `группа «${current.name ?? ""}» не содержит данных`,
      line: lines.length,
      col: 0,
    });
  }

  const totalSteps = series.reduce((acc, s) => acc + s.steps.length, 0);
  if (totalSteps === 0) {
    errors.push({
      message: `нет данных: ожидается хотя бы одна строка «=N : подпись»`,
      line: 1,
      col: 0,
    });
    return { ok: false, errors };
  }

  const first = series[0].steps[0];
  if (first && first.kind !== "absolute") {
    errors.push({
      message: `первая колонка должна быть абсолютной (=N)`,
      line: findFirstDataLine(lines),
      col: 0,
    });
  }

  if (errors.length) return { ok: false, errors };

  const labels = series[0].steps.map((s) => s.label);

  // «=» без значения: колонка повторяет накопленный итог. Раскрываем до
  // подсчёта шкалы, чтобы extent и рендер видели уже конкретные числа.
  const carryErrors = resolveCarryOver(series);
  if (carryErrors.length) return { ok: false, errors: carryErrors };

  if (!axis) {
    const extent = computeExtent(series);
    const rounded = niceRange(extent.min, extent.max, 4);
    axis = { min: rounded.min, max: rounded.max, auto: true, grid };
  }

  axis.grid = grid;
  if (grid && gridStep !== undefined) axis.gridStep = gridStep;
  if (axisHidden) axis.hidden = true;

  // Разрывы вне диапазона шкалы — просто не участвуют в сжатии.
  const visibleBreaks = breaks.filter((b) => b.after >= axis!.min && b.before <= axis!.max);
  const sorted = [...visibleBreaks].sort((a, b) => a.after - b.after);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].after < sorted[i - 1].before) {
      errors.push({
        message: `разрывы пересекаются: «${fmt(sorted[i - 1].after)} --> ${fmt(sorted[i - 1].before)}» и «${fmt(sorted[i].after)} --> ${fmt(sorted[i].before)}»`,
        line: 1,
        col: 0,
      });
      break;
    }
  }
  if (errors.length) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    value: {
      title,
      axis,
      series,
      labels,
      breaks: sorted,
      lines: [...thresholdLines].sort((a, b) => a.value - b.value),
      valueLabels,
      connectors,
      fontSize,
      ratio,
      mono,
      monoInvert,
      colors,
      seriesColors,
      background,
      textColor,
      categoryAxisHidden,
      barGap,
      labelAuto,
    },
  };
}

function findFirstDataLine(lines: string[]): number {
  for (let i = 0; i < lines.length; i += 1) {
    const t = lines[i].trim();
    if (!t || t.startsWith("%%")) continue;
    if (/^[=+-]/.test(t)) return i + 1;
  }
  return 1;
}

/**
 * Раскрывает `= null` (абсолютную колонку без значения) в накопленный итог.
 * Первая колонка без значения бессмысленна — это ошибка.
 */
function resolveCarryOver(series: WaterfallSeries[]): ExtParseError[] {
  const errors: ExtParseError[] = [];
  for (const group of series) {
    let running = 0;
    for (let i = 0; i < group.steps.length; i += 1) {
      const step = group.steps[i];
      if (step.kind === "absolute") {
        if (step.value === null) {
          if (i === 0) {
            errors.push({
              message: `первая колонка должна быть абсолютной со значением (=N)`,
              line: 1,
              col: 0,
            });
            return errors;
          }
          step.value = running;
        }
        running = step.value;
      } else {
        running += step.value ?? 0;
      }
    }
  }
  return errors;
}

/** min/max по всем накопленным значениям всех групп. */
function computeExtent(series: WaterfallSeries[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const group of series) {
    let running = 0;
    for (const step of group.steps) {
      if (step.kind === "absolute") {
        running = step.value ?? running;
        min = Math.min(min, running);
        max = Math.max(max, running);
      } else {
        const next = running + (step.value ?? 0);
        min = Math.min(min, running, next);
        max = Math.max(max, running, next);
        running = next;
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  if (min === max) return { min: min - 1, max: max + 1 };
  return { min, max };
}

// --- Рендер ---------------------------------------------------------------
