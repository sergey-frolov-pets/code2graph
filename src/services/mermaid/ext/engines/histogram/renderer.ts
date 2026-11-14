import { growPlotToAspect } from "../../chart-aspect";
import {
  chartIsDark,
  normalizeColorToHex,
  readableTextOnFill,
  resolveSeriesColor,
} from "../../color-utils";
import {
  clamp,
  createSvg,
  drawLabelLines,
  fixedTicks,
  fmt,
  labelBlockExtra,
  measureLabelWidth,
  niceRange,
  niceTicks,
  resolvePalette,
  truncateLabel,
} from "../../common";
import type { ExtRenderOptions } from "../../types";
import type { WaterfallLineStyle } from "../waterfall/types";
import {
  CURVE_SAMPLE_COUNT,
  barHeight,
  binIndex,
  cleanSample,
  curveHeight,
  distributionPdf,
  fitDistribution,
  histogramCounts,
  outsideCount,
  resolveBinEdges,
  summarize,
  type CleanedSample,
  type DistributionParams,
} from "./stats";
import type { HistogramCurve, HistogramModel, HistogramSeries, StatName } from "./types";

const FONT_BASE = 11;
const FONT_MIN = 6;
const FONT_MAX = 28;
const PLOT_ALONG = 260;
const MIN_ACROSS = 360;
const BIN_SLOT_MIN = 28;
const PAD = { top: 46, right: 24, bottom: 58, left: 64 };
const BAR_OPACITY = 0.78;
const CI_OPACITY = 0.16;
const CURVE_WIDTH = 2;
const STATS_GAP = 20;
/** Зазор между торцом горизонтального столбца и подписью above. */
const ABOVE_LABEL_GAP = 6;
const LEGEND_ROW = 18;
const LEGEND_ITEM_GAP = 14;
const LINE_DASH: Record<WaterfallLineStyle, string | undefined> = {
  solid: undefined,
  dash: "7 4",
  dot: "1.5 3.5",
  dashdot: "8 3 1.5 3",
};

interface PreparedSeries {
  series: HistogramSeries;
  cleaned: CleanedSample;
  summary: ReturnType<typeof summarize>;
  counts: number[];
  color: string;
  outside: number;
}

interface PreparedCurve {
  curve: HistogramCurve;
  params: DistributionParams;
  n: number;
  color: string;
  label: string;
}

function gapRatio(model: HistogramModel): number {
  if (!model.gap) return 0;
  return model.gap.unit === "percent" ? model.gap.value / 100 : model.gap.value;
}

function shows(model: HistogramModel, name: StatName): boolean {
  return model.stats !== "off" && model.stats.includes(name);
}

export function renderHistogram(model: HistogramModel, options: ExtRenderOptions = {}): string {
  const palette = resolvePalette(options.dark, options.background, options.textColor);
  const fontSize = clamp(model.fontSize ?? FONT_BASE, FONT_MIN, FONT_MAX);
  const dark = chartIsDark(options.dark, model.monoInvert);
  const prepared = model.series.map((series, index) => {
    const cleaned = cleanSample(series.tokens, model.missing, model.outliers);
    if ("error" in cleaned) {
      throw new Error(`[histogram] ${cleaned.error}`);
    }
    return {
      series,
      cleaned,
      summary: summarize(cleaned.values, model.ci),
      counts: [] as number[],
      color: resolveSeriesColor(index, {
        explicitColor: series.color,
        seriesColors: model.seriesColors,
        mono: model.mono,
        dark,
      }),
      outside: 0,
    } satisfies PreparedSeries;
  });

  const pooled = prepared.flatMap((item) => item.cleaned.values);
  const edgesResult = resolveBinEdges(pooled, model.bins, model.x);
  if ("error" in edgesResult) throw new Error(`[histogram] ${edgesResult.error}`);
  const edges = edgesResult.edges;
  for (const item of prepared) {
    item.counts = histogramCounts(item.cleaned.values, edges);
    item.outside = outsideCount(item.cleaned.values, edges, model.x);
  }

  const curves: PreparedCurve[] = [];
  model.curves.forEach((curve, index) => {
    const owner = curve.seriesName
      ? prepared.find((item) => item.series.name === curve.seriesName)
      : prepared[prepared.length - 1];
    let params = curve.params;
    if (curve.kind === "fit") {
      if (!owner) throw new Error(`[histogram] нет серии для подбора`);
      const fitted = fitDistribution(curve.distribution, owner.cleaned.values);
      if ("error" in fitted) throw new Error(`[histogram] ${fitted.error}`);
      params = fitted.params;
    }
    const n = owner?.cleaned.values.length ?? prepared[0]?.cleaned.values.length ?? 0;
    curves.push({
      curve,
      params,
      n,
      color:
        curve.color ??
        owner?.color ??
        resolveSeriesColor(prepared.length + index, { mono: model.mono, dark }),
      label: curve.label || `${curve.kind} ${curve.distribution}`,
    });
  });

  const binWidths = edges.slice(0, -1).map((left, index) => edges[index + 1] - left);
  const dataSpan = binWidths.reduce((sum, width) => sum + width, 0) || 1;
  const across = Math.max(MIN_ACROSS, edges.length * BIN_SLOT_MIN);
  const along = PLOT_ALONG;
  const seriesCount = Math.max(1, prepared.length);
  const ratio = gapRatio(model);
  const titleExtra = model.title ? labelBlockExtra(model.title, fontSize + 2) : 0;
  const legendItems = legendEntries(prepared, curves);
  const lineLabelWidth = Math.max(
    0,
    ...model.lines.map((line) => (line.label && !model.rotate90 ? measureLabelWidth(line.label, fontSize - 1) : 0)),
  );
  const binLabel = model.categoryAxis ? fontSize + 10 : 4;
  const statsLines = model.stats === "off" ? 0 : prepared.reduce((sum, item) => sum + statLineCount(model, item) + 1, 0);
  const statsWidth =
    statsLines > 0
      ? Math.max(
          ...prepared.map((item) => measureLabelWidth(widestStat(model, item), fontSize - 1)),
        ) + 16
      : 0;
  const labelFont = Math.max(FONT_MIN, fontSize - 1);
  // При повороте подпись above стоит справа от торца и не должна залезать
  // в блок статистики или за край холста.
  let valueLabelRoom = 0;
  if (model.rotate90 && model.labels === "above") {
    let widest = 0;
    for (const item of prepared) {
      item.counts.forEach((count, index) => {
        const heightValue = barHeight(
          count,
          model.scale,
          item.cleaned.values.length,
          binWidths[index],
        );
        if (!(heightValue > 0)) return;
        widest = Math.max(widest, measureLabelWidth(fmt(heightValue), labelFont));
      });
    }
    if (widest > 0) valueLabelRoom = widest + ABOVE_LABEL_GAP + 4;
  }

  let plotAcross = across;
  let plotAlong = along;
  const padLeft = model.rotate90 ? PAD.left + (model.categoryAxis ? 72 : 8) : PAD.left;
  const padBottom = model.rotate90 ? PAD.bottom : PAD.bottom + binLabel;
  const legendAvail = Math.max(160, across + (lineLabelWidth > 0 ? lineLabelWidth + 8 : 0) + statsWidth);
  const legendRowCount = legendItems.length > 0 ? wrapLegend(legendItems, legendAvail, fontSize).length : 0;
  const legendExtra = legendRowCount > 0 ? legendRowCount * (LEGEND_ROW + 4) + 8 : 0;
  const lineLabelRoom = lineLabelWidth > 0 ? lineLabelWidth + 10 : 0;
  const padTop = PAD.top + titleExtra + legendExtra;
  const padRight =
    PAD.right + lineLabelRoom + valueLabelRoom + statsWidth + (statsWidth > 0 ? STATS_GAP : 0);
  if (model.ratio) {
    const grown = growPlotToAspect(
      {
        plotWidth: model.rotate90 ? plotAlong : plotAcross,
        plotHeight: model.rotate90 ? plotAcross : plotAlong,
        totalWidth: padLeft + (model.rotate90 ? plotAlong : plotAcross) + padRight,
        totalHeight: padTop + (model.rotate90 ? plotAcross : plotAlong) + padBottom,
      },
      model.ratio,
    );
    if (model.rotate90) {
      plotAlong = grown.plotWidth;
      plotAcross = grown.plotHeight;
    } else {
      plotAcross = grown.plotWidth;
      plotAlong = grown.plotHeight;
    }
  }

  const width = padLeft + (model.rotate90 ? plotAlong : plotAcross) + padRight;
  const height = padTop + (model.rotate90 ? plotAcross : plotAlong) + padBottom;
  const plotLeft = padLeft;
  const plotTop = padTop;
  const plotBottom = plotTop + (model.rotate90 ? plotAcross : plotAlong);

  const slotAt = (index: number) => (binWidths[index] / dataSpan) * plotAcross;
  const slotStart = (index: number) => {
    let cursor = 0;
    for (let i = 0; i < index; i += 1) cursor += slotAt(i);
    return cursor;
  };

  const heights: number[] = [0];
  prepared.forEach((item) => {
    item.counts.forEach((count, index) => {
      heights.push(barHeight(count, model.scale, item.cleaned.values.length, binWidths[index]));
    });
  });
  for (const line of model.lines) heights.push(line.value);
  const samples = sampleCurves(curves, edges, model.scale);
  for (const sample of samples) {
    for (const point of sample.points) {
      if (Number.isFinite(point.height)) heights.push(point.height);
    }
  }
  const rawMax = Math.max(...heights.filter((value) => Number.isFinite(value)), 0);
  const valueMin = model.y?.min ?? 0;
  // Шкала числа: даже пустая выборка занимает ось 0…1.
  // Плотность часто много меньше единицы, и тот же запас прижимает столбцы и pdf к нулю.
  const domainTop = model.scale === "density" ? rawMax : Math.max(rawMax, valueMin + 1);
  let auto = niceRange(valueMin, Math.max(domainTop, valueMin), 5);
  // Круглая верхняя граница совпадает с данными — столбик и линия уровня
  // прилипают к рамке и накрывают подпись. Добавляем один шаг шкалы.
  if (model.y?.max === undefined && auto.max <= rawMax + 1e-9) {
    const step = (auto.max - auto.min) / 5 || 1;
    auto = niceRange(valueMin, rawMax + step, 5);
  }
  const valueMax =
    model.y?.max ?? (model.scale === "density" ? auto.max : Math.max(auto.max, valueMin + 1));
  const span = valueMax - valueMin || 1;

  const binCoord = (offset: number) => (model.rotate90 ? plotTop + offset : plotLeft + offset);
  const valueCoord = (value: number) => {
    const t = clamp((value - valueMin) / span, 0, 1) * plotAlong;
    return model.rotate90 ? plotLeft + t : plotBottom - t;
  };
  const pointOf = (binOffset: number, value: number) =>
    model.rotate90
      ? { x: valueCoord(value), y: binCoord(binOffset) }
      : { x: binCoord(binOffset), y: valueCoord(value) };
  const baseline = valueCoord(Math.max(valueMin, 0));
  const binOffsetForValue = (value: number): number => {
    if (edges.length < 2) return 0;
    if (value <= edges[0]) return 0;
    const last = edges.length - 1;
    let offset = 0;
    for (let index = 0; index < last; index += 1) {
      const slot = slotAt(index);
      const right = edges[index + 1];
      if (value >= right && index < last - 1) {
        offset += slot;
        continue;
      }
      const spanWidth = right - edges[index] || 1;
      const t = clamp((value - edges[index]) / spanWidth, 0, 1);
      return offset + t * slot;
    }
    return plotAcross;
  };

  const svg = createSvg({
    width,
    height,
    palette,
    title: model.title,
    debugFrames: options.debugFrames,
  });

  if (model.title) {
    drawLabelLines(svg, width / 2, 18, model.title, fontSize + 2, {
      "font-size": fontSize + 2,
      "font-weight": 600,
      fill: palette.fg,
    });
  }

  drawLegend(svg, legendItems, plotLeft, padTop - legendExtra + 4, legendAvail, fontSize, palette.fg);

  const ticks =
    model.gridStep && model.gridStep > 0
      ? fixedTicks(valueMin, valueMax, model.gridStep)
      : niceTicks(valueMin, valueMax, 5);
  if (model.valueAxis) {
    for (const tick of ticks) {
      const at = valueCoord(tick);
      if (model.grid) {
        const from = model.rotate90
          ? { x1: at, y1: plotTop, x2: at, y2: plotTop + plotAcross }
          : { x1: plotLeft, y1: at, x2: plotLeft + plotAcross, y2: at };
        svg.line(from.x1, from.y1, from.x2, from.y2, {
          stroke: palette.grid,
          "stroke-width": 1,
          "stroke-dasharray": "3 3",
        });
      }
      const labelAt = model.rotate90
        ? { x: at, y: plotTop + plotAcross + fontSize + 4, anchor: "middle" }
        : { x: plotLeft - 8, y: at + fontSize * 0.35, anchor: "end" };
      svg.text(labelAt.x, labelAt.y, fmt(tick), {
        "text-anchor": labelAt.anchor,
        "font-size": fontSize,
        fill: palette.fgDim,
      });
    }
    if (model.y?.label) {
      if (model.rotate90) {
        svg.text(plotLeft + plotAlong / 2, height - 12, model.y.label, {
          "font-size": fontSize,
          fill: palette.fgDim,
        });
      } else {
        const cx = 16;
        const cy = plotTop + plotAlong / 2;
        drawLabelLines(svg, cx, cy, model.y.label, fontSize, {
          "text-anchor": "middle",
          "font-size": fontSize,
          fill: palette.fgDim,
          transform: `rotate(-90 ${fmt(cx)} ${fmt(cy)})`,
        }, "up");
      }
    }
  }

  const axisX1 = model.rotate90 ? plotLeft : plotLeft;
  const axisY1 = model.rotate90 ? plotTop : plotTop;
  svg.line(plotLeft, plotTop, plotLeft, plotTop + (model.rotate90 ? plotAcross : plotAlong), {
    stroke: palette.axis,
    "stroke-width": 1,
  });
  svg.line(
    plotLeft,
    plotTop + (model.rotate90 ? plotAcross : plotAlong),
    plotLeft + (model.rotate90 ? plotAlong : plotAcross),
    plotTop + (model.rotate90 ? plotAcross : plotAlong),
    { stroke: palette.axis, "stroke-width": 1 },
  );
  void axisX1;
  void axisY1;

  if (model.stats !== "off") {
    for (const item of prepared) {
      if (shows(model, "ci") && item.summary.ciLow !== undefined && item.summary.ciHigh !== undefined) {
      const offLow = binOffsetForValue(item.summary.ciLow);
      const offHigh = binOffsetForValue(item.summary.ciHigh);
      const bandA = pointOf(Math.min(offLow, offHigh), valueMin);
      const bandB = pointOf(Math.max(offLow, offHigh), valueMax);
      const color = normalizeColorToHex(model.namedColors.ci ?? item.color);
      svg.rect(
        Math.min(bandA.x, bandB.x),
        Math.min(bandA.y, bandB.y),
        Math.abs(bandB.x - bandA.x),
        Math.abs(bandB.y - bandA.y),
        { fill: color, opacity: CI_OPACITY },
      );
      }
    }
  }

  prepared.forEach((item, seriesIndex) => {
    item.counts.forEach((count, bin) => {
      const heightValue = barHeight(count, model.scale, item.cleaned.values.length, binWidths[bin]);
      if (!(heightValue > 0)) return;
      const slot = slotAt(bin);
      const thickness = slot / (seriesCount * (1 + ratio));
      const inner = thickness * ratio;
      const group = seriesCount * thickness + Math.max(0, seriesCount - 1) * inner;
      const origin = slotStart(bin) + (slot - group) / 2 + seriesIndex * (thickness + inner);
      const start = pointOf(origin, Math.max(valueMin, 0));
      const end = pointOf(origin, Math.max(valueMin, 0) + heightValue);
      const barX = model.rotate90 ? Math.min(start.x, end.x) : start.x;
      const barY = model.rotate90 ? start.y : Math.min(start.y, end.y);
      const barW = model.rotate90 ? Math.abs(end.x - start.x) : thickness;
      const barH = model.rotate90 ? thickness : Math.abs(end.y - start.y);
      svg.rect(barX, barY, Math.max(barW, 0), Math.max(barH, 0), {
        fill: item.color,
        opacity: BAR_OPACITY,
      });
      if (model.labels !== "none") {
        const text = fmt(heightValue);
        const inside = model.labels === "inside";
        const fill = labelFill(inside, item.color, model.labelFontColor, palette.fg, palette.bg);
        const anchor = inside
          ? pointOf(origin + thickness / 2, Math.max(valueMin, 0) + heightValue / 2)
          : pointOf(origin + thickness / 2, Math.max(valueMin, 0) + heightValue);
        // Горизонтальный столбец растёт вправо: above — сразу за торцом,
        // иначе середина подписи лежит на самом столбце.
        if (model.rotate90 && !inside) {
          svg.text(anchor.x + ABOVE_LABEL_GAP, anchor.y + labelFont * 0.35, text, {
            "font-size": labelFont,
            fill,
            "text-anchor": "start",
          });
        } else {
          const yShift = inside ? fontSize * 0.35 : -4;
          svg.text(anchor.x, anchor.y + yShift, text, {
            "font-size": labelFont,
            fill,
            "text-anchor": "middle",
          });
        }
      }
    });
  });
  if (model.categoryAxis) {
    binWidths.forEach((_, bin) => {
      const slot = slotAt(bin);
      const caption = truncateLabel(
        `${fmt(edges[bin])}–${fmt(edges[bin + 1])}`,
        Math.max(8, slot - 4),
        fontSize - 1,
      );
      const at = pointOf(slotStart(bin) + slot / 2, valueMin);
      if (model.rotate90) {
        svg.text(plotLeft - 8, at.y + fontSize * 0.3, caption, {
          "text-anchor": "end",
          "font-size": fontSize - 1,
          fill: palette.fgDim,
        });
      } else {
        svg.text(at.x, plotBottom + fontSize + 2, caption, {
          "font-size": fontSize - 1,
          fill: palette.fgDim,
        });
      }
    });
  }

  for (const sample of samples) {
    let path = "";
    let open = false;
    for (const point of sample.points) {
      if (!Number.isFinite(point.height)) {
        open = false;
        continue;
      }
      const at = pointOf(point.offset * plotAcross, point.height);
      path += `${open ? "L" : "M"}${fmt(at.x)} ${fmt(at.y)}`;
      open = true;
    }
    if (path) {
      svg.path(path, {
        fill: "none",
        stroke: sample.color,
        "stroke-width": CURVE_WIDTH,
      });
    }
  }

  if (model.stats !== "off") {
    for (const item of prepared) {
      drawMarker(svg, model, item, "mean", binOffsetForValue(item.summary.mean), valueMin, valueMax, pointOf);
      drawMarker(svg, model, item, "median", binOffsetForValue(item.summary.median), valueMin, valueMax, pointOf);
    }
  }

  for (const line of model.lines) {
    const at = valueCoord(line.value);
    const dash = LINE_DASH[line.style ?? "dash"];
    const color = line.color ? normalizeColorToHex(line.color) : palette.accent;
    if (model.rotate90) {
      svg.line(at, plotTop, at, plotTop + plotAcross, {
        stroke: color,
        "stroke-width": line.width ?? 1.5,
        ...(dash ? { "stroke-dasharray": dash } : {}),
      });
    } else {
      svg.line(plotLeft, at, plotLeft + plotAcross, at, {
        stroke: color,
        "stroke-width": line.width ?? 1.5,
        ...(dash ? { "stroke-dasharray": dash } : {}),
      });
    }
    if (line.label) {
      const labelAt = model.rotate90
        ? { x: at, y: plotTop - 4, anchor: "middle" }
        : { x: plotLeft + plotAcross + 6, y: at + (fontSize - 1) * 0.35, anchor: "start" };
      svg.text(labelAt.x, labelAt.y, line.label, {
        "text-anchor": labelAt.anchor,
        "font-size": fontSize - 1,
        fill: color,
      });
    }
  }

  if (model.stats !== "off" && statsWidth > 0) {
    let y = plotTop + fontSize;
    const x = model.rotate90
      ? plotLeft + plotAlong + valueLabelRoom + STATS_GAP
      : plotLeft + plotAcross + lineLabelRoom + STATS_GAP;
    for (const item of prepared) {
      for (const row of statRows(model, item)) {
        svg.text(x, y, row, {
          "text-anchor": "start",
          "font-size": fontSize - 1,
          fill: item.color,
        });
        y += fontSize + 3;
      }
      y += 6;
    }
  }

  if (model.x?.label && !model.rotate90) {
    svg.text(plotLeft + plotAcross / 2, height - 14, model.x.label, {
      "font-size": fontSize,
      fill: palette.fgDim,
    });
  }

  void baseline;
  return svg.toString();
}

function labelFill(
  inside: boolean,
  barColor: string,
  fontColor: string | undefined,
  fg: string,
  bg: string,
): string {
  if (fontColor && fontColor !== "auto") return fontColor;
  if (inside) return readableTextOnFill(barColor, fg);
  return fontColor === "auto" ? readableTextOnFill(bg, fg) : fg;
}

interface LegendEntry {
  color: string;
  label: string;
}

function legendEntries(series: PreparedSeries[], curves: PreparedCurve[]): LegendEntry[] {
  return [
    ...series.map((item) => ({
      color: item.color,
      label: item.series.name || "series",
    })),
    ...curves.map((item) => ({ color: item.color, label: item.label })),
  ];
}

function legendItemWidth(item: LegendEntry, fontSize: number): number {
  return 22 + measureLabelWidth(item.label, fontSize);
}

function wrapLegend(items: LegendEntry[], maxWidth: number, fontSize: number): LegendEntry[][] {
  const rows: LegendEntry[][] = [];
  let row: LegendEntry[] = [];
  let used = 0;
  for (const item of items) {
    const width = legendItemWidth(item, fontSize);
    if (row.length > 0 && used + width > maxWidth) {
      rows.push(row);
      row = [];
      used = 0;
    }
    row.push(item);
    used += width + LEGEND_ITEM_GAP;
  }
  if (row.length > 0) rows.push(row);
  return rows;
}

function drawLegend(
  svg: ReturnType<typeof createSvg>,
  items: LegendEntry[],
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  fg: string,
): void {
  const rows = wrapLegend(items, maxWidth, fontSize);
  rows.forEach((row, index) => {
    let cursor = x;
    const rowY = y + index * (LEGEND_ROW + 4);
    for (const item of row) {
      svg.rect(cursor, rowY - fontSize + 2, 10, 10, { fill: item.color });
      svg.text(cursor + 14, rowY, item.label, {
        "text-anchor": "start",
        "font-size": fontSize,
        fill: fg,
      });
      cursor += legendItemWidth(item, fontSize) + LEGEND_ITEM_GAP;
    }
  });
}

function drawMarker(
  svg: ReturnType<typeof createSvg>,
  model: HistogramModel,
  item: PreparedSeries,
  name: "mean" | "median",
  binOffset: number,
  valueMin: number,
  valueMax: number,
  pointOf: (offset: number, value: number) => { x: number; y: number },
): void {
  if (!shows(model, name)) return;
  const color = normalizeColorToHex(
    (name === "mean" ? model.namedColors.mean : model.namedColors.median) ?? item.color,
  );
  const at = pointOf(binOffset, valueMin);
  const end = pointOf(binOffset, valueMax);
  svg.line(at.x, at.y, end.x, end.y, {
    stroke: color,
    "stroke-width": name === "mean" ? 1.75 : 1.25,
    ...(name === "median" ? { "stroke-dasharray": "5 4" } : {}),
    opacity: 0.9,
  });
}

function sampleCurves(
  curves: PreparedCurve[],
  edges: number[],
  scale: HistogramModel["scale"],
): Array<{ color: string; points: Array<{ offset: number; height: number }> }> {
  const domainLeft = edges[0];
  const domainRight = edges[edges.length - 1];
  const span = domainRight - domainLeft || 1;
  const dataSpan = span;
  return curves.map((curve) => {
    const points: Array<{ offset: number; height: number }> = [];
    for (let i = 0; i < CURVE_SAMPLE_COUNT; i += 1) {
      const t = i / (CURVE_SAMPLE_COUNT - 1);
      const x = domainLeft + t * span;
      const index = binIndex(x, edges);
      if (index === null) continue;
      const width = edges[index + 1] - edges[index];
      const pdf = distributionPdf(curve.curve.distribution, x, curve.params);
      let offset = 0;
      for (let bin = 0; bin < index; bin += 1) offset += edges[bin + 1] - edges[bin];
      offset += x - edges[index];
      const pixelFraction = dataSpan > 0 ? offset / dataSpan : 0;
      points.push({
        offset: pixelFraction,
        height: curveHeight(pdf, scale, curve.n, width),
      });
    }
    return { color: curve.color, points };
  });
}

function statLineCount(model: HistogramModel, item: PreparedSeries): number {
  return statRows(model, item).length;
}

function widestStat(model: HistogramModel, item: PreparedSeries): string {
  return statRows(model, item).reduce((best, row) => (row.length > best.length ? row : best), "");
}

function statRows(model: HistogramModel, item: PreparedSeries): string[] {
  const summary = item.summary;
  const rows = [item.series.name || "series", `n ${summary.n}`];
  if (item.cleaned.missingCount > 0) rows.push(`missing ${item.cleaned.missingCount}`);
  if (item.cleaned.errorCount > 0) rows.push(`errors ${item.cleaned.errorCount}`);
  if (item.cleaned.outlierCount > 0) rows.push(`outliers ${item.cleaned.outlierCount}`);
  if (item.cleaned.imputedCount > 0) rows.push(`imputed ${item.cleaned.imputedCount}`);
  if (item.outside > 0) rows.push(`outside ${item.outside}`);
  const write = (name: StatName, text: string) => {
    if (shows(model, name)) rows.push(text);
  };
  write("mean", `mean ${fmt(summary.mean)}`);
  write("median", `median ${fmt(summary.median)}`);
  write("sd", `sd ${fmt(summary.sd)}`);
  write("var", `var ${fmt(summary.variance)}`);
  if (shows(model, "ci") && summary.ciLow !== undefined && summary.ciHigh !== undefined) {
    rows.push(`ci ${fmt(summary.ciLow)}..${fmt(summary.ciHigh)}`);
  }
  write("min", `min ${fmt(summary.min)}`);
  write("max", `max ${fmt(summary.max)}`);
  write("q1", `q1 ${fmt(summary.q1)}`);
  write("q3", `q3 ${fmt(summary.q3)}`);
  write("iqr", `iqr ${fmt(summary.iqr)}`);
  write("skew", `skew ${fmt(summary.skew)}`);
  write("kurtosis", `kurtosis ${fmt(summary.kurtosis)}`);
  return rows;
}
