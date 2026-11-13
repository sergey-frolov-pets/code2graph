import { parseAspectDirective, type ChartAspect } from "../../chart-aspect";
import {
  extractTrailingColorAttr,
  isValidExtColor,
  normalizeColorToHex,
  parseExtColorsDirective,
  parseExtNumber,
  parseMonoDirective,
  unquoteExtText,
} from "../../color-utils";
import type { ExtParseError, ExtParseResult } from "../../types";
import { parseLine, takeLabelFontColor } from "../waterfall/directive-parsers";
import {
  DEFAULT_CI_LEVEL,
  DEFAULT_IQR_FACTOR,
  DEFAULT_MAD_CUTOFF,
  DEFAULT_Z_CUTOFF,
  classifyToken,
  cleanSample,
  fitDistribution,
  isDistributionName,
  type BinSpec,
  type DistributionName,
  type DistributionParams,
  type ErrorMode,
  type MissingMode,
  type OutlierAction,
  type OutlierMethod,
  type OutlierSpec,
} from "./stats";
import {
  DEFAULT_STATS,
  STAT_NAMES,
  type HistogramCurve,
  type HistogramGap,
  type HistogramLabelsMode,
  type HistogramModel,
  type HistogramNamedColors,
  type HistogramScale,
  type HistogramSeries,
  type StatName,
} from "./types";

const COLOR_ALIASES: Readonly<Record<string, keyof HistogramNamedColors>> = {
  mean: "mean",
  median: "median",
  ci: "ci",
};

const PARAM_ALIASES: Readonly<Record<string, keyof DistributionParams>> = {
  mu: "mu",
  mean: "mu",
  sigma: "sigma",
  sd: "sigma",
  rate: "rate",
  lambda: "rate",
  a: "a",
  b: "b",
  shape: "shape",
  k: "shape",
  scale: "scale",
  theta: "scale",
};

function axisRange(
  body: string,
  axis: "x" | "y",
): { axis?: HistogramModel["x"]; error?: string } {
  const rangeMatch = /^(.*?)\s*(-?[\d\s_.,]+)\s*-->\s*(-?[\d\s_.,]+)\s*$/.exec(body);
  if (rangeMatch) {
    const min = parseExtNumber(rangeMatch[2]);
    const max = parseExtNumber(rangeMatch[3]);
    if (min === null || max === null) {
      return { error: `ожидается «${axis} "<подпись>" <min> --> <max>»` };
    }
    if (!(max > min)) {
      return { error: `ось «${axis}»: максимум должен быть больше минимума` };
    }
    const label = unquoteExtText(rangeMatch[1]) || undefined;
    return { axis: { label, min, max } };
  }
  const label = unquoteExtText(body);
  if (!label) return { error: `ожидается «${axis} "<подпись>" [<min> --> <max>]»` };
  return { axis: { label } };
}

function parseGap(arg: string): { gap?: HistogramGap; error?: string } {
  const percent = /^(.*)\s*%$/.exec(arg);
  if (percent) {
    const value = parseExtNumber(percent[1]);
    if (value === null || value < 0) {
      return { error: `ожидается «gap <множитель>» или «gap <процент>%», получено «${arg}»` };
    }
    return { gap: { unit: "percent", value } };
  }
  const value = parseExtNumber(arg);
  if (value === null || value < 0) {
    return { error: `ожидается «gap <множитель>» или «gap <процент>%», получено «${arg}»` };
  }
  return { gap: { unit: "ratio", value } };
}

function parseBins(body: string): { bins?: BinSpec; error?: string } {
  const trimmed = body.trim();
  if (!trimmed || /^auto$/i.test(trimmed)) return { bins: { mode: "auto" } };
  if (trimmed.includes("-->")) {
    const parts = trimmed.split(/\s*,\s*/);
    const edges: number[] = [];
    for (const part of parts) {
      const match = /^(-?[\d\s_.,]+)\s*-->\s*(-?[\d\s_.,]+)$/.exec(part.trim());
      if (!match) return { error: `ожидается «bins <a> --> <b>, …», получено «${trimmed}»` };
      const left = parseExtNumber(match[1]);
      const right = parseExtNumber(match[2]);
      if (left === null || right === null) {
        return { error: `не удалось разобрать интервал «${part.trim()}»` };
      }
      if (edges.length === 0) edges.push(left, right);
      else {
        if (left !== edges[edges.length - 1]) {
          return { error: `интервалы бинов должны стыковаться: «${part.trim()}»` };
        }
        edges.push(right);
      }
    }
    return { bins: { mode: "edges", edges } };
  }
  const count = parseExtNumber(trimmed);
  if (count === null || !(count >= 1)) {
    return { error: `ожидается «bins auto», «bins <число>» или «bins a --> b, …», получено «${trimmed}»` };
  }
  return { bins: { mode: "count", count } };
}

function parseOutliers(body: string): { outliers?: OutlierSpec; error?: string } {
  const tokens = body.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || tokens[0] === "none" || tokens[0] === "off") {
    return { outliers: { method: "none", k: 0, action: "drop" } };
  }
  const method = tokens[0];
  if (method !== "iqr" && method !== "z" && method !== "mad") {
    return { error: `ожидается «outliers none|iqr|z|mad», получено «${body.trim()}»` };
  }
  let k =
    method === "iqr" ? DEFAULT_IQR_FACTOR : method === "z" ? DEFAULT_Z_CUTOFF : DEFAULT_MAD_CUTOFF;
  let action: OutlierAction = "drop";
  for (const token of tokens.slice(1)) {
    if (token === "drop" || token === "winsor" || token === "mark") action = token;
    else {
      const value = parseExtNumber(token);
      if (value === null || value < 0) {
        return { error: `множитель выбросов: ожидается неотрицательное число, получено «${token}»` };
      }
      k = value;
    }
  }
  return { outliers: { method: method as OutlierMethod, k, action } };
}

function parseStats(body: string): { stats?: HistogramModel["stats"]; error?: string } {
  const tokens = body.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { stats: [...DEFAULT_STATS] };
  if (tokens.length === 1 && (tokens[0] === "off" || tokens[0] === "none")) return { stats: "off" };
  if (tokens.length === 1 && tokens[0] === "all") return { stats: [...STAT_NAMES] };
  const names: StatName[] = [];
  for (const token of tokens) {
    if (!(STAT_NAMES as readonly string[]).includes(token)) {
      return { error: `неизвестный показатель «${token}»` };
    }
    names.push(token as StatName);
  }
  return { stats: names };
}

function takeQuoted(text: string): { quoted?: string; rest: string } {
  const match = /^\s*"((?:[^"\\]|\\.)*)"\s*/.exec(text);
  if (!match) return { rest: text };
  return { quoted: match[1].replace(/\\"/g, '"'), rest: text.slice(match[0].length) };
}

function parseCurve(raw: string, lineNo: number, kind: "fit" | "curve"): { curve?: HistogramCurve; error?: ExtParseError } {
  const colorExtracted = extractTrailingColorAttr(raw, lineNo);
  if (colorExtracted.error) return { error: colorExtracted.error };
  let rest = colorExtracted.rest.replace(/^(?:fit|curve)\s+/i, "");
  const distMatch = /^([a-z]+)\b\s*/i.exec(rest);
  if (!distMatch || !isDistributionName(distMatch[1].toLowerCase())) {
    return {
      error: {
        message: `ожидается «${kind} normal|lognormal|exponential|uniform|gamma|weibull», получено «${raw}»`,
        line: lineNo,
        col: 0,
      },
    };
  }
  const distribution = distMatch[1].toLowerCase() as DistributionName;
  rest = rest.slice(distMatch[0].length);
  const params: DistributionParams = {};
  let seriesName: string | undefined;
  let label: string | undefined;
  const seriesKey = /^(?:series\s*=\s*)"((?:[^"\\]|\\.)*)"\s*/i.exec(rest);
  if (seriesKey) {
    seriesName = seriesKey[1];
    rest = rest.slice(seriesKey[0].length);
  }
  for (let guard = 0; guard < 12; guard += 1) {
    const quoted = takeQuoted(rest);
    if (quoted.quoted !== undefined) {
      if (!seriesName && kind === "fit" && !label) seriesName = quoted.quoted;
      else label = quoted.quoted;
      rest = quoted.rest;
      continue;
    }
    const param = /^([a-z]+)\s*=\s*(-?[\d.]+)\s*/i.exec(rest);
    if (!param) break;
    const key = PARAM_ALIASES[param[1].toLowerCase()];
    if (!key) {
      return {
        error: {
          message: `неизвестный параметр «${param[1]}» у ${distribution}`,
          line: lineNo,
          col: 0,
        },
      };
    }
    params[key] = Number(param[2]);
    rest = rest.slice(param[0].length);
  }
  rest = rest.trim();
  if (rest) {
    if (!seriesName && kind === "fit") seriesName = unquoteExtText(rest);
    else if (!label) label = unquoteExtText(rest);
    else {
      return {
        error: { message: `лишний хвост «${rest}» в «${kind}»`, line: lineNo, col: 0 },
      };
    }
  }
  if (kind === "curve") {
    const missing = requiredParam(distribution, params);
    if (missing) {
      return {
        error: {
          message: `curve ${distribution}: не задан параметр ${missing}`,
          line: lineNo,
          col: 0,
        },
      };
    }
    const invalid = invalidParam(distribution, params);
    if (invalid) return { error: { message: invalid, line: lineNo, col: 0 } };
  }
  return {
    curve: {
      kind,
      distribution,
      seriesName,
      label,
      color: colorExtracted.color ? normalizeColorToHex(colorExtracted.color) : undefined,
      params,
      line: lineNo,
    },
  };
}

function requiredParam(name: DistributionName, params: DistributionParams): string | null {
  if (name === "normal" || name === "lognormal") {
    if (params.mu === undefined) return "mu";
    if (params.sigma === undefined) return "sigma";
  } else if (name === "exponential") {
    if (params.rate === undefined) return "rate";
  } else if (name === "uniform") {
    if (params.a === undefined) return "a";
    if (params.b === undefined) return "b";
  } else if (params.shape === undefined) return "shape";
  else if (params.scale === undefined) return "scale";
  return null;
}

function invalidParam(name: DistributionName, params: DistributionParams): string | null {
  if ((name === "normal" || name === "lognormal") && !(params.sigma! > 0)) {
    return `${name}: sigma должна быть больше нуля`;
  }
  if (name === "exponential" && !(params.rate! > 0)) return "exponential: rate должен быть больше нуля";
  if (name === "uniform" && !(params.b! > params.a!)) return "uniform: b должен быть больше a";
  if ((name === "gamma" || name === "weibull") && (!(params.shape! > 0) || !(params.scale! > 0))) {
    return `${name}: shape и scale должны быть больше нуля`;
  }
  return null;
}

function parseSeries(raw: string, lineNo: number): { series?: HistogramSeries; error?: ExtParseError } {
  const colon = raw.indexOf(":");
  if (colon < 0) {
    return {
      error: { message: `ожидается «series Имя : зн1, зн2, …», получено «${raw}»`, line: lineNo, col: 0 },
    };
  }
  const head = unquoteExtText(raw.slice(0, colon).replace(/^series\s*/i, ""));
  const colorExtracted = extractTrailingColorAttr(raw.slice(colon + 1), lineNo);
  if (colorExtracted.error) return { error: colorExtracted.error };
  const tokens = colorExtracted.rest.split(",").map((part) => classifyToken(part));
  if (tokens.length === 0 || tokens.every((token) => token.kind === "missing" && token.raw === "")) {
    return { error: { message: `серия «${head || "без имени"}» не содержит значений`, line: lineNo, col: 0 } };
  }
  return {
    series: {
      name: head,
      tokens,
      line: lineNo,
      color: colorExtracted.color ? normalizeColorToHex(colorExtracted.color) : undefined,
    },
  };
}

export function parseHistogram(source: string): ExtParseResult<HistogramModel> {
  const errors: ExtParseError[] = [];
  const lines = source.split(/\r?\n/);
  let title: string | undefined;
  let xAxis: HistogramModel["x"];
  let yAxis: HistogramModel["y"];
  let bins: BinSpec = { mode: "auto" };
  let binsSet = false;
  let widthSet = false;
  let scale: HistogramScale = "count";
  let gap: HistogramGap | undefined;
  let labels: HistogramLabelsMode = "none";
  let labelFontColor: string | undefined;
  let missing: MissingMode = "drop";
  let errorsMode: ErrorMode = "drop";
  let outliers: OutlierSpec = { method: "none", k: 0, action: "drop" };
  let ci = DEFAULT_CI_LEVEL;
  let stats: HistogramModel["stats"] = [...DEFAULT_STATS];
  let grid = true;
  let gridStep: number | undefined;
  let fontSize: number | undefined;
  let mono = false;
  let monoInvert = false;
  let rotate90 = false;
  let categoryAxis = true;
  let valueAxis = true;
  let ratio: ChartAspect | undefined;
  const namedColors: HistogramNamedColors = {};
  const seriesColors: Record<string, string> = {};
  const series: HistogramSeries[] = [];
  const curves: HistogramCurve[] = [];
  const levelLines: HistogramModel["lines"] = [];
  let seenType = false;

  const fail = (message: string, line: number) => {
    errors.push({ message, line, col: 0 });
  };

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].trim();
    const lineNo = i + 1;
    if (!raw || raw.startsWith("%%")) continue;
    if (!seenType) {
      seenType = true;
      continue;
    }

    if (/^title\b/i.test(raw)) {
      title = unquoteExtText(raw.replace(/^title\s*/i, "")) || undefined;
      continue;
    }
    if (/^x\b/i.test(raw) && !raw.includes(":")) {
      const parsed = axisRange(raw.slice(1).trim(), "x");
      if (parsed.error || !parsed.axis) fail(parsed.error ?? "неверная ось x", lineNo);
      else xAxis = parsed.axis;
      continue;
    }
    if (/^y\b/i.test(raw) && !raw.includes(":")) {
      const parsed = axisRange(raw.slice(1).trim(), "y");
      if (parsed.error || !parsed.axis) fail(parsed.error ?? "неверная ось y", lineNo);
      else yAxis = parsed.axis;
      continue;
    }
    if (/^bins\b/i.test(raw)) {
      const parsed = parseBins(raw.replace(/^bins\s*/i, ""));
      if (parsed.error || !parsed.bins) fail(parsed.error ?? "неверные бины", lineNo);
      else if (widthSet) fail("bins нельзя сочетать с binwidth", lineNo);
      else {
        bins = parsed.bins;
        binsSet = true;
      }
      continue;
    }
    if (/^binwidth\b/i.test(raw)) {
      const value = parseExtNumber(raw.replace(/^binwidth\s*/i, ""));
      if (value === null || !(value > 0)) fail(`ожидается «binwidth <положительное число>»`, lineNo);
      else if (binsSet) fail("binwidth нельзя сочетать с bins", lineNo);
      else {
        bins = { mode: "width", width: value };
        widthSet = true;
      }
      continue;
    }
    if (/^scale\b/i.test(raw)) {
      const value = raw.replace(/^scale\s*/i, "").trim().toLowerCase();
      if (value === "count" || value === "density") scale = value;
      else fail(`ожидается «scale count» или «scale density», получено «${value}»`, lineNo);
      continue;
    }
    if (/^gap\b/i.test(raw) && !raw.includes(":")) {
      const parsed = parseGap(raw.replace(/^gap\s*/i, "").trim());
      if (parsed.error || !parsed.gap) fail(parsed.error ?? "неверный gap", lineNo);
      else gap = parsed.gap;
      continue;
    }
    if (/^labels\b/i.test(raw) && !raw.includes(":")) {
      const body = raw.replace(/^labels\s*/i, "").trim();
      const taken = takeLabelFontColor(body);
      const tokens = taken.rest.toLowerCase().split(/\s+/).filter(Boolean);
      let mode: HistogramLabelsMode | undefined;
      let bad = false;
      for (const token of tokens) {
        if (token === "above" || token === "outside" || token === "on") mode = "above";
        else if (token === "inside") mode = "inside";
        else if (token === "none" || token === "off") mode = "none";
        else bad = true;
      }
      if (taken.error || bad || (tokens.length === 0 && !taken.fontColor)) {
        fail(taken.error ?? `ожидается «labels above|inside|none»`, lineNo);
      } else {
        if (mode) labels = mode;
        if (taken.fontColor) labelFontColor = taken.fontColor;
      }
      continue;
    }
    if (/^missing\b/i.test(raw)) {
      const value = raw.replace(/^missing\s*/i, "").trim().toLowerCase();
      if (value === "drop" || value === "mean" || value === "median" || value === "zero") missing = value;
      else fail(`ожидается «missing drop|mean|median|zero», получено «${value}»`, lineNo);
      continue;
    }
    if (/^errors\b/i.test(raw)) {
      const value = raw.replace(/^errors\s*/i, "").trim().toLowerCase();
      if (value === "drop" || value === "fail") errorsMode = value;
      else fail(`ожидается «errors drop» или «errors fail», получено «${value}»`, lineNo);
      continue;
    }
    if (/^outliers\b/i.test(raw)) {
      const parsed = parseOutliers(raw.replace(/^outliers\s*/i, ""));
      if (parsed.error || !parsed.outliers) fail(parsed.error ?? "неверные выбросы", lineNo);
      else outliers = parsed.outliers;
      continue;
    }
    if (/^ci\b/i.test(raw)) {
      const value = parseExtNumber(raw.replace(/^ci\s*/i, ""));
      if (value === null || !(value > 0) || !(value < 1)) {
        fail(`ожидается «ci <уровень от 0 до 1>», получено «${raw}»`, lineNo);
      } else ci = value;
      continue;
    }
    if (/^stats\b/i.test(raw)) {
      const parsed = parseStats(raw.replace(/^stats\s*/i, ""));
      if (parsed.error || parsed.stats === undefined) fail(parsed.error ?? "неверные показатели", lineNo);
      else stats = parsed.stats;
      continue;
    }
    if (/^grid\b/i.test(raw) && !raw.includes(":")) {
      const arg = raw.replace(/^grid\s*/i, "").trim().toLowerCase();
      if (!arg || arg === "on") {
        grid = true;
        gridStep = undefined;
      } else if (arg === "off") grid = false;
      else {
        const step = parseExtNumber(arg);
        if (step === null || !(step > 0)) fail(`ожидается «grid», «grid off» или «grid <шаг>»`, lineNo);
        else {
          grid = true;
          gridStep = step;
        }
      }
      continue;
    }
    if (/^axis\b/i.test(raw)) {
      const parts = raw.replace(/^axis\s*/i, "").trim().toLowerCase().split(/\s+/);
      const state = parts[parts.length - 1];
      const on = state === "on" || state === "true";
      const off = state === "off" || state === "false";
      if (!on && !off) fail(`ожидается «axis on|off» или «axis x|y on|off»`, lineNo);
      else if (parts.length === 1) {
        categoryAxis = on;
        valueAxis = on;
      } else if (parts[0] === "x") categoryAxis = on;
      else if (parts[0] === "y") valueAxis = on;
      else fail(`ожидается «axis x|y on|off»`, lineNo);
      continue;
    }
    if (/^fontsize\b/i.test(raw)) {
      const value = parseExtNumber(raw.replace(/^fontsize\s*/i, ""));
      if (value === null || !(value > 0)) fail(`ожидается «fontsize <положительное число>»`, lineNo);
      else fontSize = value;
      continue;
    }
    if (/^rotate\b/i.test(raw) || /^orientation\b/i.test(raw)) {
      const value = raw.replace(/^(?:rotate|orientation)\s*/i, "").trim().toLowerCase();
      if (value === "90" || value === "horizontal" || value === "on") rotate90 = true;
      else if (value === "0" || value === "vertical" || value === "off" || value === "") rotate90 = false;
      else fail(`ожидается «rotate 90» или «rotate 0»`, lineNo);
      continue;
    }
    if (/^mono\b/i.test(raw) && !raw.includes(":")) {
      const parsed = parseMonoDirective(raw, lineNo);
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.mono !== undefined) {
        mono = parsed.mono;
        monoInvert = Boolean(parsed.monoInvert);
      }
      continue;
    }
    if (/^colors\b/i.test(raw) && !raw.includes(":")) {
      const parsed = parseExtColorsDirective(raw.replace(/^colors\s*/i, ""), lineNo, COLOR_ALIASES);
      if (parsed.error) errors.push(parsed.error);
      else {
        Object.assign(seriesColors, parsed.seriesColors);
        Object.assign(namedColors, parsed.named);
      }
      continue;
    }
    if (/^(?:ratio|aspect)\b/i.test(raw)) {
      const parsed = parseAspectDirective(raw);
      if (!parsed) fail(`не удалось разобрать ratio`, lineNo);
      else if ("error" in parsed) fail(parsed.error, lineNo);
      else ratio = parsed.aspect;
      continue;
    }
    if (/^line\b/i.test(raw) && !raw.includes(":")) {
      const parsed = parseLine(raw.replace(/^line\b/i, ""), lineNo);
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.line) levelLines.push(parsed.line);
      continue;
    }
    if (/^series\b/i.test(raw)) {
      const parsed = parseSeries(raw, lineNo);
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.series) series.push(parsed.series);
      continue;
    }
    if (/^fit\b/i.test(raw)) {
      const parsed = parseCurve(raw, lineNo, "fit");
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.curve) curves.push(parsed.curve);
      continue;
    }
    if (/^curve\b/i.test(raw)) {
      const parsed = parseCurve(raw, lineNo, "curve");
      if (parsed.error) errors.push(parsed.error);
      else if (parsed.curve) curves.push(parsed.curve);
      continue;
    }
    if (isValidExtColor(raw)) {
      fail(`неизвестная директива «${raw.split(/\s+/)[0]}»`, lineNo);
      continue;
    }
    fail(
      `неизвестная директива «${raw.split(/\s+/)[0]}» (допустимы title, x, y, bins, binwidth, scale, gap, labels, missing, errors, outliers, ci, stats, grid, axis, fontsize, rotate, mono, colors, ratio, line, series, fit, curve)`,
      lineNo,
    );
  }

  if (series.length === 0 && errors.length === 0) {
    fail("нет данных: ожидается хотя бы одна серия «series Имя : зн1, зн2, …»", 1);
  }

  const cleanedBySeries = series.map((item) => cleanSample(item.tokens, missing, outliers));
  series.forEach((item, index) => {
    const cleaned = cleanedBySeries[index];
    if ("error" in cleaned) {
      fail(`${item.name || "серия"}: ${cleaned.error}`, item.line);
      return;
    }
    if (errorsMode === "fail") {
      const bad = item.tokens.find((token) => token.kind === "error");
      if (bad) fail(`ошибка в значении «${bad.raw}»`, item.line);
    }
    if (cleaned.values.length === 0 && errors.length === 0) {
      fail(`${item.name || "серия"}: после очистки не осталось чисел`, item.line);
    }
  });

  for (const curve of curves) {
    if (curve.kind !== "fit") continue;
    const owner = curve.seriesName
      ? series.find((item) => item.name === curve.seriesName)
      : series[series.length - 1];
    if (!owner) {
      fail(`fit: нет серии «${curve.seriesName}»`, curve.line);
      continue;
    }
    const cleaned = cleanedBySeries[series.indexOf(owner)];
    if (!cleaned || "error" in cleaned) continue;
    const fitted = fitDistribution(curve.distribution, cleaned.values);
    if ("error" in fitted) fail(`fit ${curve.distribution}: ${fitted.error}`, curve.line);
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    errors: [],
    value: {
      title,
      x: xAxis,
      y: yAxis,
      bins,
      scale,
      gap,
      labels,
      labelFontColor,
      missing,
      errors: errorsMode,
      outliers,
      ci,
      stats,
      grid,
      gridStep,
      fontSize,
      mono,
      monoInvert,
      rotate90,
      categoryAxis,
      valueAxis,
      namedColors,
      seriesColors,
      series,
      curves,
      lines: levelLines,
      ratio,
    },
  };
}
