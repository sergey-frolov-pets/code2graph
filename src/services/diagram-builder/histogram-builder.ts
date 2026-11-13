import type { DiagramBuilderState } from "./types";
import { parseHistogram } from "@/services/mermaid/ext/engines/histogram";
import { fmt } from "@/services/mermaid/ext/common";
import { formatCleanNumber } from "@/services/table-paste/parse-clipboard-grid";
import type { HistogramModel } from "@/services/mermaid/ext/engines/histogram";

const DEFAULT_FONT_SIZE = 11;
const DEFAULT_STATS = "mean median sd var ci";

function quoteIfNeeded(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '""';
  if (/[\s,]/.test(trimmed) && !(trimmed.startsWith('"') && trimmed.endsWith('"'))) {
    return `"${trimmed.replace(/"/g, '\\"')}"`;
  }
  return trimmed;
}

function formatGap(gap: { unit: "percent" | "ratio"; value: number } | undefined): string {
  if (!gap) return "";
  return gap.unit === "percent" ? `${fmt(gap.value)}%` : fmt(gap.value);
}

function formatEdges(edges: readonly number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    parts.push(`${fmt(edges[i])} --> ${fmt(edges[i + 1])}`);
  }
  return parts.join(", ");
}

function curveParams(curve: HistogramModel["curves"][number]): string {
  return Object.entries(curve.params)
    .filter((entry): entry is [string, number] => entry[1] !== undefined)
    .map(([key, value]) => `${key}=${fmt(value)}`)
    .join(" ");
}

export function applyHistogramBuilderState(
  state: DiagramBuilderState,
  source: string,
): DiagramBuilderState | null {
  const parsed = parseHistogram(source);
  if (!parsed.ok || !parsed.value) return null;
  const model = parsed.value;
  const canvas = state.canvas;
  const options = state.options;
  canvas.title = model.title ?? "";
  canvas.rotate90 = model.rotate90;
  canvas.fontSize = model.fontSize ?? DEFAULT_FONT_SIZE;
  canvas.xAxis.hidden = !model.categoryAxis;
  canvas.yAxis.hidden = !model.valueAxis;
  canvas.xAxis.label = model.x?.label ?? "";
  canvas.yAxis.label = model.y?.label ?? "";
  if (model.x?.min !== undefined && model.x.max !== undefined) {
    canvas.xAxis.autoRange = false;
    canvas.xAxis.min = fmt(model.x.min);
    canvas.xAxis.max = fmt(model.x.max);
  }
  if (model.y?.min !== undefined && model.y.max !== undefined) {
    canvas.yAxis.autoRange = false;
    canvas.yAxis.min = fmt(model.y.min);
    canvas.yAxis.max = fmt(model.y.max);
  }
  if (!model.grid) canvas.yAxis.gridMode = "off";
  else if (model.gridStep && model.gridStep > 0) {
    canvas.yAxis.gridMode = "fixed";
    canvas.yAxis.gridStep = fmt(model.gridStep);
  } else canvas.yAxis.gridMode = "auto";
  if (model.ratio) {
    const key = `${fmt(model.ratio.width)}x${fmt(model.ratio.height)}`;
    const presets = new Set(["16x9", "4x3", "1x1", "16x6", "21x9"]);
    canvas.aspectRatio = presets.has(key) ? key : "custom";
    canvas.customAspectWidth = String(model.ratio.width);
    canvas.customAspectHeight = String(model.ratio.height);
  }
  options.monoMode = model.monoInvert ? "invert" : model.mono ? "on" : "off";
  options.labelsMode = model.labels;
  options.labelFontColor = model.labelFontColor ?? "";
  options.barGap = formatGap(model.gap);
  options.namedColors.mean = model.namedColors.mean ?? "";
  options.namedColors.median = model.namedColors.median ?? "";
  options.namedColors.ci = model.namedColors.ci ?? "";
  options.seriesColors = [];
  Object.entries(model.seriesColors).forEach(([key, color]) => {
    const match = /^s(\d+)$/i.exec(key);
    if (!match) return;
    options.seriesColors[Number(match[1]) - 1] = color;
  });
  model.series.forEach((series, index) => {
    if (series.color) options.seriesColors[index] = series.color;
  });
  options.thresholds = model.lines.map((line) => ({
    value: fmt(line.value),
    label: line.label ?? "",
    color: line.color ?? "",
    width: line.width ? fmt(line.width) : "1.5",
    style: line.style ?? "dash",
  }));
  const histogram = options.histogram;
  histogram.binMode = model.bins.mode;
  histogram.binCount = model.bins.count !== undefined ? fmt(model.bins.count) : histogram.binCount;
  histogram.binWidth = model.bins.width !== undefined ? fmt(model.bins.width) : histogram.binWidth;
  histogram.binEdges = model.bins.edges ? formatEdges(model.bins.edges) : histogram.binEdges;
  histogram.scale = model.scale;
  histogram.missing = model.missing;
  histogram.errors = model.errors;
  histogram.outlierMethod = model.outliers.method;
  histogram.outlierK = model.outliers.method === "none" ? histogram.outlierK : fmt(model.outliers.k);
  histogram.outlierAction = model.outliers.action;
  histogram.ci = fmt(model.ci);
  histogram.stats = model.stats === "off" ? "off" : model.stats.join(" ");
  histogram.curves = model.curves.map((curve) => ({
    kind: curve.kind,
    distribution: curve.distribution,
    seriesName: curve.seriesName ?? "",
    label: curve.label ?? "",
    color: curve.color ?? "",
    params: curveParams(curve),
  }));

  const width = Math.max(...model.series.map((series) => series.tokens.length), 0);
  state.matrixHeaders = model.series.map((series, index) => series.name || `Series ${index + 1}`);
  state.matrixRows = Array.from({ length: width }, (_, row) => [
    String(row + 1),
    ...model.series.map((series) => series.tokens[row]?.raw ?? ""),
  ]);
  return state;
}

export function emitHistogramBuilderSource(state: DiagramBuilderState): string {
  const { canvas, options } = state;
  const histogram = options.histogram;
  const lines: string[] = ["histogram"];
  if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
  if (canvas.rotate90) lines.push("rotate 90");
  if (canvas.aspectRatio === "custom") {
    const width = Number(canvas.customAspectWidth);
    const height = Number(canvas.customAspectHeight);
    if (width > 0 && height > 0) lines.push(`ratio ${formatCleanNumber(width)}x${formatCleanNumber(height)}`);
  } else if (canvas.aspectRatio) lines.push(`ratio ${canvas.aspectRatio}`);
  if (canvas.fontSize && canvas.fontSize !== DEFAULT_FONT_SIZE) lines.push(`fontsize ${canvas.fontSize}`);
  if (options.monoMode === "on") lines.push("mono");
  if (options.monoMode === "invert") lines.push("mono invert");
  if (histogram.scale !== "count") lines.push(`scale ${histogram.scale}`);
  if (histogram.binMode === "count") lines.push(`bins ${histogram.binCount.trim() || "10"}`);
  else if (histogram.binMode === "width") lines.push(`binwidth ${histogram.binWidth.trim() || "5"}`);
  else if (histogram.binMode === "edges") lines.push(`bins ${histogram.binEdges.trim()}`);
  if (options.barGap.trim()) lines.push(`gap ${options.barGap.trim()}`);
  if (histogram.missing !== "drop") lines.push(`missing ${histogram.missing}`);
  if (histogram.errors !== "drop") lines.push(`errors ${histogram.errors}`);
  if (histogram.outlierMethod !== "none") {
    lines.push(
      `outliers ${histogram.outlierMethod} ${histogram.outlierK.trim() || "1.5"} ${histogram.outlierAction}`,
    );
  }
  if (histogram.ci.trim() && histogram.ci.trim() !== "0.95") lines.push(`ci ${histogram.ci.trim()}`);
  if (histogram.stats.trim() && histogram.stats.trim() !== DEFAULT_STATS) {
    lines.push(`stats ${histogram.stats.trim()}`);
  }
  const axisBits: string[] = [];
  if (!canvas.xAxis.autoRange) {
    const min = Number(canvas.xAxis.min);
    const max = Number(canvas.xAxis.max);
    if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
      const label = canvas.xAxis.label.trim()
        ? `"${canvas.xAxis.label.trim().replace(/"/g, '\\"')}" `
        : "";
      axisBits.push(`x ${label}${formatCleanNumber(min)} --> ${formatCleanNumber(max)}`);
    }
  } else if (canvas.xAxis.label.trim()) {
    axisBits.push(`x "${canvas.xAxis.label.trim().replace(/"/g, '\\"')}"`);
  }
  if (!canvas.yAxis.autoRange) {
    const min = Number(canvas.yAxis.min);
    const max = Number(canvas.yAxis.max);
    if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
      const label = canvas.yAxis.label.trim()
        ? `"${canvas.yAxis.label.trim().replace(/"/g, '\\"')}" `
        : "";
      axisBits.push(`y ${label}${formatCleanNumber(min)} --> ${formatCleanNumber(max)}`);
    }
  } else if (canvas.yAxis.label.trim()) {
    axisBits.push(`y "${canvas.yAxis.label.trim().replace(/"/g, '\\"')}"`);
  }
  lines.push(...axisBits);
  if (canvas.xAxis.hidden) lines.push("axis x off");
  if (canvas.yAxis.hidden) lines.push("axis y off");
  if (canvas.yAxis.gridMode === "off" && !canvas.yAxis.hidden) lines.push("grid off");
  else if (canvas.yAxis.gridMode === "fixed") {
    const step = Number(canvas.yAxis.gridStep);
    if (step > 0) lines.push(`grid ${formatCleanNumber(step)}`);
  }
  const labelTokens: string[] = [];
  if (options.labelsMode && options.labelsMode !== "none") labelTokens.push(options.labelsMode);
  if (options.labelFontColor.trim()) labelTokens.push(`fontcolor ${options.labelFontColor.trim()}`);
  if (labelTokens.length > 0) lines.push(`labels ${labelTokens.join(" ")}`);
  const colorTokens: string[] = [];
  options.seriesColors.forEach((color, index) => {
    if (color.trim()) colorTokens.push(`s${index + 1}=${color.trim()}`);
  });
  if (options.namedColors.mean.trim()) colorTokens.push(`mean=${options.namedColors.mean.trim()}`);
  if (options.namedColors.median.trim()) colorTokens.push(`median=${options.namedColors.median.trim()}`);
  if (options.namedColors.ci.trim()) colorTokens.push(`ci=${options.namedColors.ci.trim()}`);
  if (colorTokens.length > 0) lines.push(`colors ${colorTokens.join(" ")}`);
  for (const line of options.thresholds) {
    const value = Number(line.value);
    if (!Number.isFinite(value)) continue;
    const label = line.label.trim() ? ` "${line.label.trim().replace(/"/g, '\\"')}"` : "";
    const color = line.color.trim() ? ` color=${line.color.trim()}` : "";
    const width = line.width.trim() && line.width.trim() !== "1.5" ? ` width=${line.width.trim()}` : "";
    const style = line.style && line.style !== "dash" ? ` style=${line.style}` : "";
    lines.push(`line ${formatCleanNumber(value)}${label}${color}${width}${style}`);
  }
  const headers = state.matrixHeaders.length > 0 ? state.matrixHeaders : ["Series 1"];
  headers.forEach((header, index) => {
    const cells = state.matrixRows.map((row) => (row[index + 1] ?? "").trim());
    while (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();
    if (cells.length === 0) return;
    const color = (options.seriesColors[index] ?? "").trim();
    lines.push(
      `series ${quoteIfNeeded(header.trim() || `Series ${index + 1}`)} : ${cells.join(", ")}${
        color ? ` color=${color}` : ""
      }`,
    );
  });
  for (const curve of histogram.curves) {
    const distribution = curve.distribution.trim() || "normal";
    const name = curve.seriesName.trim() ? ` ${quoteIfNeeded(curve.seriesName.trim())}` : "";
    const params = curve.kind === "curve" && curve.params.trim() ? ` ${curve.params.trim()}` : "";
    const label = curve.label.trim() ? ` "${curve.label.trim().replace(/"/g, '\\"')}"` : "";
    const color = curve.color.trim() ? ` color=${curve.color.trim()}` : "";
    lines.push(`${curve.kind} ${distribution}${name}${params}${label}${color}`);
  }
  return lines.join("\n");
}
