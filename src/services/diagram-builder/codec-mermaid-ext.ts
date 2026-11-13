import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramTypeTag } from "@/constants/diagram-example-catalog";
import { parseBoxplot } from "@/services/mermaid/ext/engines/boxplot";
import { parseBubble } from "@/services/mermaid/ext/engines/bubble";
import { parseClustered } from "@/services/mermaid/ext/engines/series";
import { parseEv } from "@/services/mermaid/ext/engines/ev";
import { parseHeatmap } from "@/services/mermaid/ext/engines/heatmap";
import { parseOrgchart } from "@/services/mermaid/ext/engines/orgchart";
import { parsePowermap } from "@/services/mermaid/ext/engines/powermap";
import { AVATAR_DEFAULT_PX } from "@/services/mermaid/ext/engines/avatar";
import { parseRadar } from "@/services/mermaid/ext/engines/radar";
import { parseTreemap } from "@/services/mermaid/ext/engines/treemap";
import { parseVoronoi } from "@/services/mermaid/ext/engines/voronoi";
import { parseWaterfall } from "@/services/mermaid/ext/engines/waterfall/parser";
import {
  applyHistogramBuilderState,
  emitHistogramBuilderSource,
} from "./histogram-builder";
import { fmt } from "@/services/mermaid/ext/common";
import { formatCleanNumber } from "@/services/table-paste/parse-clipboard-grid";
import { createDefaultDiagramAppearance } from "./builder-appearance";
import { getDiagramBuilderSchema } from "./schemas";
import type {
  BuilderAxisConfig,
  BuilderCanvasSettings,
  BuilderOptionsSettings,
  DiagramBuilderState,
} from "./types";

const DEFAULT_FONT_SIZE = 11;

function formatBarGap(gap: { unit: "px" | "ratio" | "percent"; value: number } | undefined): string {
  if (!gap) return "";
  return gap.unit === "percent" ? `${fmt(gap.value)}%` : fmt(gap.value);
}

function emitAxisAndGrid(
  lines: string[],
  canvas: { xAxis: { hidden: boolean }; yAxis: { hidden: boolean; gridMode: string; gridStep: string } },
  y2?: { hidden: boolean; gridMode: string; gridStep: string },
): void {
  if (canvas.xAxis.hidden) lines.push("axis x off");
  if (canvas.yAxis.hidden) lines.push("axis y off");
  if (y2?.hidden) lines.push("axis y2 off");
  if (canvas.yAxis.gridMode === "off") {
    if (!canvas.yAxis.hidden) lines.push("grid off");
  } else if (canvas.yAxis.gridMode === "fixed") {
    const step = Number(canvas.yAxis.gridStep);
    if (Number.isFinite(step) && step > 0) lines.push(`grid ${formatCleanNumber(step)}`);
  } else if (canvas.yAxis.hidden) {
    lines.push("grid");
  }
  if (!y2) return;
  if (y2.gridMode === "off") {
    if (!y2.hidden) return;
  } else if (y2.gridMode === "fixed") {
    const step = Number(y2.gridStep);
    if (Number.isFinite(step) && step > 0) lines.push(`grid y2 ${formatCleanNumber(step)}`);
    else if (y2.hidden) lines.push("grid y2");
  } else {
    lines.push("grid y2");
  }
}
const DEFAULT_RADAR_RINGS = 4;
const DEFAULT_RADAR_FILL = 0.22;

export function createDefaultAxisConfig(): BuilderAxisConfig {
  return {
    enabled: true,
    label: "",
    autoRange: true,
    min: "0",
    max: "100",
    hidden: false,
    gridMode: "auto",
    gridStep: "",
  };
}

export function createDefaultBuilderState(
  format: DiagramFormat,
  diagramType: DiagramTypeTag,
): DiagramBuilderState {
  const schema = getDiagramBuilderSchema(format, diagramType);

  const canvas: BuilderCanvasSettings = {
    title: "",
    direction: "TB",
    rotate90: false,
    invertY: false,
    aspectRatio: "",
    customAspectWidth: "16",
    customAspectHeight: "9",
    fontSize: DEFAULT_FONT_SIZE,
    background: "",
    textColor: "",
    autoTextColor: true,
    xAxis: createDefaultAxisConfig(),
    yAxis: createDefaultAxisConfig(),
    sizeLabel: "",
    midX: "",
    midY: "",
    quadrants: ["", "", "", ""],
    radarMin: "0",
    radarMax: "100",
    radarRings: DEFAULT_RADAR_RINGS,
    ganttDateFormat: "YYYY-MM-DD",
    ganttAxisFormat: "",
    ganttExcludes: "",
    ganttLanguage: "",
    ganttProjectStarts: "",
    ganttScale: "",
    ganttZoom: "",
    ganttClosedWeekends: false,
    ganttTodayMarker: "",
    ganttInclusiveEndDates: false,
    blockColumns: 3,
  };

  const options: BuilderOptionsSettings = {
    labelsMode:
      diagramType === "treemap" ? "both" : diagramType === "histogram" ? "none" : "above",
    connectors: true,
    stacked: false,
    stackArea: false,
    showSum: false,
    labelFontColor: "",
    barGap: "",
    y2Hidden: false,
    y2GridMode: "off",
    y2GridStep: "",
    showData: true,
    showSites: true,
    showLabels: true,
    radarDots: true,
    radarFillOpacity: DEFAULT_RADAR_FILL,
    monoMode: "off",
    namedColors: {
      total: "",
      increase: "",
      decrease: "",
      box: "",
      median: "",
      whisker: "",
      outlier: "",
      mean: "",
      ci: "",
    },
    histogram: {
      binMode: "auto",
      binCount: "10",
      binWidth: "5",
      binEdges: "0 --> 10, 10 --> 20",
      scale: "count",
      missing: "drop",
      errors: "drop",
      outlierMethod: "none",
      outlierK: "1.5",
      outlierAction: "drop",
      ci: "0.95",
      stats: "mean median sd var ci",
      curves: [],
    },
    seriesColors: [],
    heatmapAutoScale: true,
    heatmapBands: [
      { from: "0", to: "40", openEnded: false, color: "#e8f5e9" },
      { from: "40", to: "70", openEnded: false, color: "#fff3e0" },
      { from: "70", to: "", openEnded: true, color: "#ffebee" },
    ],
    breaks: [],
    thresholds: [],
    cagrs: [],
    company: "",
    showLegend: true,
    avatarSize: "",
    powerLinks: [],
  };

  const initialColCount = diagramType === "radar" ? 3 : 2;
  const rows =
    schema.tableMode === "rows"
      ? [
          schema.columns.map((col) =>
            col.type === "select" ? (col.options?.[0]?.value ?? "") : "",
          ),
        ]
      : [];
  const matrixHeaders =
    schema.tableMode === "matrix"
      ? Array.from({ length: initialColCount }, () => "")
      : [];
  const matrixRows =
    schema.tableMode === "matrix"
      ? [["", ...Array.from({ length: initialColCount }, () => "")]]
      : [];
  const graphNodes: DiagramBuilderState["graphNodes"] = [];
  const graphEdges =
    schema.tableMode === "graph-ir"
      ? [{ source: "", target: "", kind: "arrow", label: "" }]
      : [];

  return {
    format,
    diagramType,
    tableMode: schema.tableMode,
    rows,
    matrixHeaders,
    matrixRows,
    graphNodes,
    graphEdges,
    canvas,
    options,
    appearance: createDefaultDiagramAppearance(),
    preservedComments: [],
  };
}

function aspectRatioToString(
  ratio: { width: number; height: number } | undefined,
): { preset: string; customW: string; customH: string } {
  if (!ratio) {
    return { preset: "", customW: "16", customH: "9" };
  }
  const key = `${fmt(ratio.width)}x${fmt(ratio.height)}`;
  const presets = new Set(["16x9", "4x3", "1x1", "16x6", "21x9"]);
  if (presets.has(key)) {
    return { preset: key, customW: String(ratio.width), customH: String(ratio.height) };
  }
  return {
    preset: "custom",
    customW: String(ratio.width),
    customH: String(ratio.height),
  };
}

function extractLeadingComments(source: string): string[] {
  const comments: string[] = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith("%%")) {
      comments.push(trimmed);
    }
  }
  return comments;
}

function extractSeriesColorsArray(map: Record<string, string> | undefined): string[] {
  if (!map) return [];
  const entries = Object.entries(map)
    .map(([key, color]) => {
      const m = /^s(\d+)$/i.exec(key);
      return m ? { idx: Number(m[1]) - 1, color } : null;
    })
    .filter((item): item is { idx: number; color: string } => item !== null && item.idx >= 0);

  if (entries.length === 0) return [];
  const maxIdx = Math.max(...entries.map((e) => e.idx));
  const out = Array.from({ length: maxIdx + 1 }, () => "");
  for (const entry of entries) {
    out[entry.idx] = entry.color;
  }
  return out;
}

export function parseMermaidExtToBuilderState(
  source: string,
  diagramType: DiagramTypeTag,
): DiagramBuilderState | null {
  const state = createDefaultBuilderState("mermaid", diagramType);
  state.preservedComments = extractLeadingComments(source);

  switch (diagramType) {
    case "waterfall": {
      const parsed = parseWaterfall(source);
      if (!parsed.ok || !parsed.value) return null;
      const model = parsed.value;
      state.canvas.title = model.title ?? "";
      state.canvas.fontSize = model.fontSize ?? DEFAULT_FONT_SIZE;
      state.canvas.background = model.background ?? "";
      state.canvas.textColor = model.textColor ?? "";
      state.canvas.autoTextColor = !model.textColor;

      const aspect = aspectRatioToString(model.ratio);
      state.canvas.aspectRatio = aspect.preset;
      state.canvas.customAspectWidth = aspect.customW;
      state.canvas.customAspectHeight = aspect.customH;

      state.canvas.yAxis.label = model.axis.label ?? "";
      state.canvas.yAxis.autoRange = Boolean(model.axis.auto);
      state.canvas.yAxis.min = fmt(model.axis.min);
      state.canvas.yAxis.max = fmt(model.axis.max);
      state.canvas.yAxis.hidden = Boolean(model.axis.hidden);
      state.canvas.xAxis.hidden = Boolean(model.categoryAxisHidden);
      state.options.barGap = formatBarGap(model.barGap);
      state.options.labelFontColor = model.labelFontColor ?? "";
      if (!model.axis.grid) {
        state.canvas.yAxis.gridMode = "off";
      } else if (model.axis.gridStep && model.axis.gridStep > 0) {
        state.canvas.yAxis.gridMode = "fixed";
        state.canvas.yAxis.gridStep = fmt(model.axis.gridStep);
      } else {
        state.canvas.yAxis.gridMode = "auto";
      }

      if (model.valueLabels.above && model.valueLabels.inside) {
        state.options.labelsMode = "both";
      } else if (model.valueLabels.inside) {
        state.options.labelsMode = "inside";
      } else if (!model.valueLabels.above && !model.valueLabels.inside) {
        state.options.labelsMode = "none";
      } else {
        state.options.labelsMode = "above";
      }

      state.options.connectors = model.connectors;
      state.options.monoMode = model.monoInvert
        ? "invert"
        : model.mono
          ? "on"
          : "off";

      if (model.colors) {
        state.options.namedColors.total = model.colors.total ?? "";
        state.options.namedColors.increase = model.colors.increase ?? "";
        state.options.namedColors.decrease = model.colors.decrease ?? "";
      }
      state.options.seriesColors = extractSeriesColorsArray(model.seriesColors);

      state.options.breaks = model.breaks.map((b) => ({
        after: fmt(b.after),
        before: fmt(b.before),
        label: b.label ?? "",
      }));

      state.options.thresholds = (model.lines ?? []).map((l) => ({
        value: fmt(l.value),
        label: l.label ?? "",
        color: l.color ?? "",
        width: l.width ? fmt(l.width) : "1.5",
        style: l.style ?? "dash",
      }));

      // Re-read raw steps from source so we preserve `= : subtotal` vs explicit `=100`
      const rows: string[][] = [];
      let currentSeriesName = "";
      for (const rawLine of source.split(/\r?\n/)) {
        const trimmed = rawLine.trim();
        if (!trimmed || trimmed.startsWith("%%")) continue;
        if (/^series\b/i.test(trimmed)) {
          currentSeriesName = trimmed
            .replace(/^series\s*/i, "")
            .replace(/\s+color=\S+\s*$/i, "")
            .replace(/^"|"$/g, "")
            .trim();
          continue;
        }
        const stepMatch = /^([=+-])\s*(-?[\d\s_.,]+)?\s*:\s*(.*)$/.exec(trimmed);
        if (!stepMatch) continue;
        const sign = stepMatch[1];
        const numRaw = (stepMatch[2] ?? "").trim();
        let restLabel = stepMatch[3].trim();
        let labelPos = "";
        if (/\bno-label\b/i.test(restLabel)) {
          labelPos = "no-label";
          restLabel = restLabel.replace(/\s*\bno-label\b/gi, "").trim();
        } else {
          const hasInside = /\binside(?:=\S+|\b)/i.test(restLabel);
          const hasAbove = /\babove(?:=\S+|\b)/i.test(restLabel);
          if (hasInside && hasAbove) labelPos = "both";
          else if (hasInside) labelPos = "inside";
          else if (hasAbove) labelPos = "above";
          restLabel = restLabel
            .replace(/\s*\b(?:inside|above|label)(?:="[^"]*"|=\S+)?/gi, "")
            .trim();
        }

        if (sign === "=" && !numRaw) {
          rows.push([restLabel, "=subtotal", "", labelPos, currentSeriesName]);
        } else if (sign === "=") {
          rows.push([restLabel, "=", numRaw.replace(",", "."), labelPos, currentSeriesName]);
        } else if (sign === "+") {
          rows.push([
            restLabel,
            "+",
            numRaw.replace(/^[+-]/, "").replace(",", "."),
            labelPos,
            currentSeriesName,
          ]);
        } else {
          rows.push([
            restLabel,
            "-",
            numRaw.replace(/^[+-]/, "").replace(",", "."),
            labelPos,
            currentSeriesName,
          ]);
        }
      }

      state.rows = rows;
      return state;
    }

    case "bubble": {
      const parsed = parseBubble(source);
      if (!parsed.ok || !parsed.value) return null;
      const model = parsed.value;
      state.canvas.title = model.title ?? "";
      state.canvas.fontSize = model.fontSize ?? DEFAULT_FONT_SIZE;
      const aspect = aspectRatioToString(model.ratio);
      state.canvas.aspectRatio = aspect.preset;
      state.canvas.customAspectWidth = aspect.customW;
      state.canvas.customAspectHeight = aspect.customH;

      state.canvas.xAxis.label = model.x.label ?? "";
      state.canvas.xAxis.autoRange = false;
      state.canvas.xAxis.min = fmt(model.x.min);
      state.canvas.xAxis.max = fmt(model.x.max);

      state.canvas.yAxis.label = model.y.label ?? "";
      state.canvas.yAxis.autoRange = false;
      state.canvas.yAxis.min = fmt(model.y.min);
      state.canvas.yAxis.max = fmt(model.y.max);

      state.canvas.sizeLabel = model.sizeLabel ?? "";
      state.canvas.midX = fmt(model.mid.x);
      state.canvas.midY = fmt(model.mid.y);
      if (model.quadrants) {
        state.canvas.quadrants = [...model.quadrants];
      }

      state.options.monoMode = model.monoInvert
        ? "invert"
        : model.mono
          ? "on"
          : "off";

      state.rows = model.points.map((pt) => [
        pt.label,
        fmt(pt.x),
        fmt(pt.y),
        fmt(pt.size),
        pt.group ?? "",
      ]);
      return state;
    }

    case "heatmap": {
      const parsed = parseHeatmap(source);
      if (!parsed.ok || !parsed.value) return null;
      const model = parsed.value;
      state.canvas.title = model.title ?? "";
      const aspect = aspectRatioToString(model.ratio);
      state.canvas.aspectRatio = aspect.preset;
      state.canvas.customAspectWidth = aspect.customW;
      state.canvas.customAspectHeight = aspect.customH;

      state.options.monoMode = model.monoInvert
        ? "invert"
        : model.mono
          ? "on"
          : "off";
      state.options.heatmapAutoScale = model.scaleAuto;
      if (!model.scaleAuto && model.scale.length > 0) {
        state.options.heatmapBands = model.scale.map((b) => ({
          from: fmt(b.from),
          to: b.to !== null ? fmt(b.to) : "",
          openEnded: b.to === null,
          color: b.color,
        }));
      }

      state.matrixHeaders = [...model.x];
      state.matrixRows = model.rows.map((r) => [
        r.label,
        ...r.values.map((v) => (v === null ? "" : fmt(v))),
      ]);
      return state;
    }

    case "boxplot": {
      const parsed = parseBoxplot(source);
      if (!parsed.ok || !parsed.value) return null;
      const model = parsed.value;
      state.canvas.title = model.title ?? "";
      state.canvas.fontSize = model.fontSize ?? DEFAULT_FONT_SIZE;
      const aspect = aspectRatioToString(model.ratio);
      state.canvas.aspectRatio = aspect.preset;
      state.canvas.customAspectWidth = aspect.customW;
      state.canvas.customAspectHeight = aspect.customH;

      if (model.y) {
        state.canvas.yAxis.label = model.y.label ?? "";
        if (model.y.min !== undefined && model.y.max !== undefined) {
          state.canvas.yAxis.autoRange = false;
          state.canvas.yAxis.min = fmt(model.y.min);
          state.canvas.yAxis.max = fmt(model.y.max);
        }
      }
      if (!model.grid) {
        state.canvas.yAxis.gridMode = "off";
      } else if (model.gridStep && model.gridStep > 0) {
        state.canvas.yAxis.gridMode = "fixed";
        state.canvas.yAxis.gridStep = fmt(model.gridStep);
      } else {
        state.canvas.yAxis.gridMode = "auto";
      }

      state.options.monoMode = model.monoInvert
        ? "invert"
        : model.mono
          ? "on"
          : "off";
      state.options.namedColors.box = model.colors.box ?? "";
      state.options.namedColors.median = model.colors.median ?? "";
      state.options.namedColors.whisker = model.colors.whisker ?? "";
      state.options.namedColors.outlier = model.colors.outlier ?? "";
      state.options.seriesColors = extractSeriesColorsArray(model.seriesColors);

      state.rows = model.items.map((item) => [
        item.label,
        fmt(item.min),
        fmt(item.q1),
        fmt(item.median),
        fmt(item.q3),
        fmt(item.max),
        item.color ?? "",
      ]);
      return state;
    }

    case "treemap": {
      const parsed = parseTreemap(source);
      if (!parsed.ok || !parsed.value) return null;
      const model = parsed.value;
      state.canvas.title = model.title ?? "";
      state.canvas.fontSize = model.fontSize ?? DEFAULT_FONT_SIZE;
      const aspect = aspectRatioToString(model.ratio);
      state.canvas.aspectRatio = aspect.preset;
      state.canvas.customAspectWidth = aspect.customW;
      state.canvas.customAspectHeight = aspect.customH;

      state.options.labelsMode = model.labels;
      state.options.monoMode = model.monoInvert
        ? "invert"
        : model.mono
          ? "on"
          : "off";
      state.options.seriesColors = extractSeriesColorsArray(model.seriesColors);

      const rows: string[][] = [];
      for (const grp of model.groups) {
        for (const leaf of grp.items) {
          rows.push([
            grp.name ?? "",
            leaf.label,
            fmt(leaf.value),
            leaf.color ?? grp.color ?? "",
          ]);
        }
      }
      state.rows = rows;
      return state;
    }

    case "radar": {
      const parsed = parseRadar(source);
      if (!parsed.ok || !parsed.value) return null;
      const model = parsed.value;
      state.canvas.title = model.title ?? "";
      state.canvas.fontSize = model.fontSize ?? DEFAULT_FONT_SIZE;
      const aspect = aspectRatioToString(model.ratio);
      state.canvas.aspectRatio = aspect.preset;
      state.canvas.customAspectWidth = aspect.customW;
      state.canvas.customAspectHeight = aspect.customH;
      state.canvas.radarMin = fmt(model.min);
      state.canvas.radarMax = fmt(model.max);
      state.canvas.radarRings = model.rings;

      state.options.radarDots = model.dots;
      state.options.radarFillOpacity = model.fillOpacity;
      state.options.monoMode = model.monoInvert
        ? "invert"
        : model.mono
          ? "on"
          : "off";
      state.options.seriesColors = extractSeriesColorsArray(model.seriesColors);
      model.series.forEach((s, idx) => {
        if (s.color) {
          state.options.seriesColors[idx] = s.color;
        }
      });

      state.matrixHeaders = [...model.axes];
      state.matrixRows = model.series.map((s) => [
        s.name,
        ...s.values.map((v) => fmt(v)),
      ]);
      return state;
    }

    case "voronoi": {
      const parsed = parseVoronoi(source);
      if (!parsed.ok || !parsed.value) return null;
      const model = parsed.value;
      state.canvas.title = model.title ?? "";
      state.canvas.fontSize = model.fontSize ?? DEFAULT_FONT_SIZE;
      const aspect = aspectRatioToString(model.ratio);
      state.canvas.aspectRatio = aspect.preset;
      state.canvas.customAspectWidth = aspect.customW;
      state.canvas.customAspectHeight = aspect.customH;

      state.canvas.xAxis.label = model.x.label ?? "";
      state.canvas.xAxis.autoRange = false;
      state.canvas.xAxis.min = fmt(model.x.min);
      state.canvas.xAxis.max = fmt(model.x.max);

      state.canvas.yAxis.label = model.y.label ?? "";
      state.canvas.yAxis.autoRange = false;
      state.canvas.yAxis.min = fmt(model.y.min);
      state.canvas.yAxis.max = fmt(model.y.max);

      state.options.showSites = model.showSites;
      state.options.showLabels = model.showLabels;
      state.options.monoMode = model.monoInvert
        ? "invert"
        : model.mono
          ? "on"
          : "off";
      state.options.seriesColors = extractSeriesColorsArray(model.seriesColors);

      state.rows = model.sites.map((site) => [
        site.label,
        fmt(site.x),
        fmt(site.y),
        site.group ?? "",
        site.color ?? "",
      ]);
      return state;
    }

    case "orgchart": {
      const parsed = parseOrgchart(source);
      if (!parsed.ok || !parsed.value) return null;
      const model = parsed.value;
      state.canvas.title = model.title ?? "";
      const aspect = aspectRatioToString(model.ratio);
      state.canvas.aspectRatio = aspect.preset;
      state.canvas.customAspectWidth = aspect.customW;
      state.canvas.customAspectHeight = aspect.customH;
      state.options.monoMode = model.monoInvert
        ? "invert"
        : model.mono
          ? "on"
          : "off";
      state.options.avatarSize = model.avatarSize > 0 ? String(model.avatarSize) : "";

      const nodeMap = new Map(model.nodes.map((n) => [n.id, n]));
      state.rows = model.edges.map((edge) => {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        return [
          orgTableLabel(fromNode?.label || edge.from),
          orgTableLabel(toNode?.label || edge.to),
          edge.style,
          toNode?.fill ?? toNode?.border ?? "",
          toNode?.gender ?? "",
          toNode?.photo ?? "",
          fromNode?.gender ?? "",
          fromNode?.photo ?? "",
        ];
      });
      return state;
    }

    case "powermap": {
      const parsed = parsePowermap(source);
      if (!parsed.ok || !parsed.value) return null;
      const model = parsed.value;
      state.canvas.title = model.title ?? "";
      const aspect = aspectRatioToString(model.ratio);
      state.canvas.aspectRatio = aspect.preset;
      state.canvas.customAspectWidth = aspect.customW;
      state.canvas.customAspectHeight = aspect.customH;
      state.options.monoMode = model.monoInvert
        ? "invert"
        : model.mono
          ? "on"
          : "off";
      state.options.company = model.company ?? "";
      state.options.showLegend = model.legend;
      state.options.avatarSize =
        model.avatarSize === AVATAR_DEFAULT_PX
          ? ""
          : model.avatarSize > 0
            ? String(model.avatarSize)
            : "off";
      state.options.powerLinks = model.links.map((link) => ({
        name: link.name,
        color: link.color,
        style: link.style,
        label: link.label,
      }));

      const byId = new Map(model.people.map((person) => [person.id, person]));
      const seen = new Set<string>();
      const rows: string[][] = [];
      const pushPerson = (personId: string, other: string, relation: string) => {
        const person = byId.get(personId);
        if (!person) return;
        const otherPerson = byId.get(other);
        rows.push([
          person.name,
          person.title,
          person.gender ?? "",
          person.photo ?? "",
          person.role?.code ?? "",
          person.influence?.code ?? "",
          person.action?.code ?? "",
          person.attitude?.code ?? "",
          person.counterpart && person.counterpart !== "-" ? person.counterpart : "",
          otherPerson?.name || other,
          relation,
        ]);
        seen.add(person.id);
      };
      for (const edge of model.reports) {
        pushPerson(edge.to, edge.from, edge.style === "dotted" ? "dotted" : "solid");
      }
      for (const edge of model.influences) {
        pushPerson(edge.from, edge.to, edge.name);
      }
      for (const person of model.people) {
        if (!seen.has(person.id)) pushPerson(person.id, "", "");
      }
      state.rows = rows.length > 0 ? rows : state.rows;
      return state;
    }

    case "ev": {
      const parsed = parseEv(source);
      if (!parsed.ok || !parsed.value) return null;
      const model = parsed.value;
      state.canvas.title = model.title ?? "";
      const aspect = aspectRatioToString(model.ratio);
      state.canvas.aspectRatio = aspect.preset;
      state.canvas.customAspectWidth = aspect.customW;
      state.canvas.customAspectHeight = aspect.customH;
      state.canvas.yAxis.gridMode = model.grid ? "auto" : "off";
      state.options.monoMode = model.monoInvert
        ? "invert"
        : model.mono
          ? "on"
          : "off";

      state.rows = model.days.map((day, idx) => [
        day,
        fmt(model.pv[idx] ?? 0),
        fmt(model.ev[idx] ?? 0),
        fmt(model.ac[idx] ?? 0),
      ]);
      return state;
    }

    case "series": {
      const parsed = parseClustered(source);
      if (!parsed.ok || !parsed.value) return null;
      const model = parsed.value;
      state.canvas.title = model.title ?? "";
      state.canvas.rotate90 = model.rotate90;
      state.canvas.invertY = model.invertY;
      state.canvas.fontSize = model.fontSize ?? DEFAULT_FONT_SIZE;
      const aspect = aspectRatioToString(model.ratio);
      state.canvas.aspectRatio = aspect.preset;
      state.canvas.customAspectWidth = aspect.customW;
      state.canvas.customAspectHeight = aspect.customH;

      if (model.y) {
        state.canvas.yAxis.label = model.y.label ?? "";
        if (model.y.min !== undefined && model.y.max !== undefined) {
          state.canvas.yAxis.autoRange = false;
          state.canvas.yAxis.min = fmt(model.y.min);
          state.canvas.yAxis.max = fmt(model.y.max);
        }
      }
      state.canvas.yAxis.hidden = !model.axis;
      state.canvas.xAxis.hidden = !model.categoryAxis;
      state.options.y2Hidden = !model.y2Axis;
      state.options.barGap = formatBarGap(model.barGap);
      state.options.showSum = model.showSum;
      state.options.labelFontColor = model.labelFontColor ?? "";
      if (!model.grid) {
        state.canvas.yAxis.gridMode = "off";
      } else if (model.gridStep && model.gridStep > 0) {
        state.canvas.yAxis.gridMode = "fixed";
        state.canvas.yAxis.gridStep = fmt(model.gridStep);
      } else {
        state.canvas.yAxis.gridMode = "auto";
      }
      if (!model.y2Grid) {
        state.options.y2GridMode = "off";
      } else if (model.y2GridStep && model.y2GridStep > 0) {
        state.options.y2GridMode = "fixed";
        state.options.y2GridStep = fmt(model.y2GridStep);
      } else {
        state.options.y2GridMode = "auto";
      }

      state.options.labelsMode = model.labels;
      state.options.stackArea = model.area;
      state.options.stacked = model.stack && !model.area;
      state.options.monoMode = model.monoInvert
        ? "invert"
        : model.mono
          ? "on"
          : "off";

      state.options.seriesColors = extractSeriesColorsArray(model.seriesColors);
      model.series.forEach((s, idx) => {
        if (s.color) {
          state.options.seriesColors[idx] = s.color;
        }
      });

      state.options.breaks = model.breaks.map((b) => ({
        after: fmt(b.after),
        before: fmt(b.before),
        label: b.label ?? "",
      }));

      state.options.thresholds = model.thresholds.map((t) => ({
        value: fmt(t.value),
        label: t.label ?? "",
        color: t.color ?? "",
        width: t.width ? fmt(t.width) : "1.5",
        style: t.style ?? "dash",
      }));

      state.options.cagrs = model.cagrs.map((c) => ({
        seriesIndex: c.seriesIndex,
        from: c.from + 1,
        to: c.to + 1,
        format: c.format ?? "0%",
        prefix: c.prefix ?? "",
        label: c.label ?? "",
      }));

      // Matrix representation: rows are categories, columns are series (plus line series prefixed with "line:")
      const allSeriesHeaders = [
        ...model.series.map((s, idx) => s.name || `Series ${idx + 1}`),
        ...model.lines.map((l, idx) => `line:${l.label || `Line ${idx + 1}`}`),
      ];
      state.matrixHeaders = allSeriesHeaders;

      state.matrixRows = model.categories.map((cat, catIdx) => [
        cat,
        ...model.series.map((s) =>
          s.values[catIdx] === null || s.values[catIdx] === undefined
            ? ""
            : formatCleanNumber(s.values[catIdx]!),
        ),
        ...model.lines.map((l) =>
          l.values[catIdx] === null || l.values[catIdx] === undefined
            ? ""
            : formatCleanNumber(l.values[catIdx]!),
        ),
      ]);
      return state;
    }

    case "histogram":
      return applyHistogramBuilderState(state, source);

    default:
      return null;
  }
}

/** Подпись узла в ячейке таблицы: перевод строки виден как `\n`. */
function orgTableLabel(label: string): string {
  return label.replace(/\r?\n/g, "\\n");
}

/** Подпись в исходнике остаётся одной строкой, `\n` снова переносит текст в блоке. */
function orgSourceLabel(label: string): string {
  return label.trim().replace(/\r?\n/g, "\\n");
}

function emitAspectDirective(canvas: BuilderCanvasSettings): string | null {
  if (!canvas.aspectRatio) return null;
  if (canvas.aspectRatio === "custom") {
    const w = Number(canvas.customAspectWidth);
    const h = Number(canvas.customAspectHeight);
    if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
      return `ratio ${formatCleanNumber(w)}x${formatCleanNumber(h)}`;
    }
    return null;
  }
  return `ratio ${canvas.aspectRatio}`;
}

function emitAvatarDirective(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^(off|none|hide)$/i.test(value)) return "avatar off";
  if (/^(on|default)$/i.test(value)) return "avatar on";
  return `avatar ${value.replace(/px$/i, "")}`;
}

function personAvatarSuffix(gender: string, photo: string): string {
  const parts: string[] = [];
  if (gender.trim()) parts.push(`gender=${gender.trim()}`);
  if (photo.trim()) parts.push(`photo=${quoteIfNeeded(photo.trim())}`);
  return parts.length > 0 ? ` ${parts.join(" ")}` : "";
}

const POWER_SOLID_RELATIONS = new Set(["", "solid", "->", "direct"]);
const POWER_DOTTED_RELATIONS = new Set(["dotted", "dashed", "-.->", ".."]);

function emitMonoDirective(monoMode: "off" | "on" | "invert"): string | null {
  if (monoMode === "on") return "mono";
  if (monoMode === "invert") return "mono invert";
  return null;
}

function emitSeriesColorsTokens(colors: readonly string[]): string[] {
  const tokens: string[] = [];
  colors.forEach((c, idx) => {
    const trimmed = (c ?? "").trim();
    if (trimmed) {
      tokens.push(`s${idx + 1}=${trimmed}`);
    }
  });
  return tokens;
}

function quoteIfNeeded(text: string): string {
  const t = text.trim();
  if (!t) return '""';
  if (/[\s,]/.test(t) && !(t.startsWith('"') && t.endsWith('"'))) {
    return `"${t.replace(/"/g, '\\"')}"`;
  }
  return t;
}

export function emitMermaidExtFromBuilderState(
  state: DiagramBuilderState,
): string | null {
  const lines: string[] = [...state.preservedComments];
  const { canvas, options } = state;

  switch (state.diagramType) {
    case "waterfall": {
      lines.push("waterfall");
      if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
      if (canvas.background.trim()) lines.push(`background ${canvas.background.trim()}`);
      if (!canvas.autoTextColor && canvas.textColor.trim()) {
        lines.push(`textcolor ${canvas.textColor.trim()}`);
      }
      const ratioLine = emitAspectDirective(canvas);
      if (ratioLine) lines.push(ratioLine);
      if (canvas.fontSize && canvas.fontSize !== DEFAULT_FONT_SIZE) {
        lines.push(`fontsize ${canvas.fontSize}`);
      }
      const monoLine = emitMonoDirective(options.monoMode);
      if (monoLine) lines.push(monoLine);

      const colorTokens: string[] = [];
      if (options.namedColors.total.trim()) {
        colorTokens.push(`total=${options.namedColors.total.trim()}`);
      }
      if (options.namedColors.increase.trim()) {
        colorTokens.push(`increase=${options.namedColors.increase.trim()}`);
      }
      if (options.namedColors.decrease.trim()) {
        colorTokens.push(`decrease=${options.namedColors.decrease.trim()}`);
      }
      colorTokens.push(...emitSeriesColorsTokens(options.seriesColors));
      if (colorTokens.length > 0) {
        lines.push(`colors ${colorTokens.join(" ")}`);
      }

      if (!canvas.yAxis.autoRange) {
        const min = Number(canvas.yAxis.min);
        const max = Number(canvas.yAxis.max);
        if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
          const lbl = canvas.yAxis.label.trim()
            ? `"${canvas.yAxis.label.trim().replace(/"/g, '\\"')}" `
            : "";
          lines.push(`y ${lbl}${formatCleanNumber(min)} --> ${formatCleanNumber(max)}`);
        }
      }
      emitAxisAndGrid(lines, canvas);
      if (options.barGap.trim()) lines.push(`gap ${options.barGap.trim()}`);
      const waterfallLabelTokens: string[] = [];
      if (options.labelsMode && options.labelsMode !== "above") waterfallLabelTokens.push(options.labelsMode);
      if (options.labelFontColor.trim()) waterfallLabelTokens.push(`fontcolor ${options.labelFontColor.trim()}`);
      if (waterfallLabelTokens.length > 0) lines.push(`labels ${waterfallLabelTokens.join(" ")}`);
      if (!options.connectors) {
        lines.push("connectors off");
      }

      for (const brk of options.breaks) {
        const after = Number(brk.after);
        const before = Number(brk.before);
        if (Number.isFinite(after) && Number.isFinite(before) && before > after) {
          const lbl = brk.label.trim() ? ` "${brk.label.trim().replace(/"/g, '\\"')}"` : "";
          lines.push(`break ${formatCleanNumber(after)} --> ${formatCleanNumber(before)}${lbl}`);
        }
      }

      for (const th of options.thresholds) {
        const val = Number(th.value);
        if (!Number.isFinite(val)) continue;
        const parts = [`line ${formatCleanNumber(val)}`];
        if (th.label.trim()) parts.push(`"${th.label.trim().replace(/"/g, '\\"')}"`);
        if (th.color.trim()) parts.push(`color=${th.color.trim()}`);
        const w = Number(th.width);
        if (Number.isFinite(w) && w > 0 && w !== 1.5) {
          parts.push(`width=${formatCleanNumber(w)}`);
        }
        if (th.style && th.style !== "dash") {
          parts.push(`style=${th.style}`);
        }
        lines.push(parts.join(" "));
      }

      let currentSeries = "";
      let seenStartInSeries = false;
      for (const row of state.rows) {
        const label = (row[0] ?? "").trim();
        const kind = (row[1] ?? "=").trim();
        const rawVal = (row[2] ?? "").trim();
        const labelPos = (row[3] ?? "").trim();
        const seriesName = (row[4] ?? "").trim();

        if (!label && !rawVal) continue;

        if (seriesName !== currentSeries) {
          currentSeries = seriesName;
          seenStartInSeries = false;
          if (currentSeries) {
            lines.push(`series ${quoteIfNeeded(currentSeries)}`);
          }
        }

        let flagSuffix = "";
        if (labelPos === "inside") flagSuffix = " inside";
        else if (labelPos === "above") flagSuffix = " above";
        else if (labelPos === "both") flagSuffix = " inside above";
        else if (labelPos === "no-label") flagSuffix = " no-label";

        if (kind === "=subtotal" || (kind === "=" && !rawVal && seenStartInSeries)) {
          lines.push(`= : ${label}${flagSuffix}`);
          continue;
        }

        const num = Number(rawVal.replace(",", "."));
        const safeNum = Number.isFinite(num) ? num : 0;

        if (!seenStartInSeries || kind === "=") {
          seenStartInSeries = true;
          lines.push(`=${formatCleanNumber(safeNum)} : ${label}${flagSuffix}`);
        } else if (kind === "-") {
          lines.push(`-${formatCleanNumber(Math.abs(safeNum))} : ${label}${flagSuffix}`);
        } else {
          lines.push(`+${formatCleanNumber(Math.abs(safeNum))} : ${label}${flagSuffix}`);
        }
      }

      if (!seenStartInSeries) {
        lines.push("=100 : Start");
      }

      return lines.join("\n");
    }

    case "bubble": {
      lines.push("bubble");
      if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
      const ratioLine = emitAspectDirective(canvas);
      if (ratioLine) lines.push(ratioLine);
      if (canvas.fontSize && canvas.fontSize !== DEFAULT_FONT_SIZE) {
        lines.push(`fontsize ${canvas.fontSize}`);
      }
      const monoLine = emitMonoDirective(options.monoMode);
      if (monoLine) lines.push(monoLine);

      const xMin = Number(canvas.xAxis.min);
      const xMax = Number(canvas.xAxis.max);
      const safeXMin = Number.isFinite(xMin) ? xMin : 0;
      const safeXMax = Number.isFinite(xMax) && xMax > safeXMin ? xMax : safeXMin + 100;
      lines.push(
        `x "${(canvas.xAxis.label || "X").replace(/"/g, '\\"')}" ${formatCleanNumber(safeXMin)} --> ${formatCleanNumber(safeXMax)}`,
      );

      const yMin = Number(canvas.yAxis.min);
      const yMax = Number(canvas.yAxis.max);
      const safeYMin = Number.isFinite(yMin) ? yMin : 0;
      const safeYMax = Number.isFinite(yMax) && yMax > safeYMin ? yMax : safeYMin + 100;
      lines.push(
        `y "${(canvas.yAxis.label || "Y").replace(/"/g, '\\"')}" ${formatCleanNumber(safeYMin)} --> ${formatCleanNumber(safeYMax)}`,
      );

      if (canvas.sizeLabel.trim()) {
        lines.push(`size "${canvas.sizeLabel.trim().replace(/"/g, '\\"')}"`);
      }

      if (canvas.quadrants.every((q) => q.trim().length > 0)) {
        lines.push(`quadrants ${canvas.quadrants.map((q) => quoteIfNeeded(q)).join(", ")}`);
      }

      const midX = Number(canvas.midX);
      const midY = Number(canvas.midY);
      if (Number.isFinite(midX) && canvas.midX.trim() !== "" && Number.isFinite(midY) && canvas.midY.trim() !== "") {
        lines.push(`mid x=${formatCleanNumber(midX)} y=${formatCleanNumber(midY)}`);
      }

      lines.push("data");
      let count = 0;
      for (const row of state.rows) {
        const label = (row[0] ?? "").trim() || `Point ${count + 1}`;
        const x = Number((row[1] ?? "0").replace(",", "."));
        const y = Number((row[2] ?? "0").replace(",", "."));
        const size = Number((row[3] ?? "10").replace(",", "."));
        const group = (row[4] ?? "").trim();
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(size)) continue;
        const grpSuffix = group ? `, group=${quoteIfNeeded(group)}` : "";
        lines.push(
          `${label} : x=${formatCleanNumber(x)}, y=${formatCleanNumber(y)}, size=${formatCleanNumber(size)}${grpSuffix}`,
        );
        count += 1;
      }
      if (count === 0) {
        lines.push("Item 1 : x=50, y=50, size=20");
      }
      return lines.join("\n");
    }

    case "heatmap": {
      lines.push("heatmap");
      if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
      const ratioLine = emitAspectDirective(canvas);
      if (ratioLine) lines.push(ratioLine);
      const monoLine = emitMonoDirective(options.monoMode);
      if (monoLine) lines.push(monoLine);

      const xHeaders =
        state.matrixHeaders.length > 0 ? state.matrixHeaders : ["Col 1", "Col 2"];
      const yRows =
        state.matrixRows.length > 0
          ? state.matrixRows
          : [
              ["Row 1", "10", "20"],
              ["Row 2", "30", "40"],
            ];

      lines.push(`x ${xHeaders.map((h) => quoteIfNeeded(h)).join(", ")}`);
      lines.push(`y ${yRows.map((r, i) => quoteIfNeeded(r[0] || `Row ${i + 1}`)).join(", ")}`);

      if (!options.heatmapAutoScale && options.heatmapBands.length > 0) {
        lines.push("scale");
        for (const band of options.heatmapBands) {
          const from = Number(band.from);
          const to = Number(band.to);
          const color = band.color.trim() || "#e8f5e9";
          if (!Number.isFinite(from)) continue;
          if (band.openEnded || !band.to.trim() || !Number.isFinite(to)) {
            lines.push(`${formatCleanNumber(from)}+ : ${color}`);
          } else if (to > from) {
            lines.push(`${formatCleanNumber(from)}-${formatCleanNumber(to)} : ${color}`);
          }
        }
      }

      lines.push("data");
      yRows.forEach((row, idx) => {
        const rowLabel = (row[0] ?? "").trim() || `Row ${idx + 1}`;
        const vals = xHeaders.map((_, colIdx) => {
          const raw = (row[colIdx + 1] ?? "").trim();
          if (!raw) return "";
          const n = Number(raw.replace(",", "."));
          return Number.isFinite(n) ? formatCleanNumber(n) : "0";
        });
        lines.push(`${rowLabel} : ${vals.join(", ")}`);
      });
      return lines.join("\n");
    }

    case "boxplot": {
      lines.push("boxplot");
      if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
      const ratioLine = emitAspectDirective(canvas);
      if (ratioLine) lines.push(ratioLine);
      if (canvas.fontSize && canvas.fontSize !== DEFAULT_FONT_SIZE) {
        lines.push(`fontsize ${canvas.fontSize}`);
      }
      const monoLine = emitMonoDirective(options.monoMode);
      if (monoLine) lines.push(monoLine);

      if (!canvas.yAxis.autoRange) {
        const min = Number(canvas.yAxis.min);
        const max = Number(canvas.yAxis.max);
        if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
          const lbl = canvas.yAxis.label.trim()
            ? `"${canvas.yAxis.label.trim().replace(/"/g, '\\"')}" `
            : '"" ';
          lines.push(`y ${lbl}${formatCleanNumber(min)} --> ${formatCleanNumber(max)}`);
        }
      } else if (canvas.yAxis.label.trim()) {
        lines.push(`y "${canvas.yAxis.label.trim().replace(/"/g, '\\"')}"`);
      }

      if (canvas.yAxis.gridMode === "off") {
        lines.push("grid off");
      } else if (canvas.yAxis.gridMode === "fixed") {
        const step = Number(canvas.yAxis.gridStep);
        if (Number.isFinite(step) && step > 0) {
          lines.push(`grid ${formatCleanNumber(step)}`);
        }
      }

      const colorTokens: string[] = [];
      if (options.namedColors.box.trim()) colorTokens.push(`box=${options.namedColors.box.trim()}`);
      if (options.namedColors.median.trim()) colorTokens.push(`median=${options.namedColors.median.trim()}`);
      if (options.namedColors.whisker.trim()) colorTokens.push(`whisker=${options.namedColors.whisker.trim()}`);
      if (options.namedColors.outlier.trim()) colorTokens.push(`outlier=${options.namedColors.outlier.trim()}`);
      colorTokens.push(...emitSeriesColorsTokens(options.seriesColors));
      if (colorTokens.length > 0) {
        lines.push(`colors ${colorTokens.join(" ")}`);
      }

      let count = 0;
      for (const row of state.rows) {
        const label = (row[0] ?? "").trim() || `Category ${count + 1}`;
        const nums = [1, 2, 3, 4, 5].map((idx) => {
          const n = Number((row[idx] ?? "0").replace(",", "."));
          return Number.isFinite(n) ? n : idx * 10;
        });
        nums.sort((a, b) => a - b);
        const [min, q1, median, q3, max] = nums;
        const color = (row[6] ?? "").trim();
        const colorAttr = color ? `, color=${color}` : "";
        lines.push(
          `${label} : min=${formatCleanNumber(min)}, q1=${formatCleanNumber(q1)}, median=${formatCleanNumber(median)}, q3=${formatCleanNumber(q3)}, max=${formatCleanNumber(max)}${colorAttr}`,
        );
        count += 1;
      }
      if (count === 0) {
        lines.push("Group 1 : min=10, q1=25, median=40, q3=60, max=85");
      }
      return lines.join("\n");
    }

    case "treemap": {
      lines.push("treemap");
      if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
      const ratioLine = emitAspectDirective(canvas);
      if (ratioLine) lines.push(ratioLine);
      if (canvas.fontSize && canvas.fontSize !== DEFAULT_FONT_SIZE) {
        lines.push(`fontsize ${canvas.fontSize}`);
      }
      if (options.labelsMode && options.labelsMode !== "both") {
        lines.push(`labels ${options.labelsMode}`);
      }
      const monoLine = emitMonoDirective(options.monoMode);
      if (monoLine) lines.push(monoLine);

      const seriesTokens = emitSeriesColorsTokens(options.seriesColors);
      if (seriesTokens.length > 0) {
        lines.push(`colors ${seriesTokens.join(" ")}`);
      }

      let count = 0;
      for (const row of state.rows) {
        const grp = (row[0] ?? "").trim();
        const item = (row[1] ?? "").trim() || `Item ${count + 1}`;
        const weightNum = Number((row[2] ?? "10").replace(",", "."));
        const weight = Number.isFinite(weightNum) && weightNum > 0 ? weightNum : 10;
        const color = (row[3] ?? "").trim();
        const colorSuffix = color ? ` color=${color}` : "";
        const left = grp ? `${grp} / ${item}` : item;
        lines.push(`${left} : ${formatCleanNumber(weight)}${colorSuffix}`);
        count += 1;
      }
      if (count === 0) {
        lines.push("Category / Item 1 : 100");
      }
      return lines.join("\n");
    }

    case "radar": {
      lines.push("radar");
      if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
      const ratioLine = emitAspectDirective(canvas);
      if (ratioLine) lines.push(ratioLine);
      if (canvas.fontSize && canvas.fontSize !== DEFAULT_FONT_SIZE) {
        lines.push(`fontsize ${canvas.fontSize}`);
      }
      const monoLine = emitMonoDirective(options.monoMode);
      if (monoLine) lines.push(monoLine);

      const axes =
        state.matrixHeaders.length >= 3
          ? state.matrixHeaders
          : ["Axis 1", "Axis 2", "Axis 3"];
      lines.push(`axes ${axes.map((a) => quoteIfNeeded(a)).join(", ")}`);

      const min = Number(canvas.radarMin);
      const max = Number(canvas.radarMax);
      if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
        lines.push(`scale ${formatCleanNumber(min)} --> ${formatCleanNumber(max)}`);
      }
      if (canvas.radarRings && canvas.radarRings !== DEFAULT_RADAR_RINGS) {
        lines.push(`rings ${canvas.radarRings}`);
      }
      if (options.radarFillOpacity !== DEFAULT_RADAR_FILL) {
        lines.push(`fill ${formatCleanNumber(options.radarFillOpacity)}`);
      }
      if (!options.radarDots) {
        lines.push("dots off");
      }

      const seriesTokens = emitSeriesColorsTokens(options.seriesColors);
      if (seriesTokens.length > 0) {
        lines.push(`colors ${seriesTokens.join(" ")}`);
      }

      const rows =
        state.matrixRows.length > 0
          ? state.matrixRows
          : [["Series 1", ...axes.map(() => "80")]];

      rows.forEach((row, idx) => {
        const sName = (row[0] ?? "").trim() || `Series ${idx + 1}`;
        const vals = axes.map((_, colIdx) => {
          const n = Number((row[colIdx + 1] ?? "50").replace(",", "."));
          return Number.isFinite(n) ? formatCleanNumber(n) : "50";
        });
        lines.push(`series ${sName} : ${vals.join(", ")}`);
      });

      return lines.join("\n");
    }

    case "voronoi": {
      lines.push("voronoi");
      if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
      const ratioLine = emitAspectDirective(canvas);
      if (ratioLine) lines.push(ratioLine);
      if (canvas.fontSize && canvas.fontSize !== DEFAULT_FONT_SIZE) {
        lines.push(`fontsize ${canvas.fontSize}`);
      }
      const monoLine = emitMonoDirective(options.monoMode);
      if (monoLine) lines.push(monoLine);

      const xMin = Number(canvas.xAxis.min);
      const xMax = Number(canvas.xAxis.max);
      if (Number.isFinite(xMin) && Number.isFinite(xMax) && xMax > xMin) {
        const lbl = canvas.xAxis.label.trim()
          ? `"${canvas.xAxis.label.trim().replace(/"/g, '\\"')}" `
          : '"" ';
        lines.push(`x ${lbl}${formatCleanNumber(xMin)} --> ${formatCleanNumber(xMax)}`);
      }

      const yMin = Number(canvas.yAxis.min);
      const yMax = Number(canvas.yAxis.max);
      if (Number.isFinite(yMin) && Number.isFinite(yMax) && yMax > yMin) {
        const lbl = canvas.yAxis.label.trim()
          ? `"${canvas.yAxis.label.trim().replace(/"/g, '\\"')}" `
          : '"" ';
        lines.push(`y ${lbl}${formatCleanNumber(yMin)} --> ${formatCleanNumber(yMax)}`);
      }

      if (!options.showSites) lines.push("sites off");
      if (!options.showLabels) lines.push("labels off");

      const seriesTokens = emitSeriesColorsTokens(options.seriesColors);
      if (seriesTokens.length > 0) {
        lines.push(`colors ${seriesTokens.join(" ")}`);
      }

      lines.push("data");
      let count = 0;
      for (const row of state.rows) {
        const label = (row[0] ?? "").trim() || `Site ${count + 1}`;
        const x = Number((row[1] ?? "50").replace(",", "."));
        const y = Number((row[2] ?? "50").replace(",", "."));
        const group = (row[3] ?? "").trim();
        const color = (row[4] ?? "").trim();
        const grpAttr = group ? `, group=${quoteIfNeeded(group)}` : "";
        const colAttr = color ? `, color=${color}` : "";
        lines.push(
          `${label} : x=${formatCleanNumber(Number.isFinite(x) ? x : 50)}, y=${formatCleanNumber(Number.isFinite(y) ? y : 50)}${grpAttr}${colAttr}`,
        );
        count += 1;
      }
      if (count === 0) {
        lines.push("Site 1 : x=30, y=50", "Site 2 : x=70, y=50");
      }
      return lines.join("\n");
    }

    case "orgchart": {
      lines.push("orgchart");
      if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
      const ratioLine = emitAspectDirective(canvas);
      if (ratioLine) lines.push(ratioLine);
      const monoLine = emitMonoDirective(options.monoMode);
      if (monoLine) lines.push(monoLine);
      const avatarLine = emitAvatarDirective(options.avatarSize);
      if (avatarLine) lines.push(avatarLine);

      const nodeDecls = new Map<string, string>();
      const edgeLines: string[] = [];
      const toSafeId = (raw: string, fallback: number): string =>
        raw
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^\p{L}\p{N}_-]/gu, "") || `Node_${fallback}`;

      state.rows.forEach((row, idx) => {
        const mgrLabel = orgSourceLabel(row[0] ?? "");
        const empLabel = orgSourceLabel(row[1] ?? "");
        if (!mgrLabel && !empLabel) return;
        const style = (row[2] ?? "solid").trim();
        const color = (row[3] ?? "").trim();
        const empAvatar = personAvatarSuffix(row[4] ?? "", row[5] ?? "");
        const mgrAvatar = personAvatarSuffix(row[6] ?? "", row[7] ?? "");

        const fromId = toSafeId(mgrLabel, idx * 2 + 1);
        const toId = toSafeId(empLabel, idx * 2 + 2);

        if (!nodeDecls.has(fromId)) {
          nodeDecls.set(fromId, `${fromId} [${mgrLabel || fromId}]${mgrAvatar}`);
        }
        const colorSuffix = color ? ` color=${color}` : "";
        nodeDecls.set(toId, `${toId} [${empLabel || toId}]${colorSuffix}${empAvatar}`);

        const arrow = style === "dotted" ? "-.->" : "->";
        edgeLines.push(`${fromId} ${arrow} ${toId}`);
      });

      if (edgeLines.length === 0) {
        lines.push("CEO [CEO]", "CTO [CTO]", "CEO -> CTO");
      } else {
        lines.push(...nodeDecls.values(), ...edgeLines);
      }
      return lines.join("\n");
    }

    case "powermap": {
      lines.push("powermap");
      if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
      if (options.company.trim()) lines.push(`company ${options.company.trim()}`);
      const ratioLine = emitAspectDirective(canvas);
      if (ratioLine) lines.push(ratioLine);
      const monoLine = emitMonoDirective(options.monoMode);
      if (monoLine) lines.push(monoLine);
      if (!options.showLegend) lines.push("legend off");
      const avatarLine = emitAvatarDirective(options.avatarSize);
      if (avatarLine) lines.push(avatarLine);
      for (const link of options.powerLinks) {
        const name = link.name.trim();
        if (!name) continue;
        const color = link.color.trim() || "#6e7781";
        const style = link.style.trim() || "solid";
        const label = link.label.trim();
        const labelAttr = label ? ` label=${quoteIfNeeded(label)}` : "";
        lines.push(`link ${name} color=${color} style=${style}${labelAttr}`);
      }

      const people = new Map<
        string,
        {
          name: string;
          title: string;
          gender: string;
          photo: string;
          role: string;
          influence: string;
          action: string;
          attitude: string;
          counterpart: string;
        }
      >();
      const edgeLines: string[] = [];
      const toSafeId = (raw: string, fallback: number): string =>
        raw
          .trim()
          .replace(/\s+/g, "_")
          .replace(/[^\p{L}\p{N}_-]/gu, "") || `Person_${fallback}`;
      const blankPerson = (name: string) => ({
        name,
        title: "",
        gender: "",
        photo: "",
        role: "",
        influence: "",
        action: "",
        attitude: "",
        counterpart: "",
      });
      const fillPerson = (
        current: ReturnType<typeof blankPerson>,
        row: readonly string[],
      ) => {
        const take = (prev: string, next: string | undefined) => prev || (next ?? "").trim();
        current.title = take(current.title, row[1]);
        current.gender = take(current.gender, row[2]);
        current.photo = take(current.photo, row[3]);
        current.role = take(current.role, row[4]);
        current.influence = take(current.influence, row[5]);
        current.action = take(current.action, row[6]);
        current.attitude = take(current.attitude, row[7]);
        current.counterpart = take(current.counterpart, row[8]);
      };

      state.rows.forEach((row, idx) => {
        const name = (row[0] ?? "").trim();
        if (!name) return;
        const id = toSafeId(name, idx + 1);
        const person = people.get(id) ?? blankPerson(name);
        fillPerson(person, row);
        people.set(id, person);

        const otherName = (row[9] ?? "").trim();
        const relation = (row[10] ?? "").trim();
        if (!otherName) return;
        const otherId = toSafeId(otherName, idx + 100);
        if (!people.has(otherId)) people.set(otherId, blankPerson(otherName));
        const rel = relation.toLowerCase();
        if (POWER_DOTTED_RELATIONS.has(rel)) {
          edgeLines.push(`${otherId} -.-> ${id}`);
        } else if (POWER_SOLID_RELATIONS.has(rel)) {
          edgeLines.push(`${otherId} -> ${id}`);
        } else {
          edgeLines.push(`${id} -${relation}-> ${otherId}`);
        }
      });

      if (people.size === 0) {
        lines.push(
          "CEO [Alex|Lead] role=D gender=m",
          "CTO [Sam|Tech] role=A gender=f",
          "CEO -> CTO",
        );
        return lines.join("\n");
      }

      for (const [id, person] of people) {
        const label = person.title ? `${person.name}|${person.title}` : person.name;
        const attrs = [
          person.role ? `role=${person.role}` : "",
          person.influence ? `influence=${person.influence}` : "",
          person.action ? `action=${person.action}` : "",
          person.attitude ? `attitude=${person.attitude}` : "",
          person.counterpart ? `counterpart=${quoteIfNeeded(person.counterpart)}` : "",
          person.gender ? `gender=${person.gender}` : "",
          person.photo ? `photo=${quoteIfNeeded(person.photo)}` : "",
        ].filter(Boolean);
        lines.push(`${id} [${label}]${attrs.length ? ` ${attrs.join(" ")}` : ""}`);
      }
      lines.push(...edgeLines);
      return lines.join("\n");
    }

    case "ev": {
      lines.push("ev");
      if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
      const ratioLine = emitAspectDirective(canvas);
      if (ratioLine) lines.push(ratioLine);
      if (canvas.yAxis.gridMode !== "off") {
        lines.push("grid");
      }
      const monoLine = emitMonoDirective(options.monoMode);
      if (monoLine) lines.push(monoLine);

      const days: string[] = [];
      const pv: string[] = [];
      const ev: string[] = [];
      const ac: string[] = [];

      state.rows.forEach((row, idx) => {
        const d = (row[0] ?? "").trim() || String(idx + 1);
        const pNum = Number((row[1] ?? "0").replace(",", "."));
        const eNum = Number((row[2] ?? "0").replace(",", "."));
        const aNum = Number((row[3] ?? "0").replace(",", "."));
        days.push(quoteIfNeeded(d));
        pv.push(formatCleanNumber(Number.isFinite(pNum) ? pNum : 0));
        ev.push(formatCleanNumber(Number.isFinite(eNum) ? eNum : 0));
        ac.push(formatCleanNumber(Number.isFinite(aNum) ? aNum : 0));
      });

      if (days.length === 0) {
        lines.push("days 1, 2, 3", "pv 10, 20, 30", "ev 8, 18, 28", "ac 12, 22, 32");
      } else {
        lines.push(
          `days ${days.join(", ")}`,
          `pv ${pv.join(", ")}`,
          `ev ${ev.join(", ")}`,
          `ac ${ac.join(", ")}`,
        );
      }
      return lines.join("\n");
    }

    case "series": {
      lines.push("series");
      if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
      if (canvas.rotate90) lines.push("rotate 90");
      if (canvas.invertY) lines.push("invert y");
      if (options.stackArea) lines.push("stacked area");
      else if (options.stacked) lines.push("stacked");
      if (options.barGap.trim()) lines.push(`gap ${options.barGap.trim()}`);
      const ratioLine = emitAspectDirective(canvas);
      if (ratioLine) lines.push(ratioLine);
      if (canvas.fontSize && canvas.fontSize !== DEFAULT_FONT_SIZE) {
        lines.push(`fontsize ${canvas.fontSize}`);
      }
      const monoLine = emitMonoDirective(options.monoMode);
      if (monoLine) lines.push(monoLine);

      const seriesTokens = emitSeriesColorsTokens(options.seriesColors);
      if (seriesTokens.length > 0) {
        lines.push(`colors ${seriesTokens.join(" ")}`);
      }

      const headers =
        state.matrixHeaders.length > 0 ? state.matrixHeaders : ["Series 1"];
      const catRows =
        state.matrixRows.length > 0
          ? state.matrixRows
          : [
              ["Q1", "100"],
              ["Q2", "140"],
            ];

      const categories = catRows.map(
        (r, idx) => quoteIfNeeded((r[0] ?? "").trim() || `Cat ${idx + 1}`),
      );
      lines.push(`categories ${categories.join(", ")}`);

      if (!canvas.yAxis.autoRange) {
        const min = Number(canvas.yAxis.min);
        const max = Number(canvas.yAxis.max);
        if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
          const lbl = canvas.yAxis.label.trim()
            ? `"${canvas.yAxis.label.trim().replace(/"/g, '\\"')}" `
            : '"" ';
          lines.push(`y ${lbl}${formatCleanNumber(min)} --> ${formatCleanNumber(max)}`);
        }
      } else if (canvas.yAxis.label.trim()) {
        lines.push(`y "${canvas.yAxis.label.trim().replace(/"/g, '\\"')}"`);
      }

      emitAxisAndGrid(lines, canvas, {
        hidden: options.y2Hidden,
        gridMode: options.y2GridMode,
        gridStep: options.y2GridStep,
      });

      const labelTokens: string[] = [];
      if (options.labelsMode && options.labelsMode !== "above") labelTokens.push(options.labelsMode);
      if (options.showSum) labelTokens.push("sum");
      if (options.labelFontColor.trim()) labelTokens.push(`fontcolor ${options.labelFontColor.trim()}`);
      if (labelTokens.length > 0) lines.push(`labels ${labelTokens.join(" ")}`);

      for (const brk of options.breaks) {
        const after = Number(brk.after);
        const before = Number(brk.before);
        if (Number.isFinite(after) && Number.isFinite(before) && before > after) {
          const lbl = brk.label.trim() ? ` "${brk.label.trim().replace(/"/g, '\\"')}"` : "";
          lines.push(`break ${formatCleanNumber(after)} --> ${formatCleanNumber(before)}${lbl}`);
        }
      }

      for (const th of options.thresholds) {
        const val = Number(th.value);
        if (!Number.isFinite(val)) continue;
        const parts = [`line ${formatCleanNumber(val)}`];
        if (th.label.trim()) parts.push(`"${th.label.trim().replace(/"/g, '\\"')}"`);
        if (th.color.trim()) parts.push(`color=${th.color.trim()}`);
        const w = Number(th.width);
        if (Number.isFinite(w) && w > 0 && w !== 1.5) {
          parts.push(`width=${formatCleanNumber(w)}`);
        }
        if (th.style && th.style !== "dash") {
          parts.push(`style=${th.style}`);
        }
        lines.push(parts.join(" "));
      }

      let barSeriesIdx = 0;
      headers.forEach((rawHeader, colIdx) => {
        const trimmedHeader = rawHeader.trim();
        const isLine = /^line:/i.test(trimmedHeader);
        const cleanName = isLine
          ? trimmedHeader.replace(/^line:\s*/i, "").trim()
          : trimmedHeader;

        const values = catRows.map((row) => {
          const cell = (row[colIdx + 1] ?? "").trim();
          if (!cell || cell === "-" || cell.toLowerCase() === "null") {
            return "-";
          }
          const n = Number(cell.replace(",", "."));
          return Number.isFinite(n) ? formatCleanNumber(n) : "0";
        });

        if (isLine) {
          lines.push(`line ${cleanName} : ${values.join(", ")}`);
        } else {
          const currentBarIdx = barSeriesIdx;
          barSeriesIdx += 1;
          lines.push(`series ${cleanName} : ${values.join(", ")}`);
          const matchingCagrs = options.cagrs.filter(
            (c) => c.seriesIndex === currentBarIdx,
          );
          for (const cagr of matchingCagrs) {
            const parts = ["cagr"];
            if (cagr.from >= 1 && cagr.to > cagr.from) {
              parts.push(`${cagr.from}, ${cagr.to}`);
            }
            if (cagr.label.trim()) {
              parts.push(`label="${cagr.label.trim().replace(/"/g, '\\"')}"`);
            } else {
              if (cagr.format && cagr.format !== "0%") {
                parts.push(`format="${cagr.format}"`);
              }
              if (cagr.prefix) {
                parts.push(`prefix="${cagr.prefix.replace(/"/g, '\\"')}"`);
              }
            }
            lines.push(parts.join(" "));
          }
        }
      });

      return lines.join("\n");
    }

    case "histogram":
      return emitHistogramBuilderSource(state);

    default:
      return null;
  }
}
