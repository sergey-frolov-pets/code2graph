import type { DiagramFormat } from "@/constants/diagram-formats";
import type { DiagramTypeTag } from "@/constants/diagram-example-catalog";
import {
  createEmptyDiagramIR,
  sanitizeDiagramId,
  type DiagramEdge,
  type DiagramIR,
  type DiagramKind,
  type DiagramNode,
  type DiagramNodeSemanticKind,
} from "@/services/conversion/diagram-ir";
import { safeParseSourceToIr } from "@/services/conversion/parse/parse-source-to-ir";
import { emitMermaidFromIr } from "@/services/conversion/emit/emit-mermaid";
import { emitPlantUmlFromIr } from "@/services/conversion/emit/emit-plantuml";
import { extractPlantUmlStyleDirectives } from "@/services/conversion/parse/plantuml-style";
import { emitD2FromIr } from "@/services/conversion/emit/emit-d2";
import { emitGraphmlFromIr } from "@/services/conversion/emit/emit-graphml";
import { emitStructurizrFromIr } from "@/services/conversion/emit/emit-structurizr";
import { emitWiremarkFromIr } from "@/services/conversion/emit/emit-wiremark";
import {
  formatMermaidSankeyCsvField,
  parseMermaidSankeyCsvLine,
} from "@/services/conversion/emit/mermaid-emit-utils";
import { formatCleanNumber } from "@/services/table-paste/parse-clipboard-grid";
import { applyTableFromClipboardText } from "@/services/table-paste";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
import {
  aspectFieldsFromMarker,
  canvasAspectToken,
  insertAspectMarker,
  readAspectMarker,
} from "@/utils/svg-aspect-frame";
import {
  applyAppearanceFromConfig,
  buildMermaidConfigHeader,
  injectSequenceAutonumber,
  sourceHasSequenceAutonumber,
  sourceHasTitleDirective,
  splitMermaidFrontmatter,
} from "./builder-appearance";
import { createDefaultBuilderState } from "./codec-mermaid-ext";
import { serializeGridToClipboardTsv } from "./table-clipboard";
import type { DiagramBuilderState } from "./types";

function unquote(raw: string): string {
  const t = raw.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseHierarchyLinesToFlatRows(lines: readonly string[], isMermaidMindmap: boolean): string[][] {
  const rows: string[][] = [];
  const stack: string[] = [];
  const colorStack: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("%%") || trimmed.startsWith("'") || /^@(?:start|end)/i.test(trimmed)) {
      continue;
    }
    if (/^(?:mindmap|wbs|title|left\s+to\s+right|top\s+to\s+bottom|header|footer|caption|legend|endlegend)\b/i.test(trimmed)) {
      continue;
    }

    let depth = 1;
    let label = trimmed;
    let nodeColor = "";

    if (!isMermaidMindmap && /^[*+-]+/.test(trimmed)) {
      const m = /^([*+-]+)(?:\[(#[0-9a-fA-Fa-zA-Z]+)\])?_?\s*:?\s*(.*)$/.exec(trimmed);
      if (!m) continue;
      depth = m[1].length;
      nodeColor = m[2] ?? "";
      label = m[3].replace(/;\s*$/, "").trim();
    } else if (isMermaidMindmap) {
      const leadingSpaces = /^(\s*)/.exec(rawLine)?.[1].length ?? 0;
      depth = Math.max(1, Math.floor(leadingSpaces / 2));
      label = trimmed
        .replace(/^root\s*\(\((.*)\)\)$/i, "$1")
        .replace(/^\(\((.*)\)\)$/, "$1")
        .replace(/^\[(.*)\]$/, "$1")
        .replace(/^\((.*)\)$/, "$1")
        .trim();
    }

    stack[depth - 1] = label;
    colorStack[depth - 1] = nodeColor;
    stack.length = depth;
    colorStack.length = depth;

    if (depth === 2) {
      rows.push([
        stack[0] ?? "Root",
        stack[1] ?? "",
        "",
        colorStack[1] || colorStack[0] || "",
      ]);
    } else if (depth >= 3) {
      const prev = rows[rows.length - 1];
      if (
        prev &&
        prev[0] === (stack[0] ?? "Root") &&
        prev[1] === (stack[1] ?? "") &&
        prev[2] === ""
      ) {
        prev[2] = stack[2] ?? "";
        if (colorStack[depth - 1]) {
          prev[3] = colorStack[depth - 1];
        }
      } else {
        rows.push([
          stack[0] ?? "Root",
          stack[1] ?? "",
          stack[2] ?? "",
          colorStack[depth - 1] || colorStack[1] || colorStack[0] || "",
        ]);
      }
    }
  }

  if (rows.length === 0 && stack.length > 0) {
    rows.push([stack[0] ?? "Root", "Branch 1", "Item 1", colorStack[0] ?? ""]);
  }

  return rows;
}

function isAspectOrTitleComment(trimmed: string): boolean {
  return (
    /^(?:%%|\/\/|#|')[ \t]*ratio\b/i.test(trimmed) ||
    /^<!--[ \t]*ratio\b/i.test(trimmed) ||
    /^(?:#|\/\/)[ \t]*title:/i.test(trimmed)
  );
}

function collectStandardPreservedComments(lines: readonly string[]): string[] {
  const comments: string[] = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed || isAspectOrTitleComment(trimmed)) continue;
    if (trimmed.startsWith("%%") || trimmed.startsWith("'")) {
      comments.push(trimmed);
    }
  }
  return comments;
}

export function parseStandardDiagramToBuilderState(
  source: string,
  format: DiagramFormat,
  diagramType: DiagramTypeTag,
): DiagramBuilderState {
  const state = createDefaultBuilderState(format, diagramType);
  const markedAspect = readAspectMarker(source);
  if (markedAspect) {
    const fields = aspectFieldsFromMarker(markedAspect);
    state.canvas.aspectRatio = fields.preset;
    state.canvas.customAspectWidth = fields.customW;
    state.canvas.customAspectHeight = fields.customH;
  }
  const frontmatter = splitMermaidFrontmatter(source);
  state.preservedBlocks = {
    frontmatterRoot: frontmatter.root,
    headerLines: [],
    bodyExtraLines: [],
    footerLines: [],
  };
  applyAppearanceFromConfig(state.appearance, frontmatter.config);
  if (frontmatter.title) {
    state.canvas.title = frontmatter.title;
  }
  source = frontmatter.body;
  if (!state.canvas.title) {
    const commentedTitle = readTitleComment(source);
    if (commentedTitle) {
      state.canvas.title = commentedTitle;
    }
  }
  if (sourceHasSequenceAutonumber(source)) {
    state.appearance.sequenceAutonumber = true;
  }
  const lines = source.split(/\r?\n/);
  state.preservedComments = collectStandardPreservedComments(lines);

  for (const raw of lines) {
    const trimmed = raw.trim();
    const titleMatch = /^title\s+(.+)$/i.exec(trimmed);
    if (titleMatch) {
      state.canvas.title = unquote(titleMatch[1]);
      break;
    }
  }

  switch (diagramType) {
    case "pie": {
      state.options.showData = /\bpie\s+showData\b/i.test(source);
      const rows: string[][] = [];
      for (const raw of lines) {
        const m = /^"([^"]+)"\s*:\s*([-+]?\d+(?:[.,]\d+)?)/.exec(raw.trim());
        if (m) {
          rows.push([m[1], m[2].replace(",", ".")]);
        }
      }
      state.rows =
        rows.length > 0
          ? rows
          : [
              ["PlantUML", "45"],
              ["Mermaid", "35"],
              ["D2", "20"],
            ];
      return state;
    }

    case "xychart": {
      let xCategories: string[] = [];
      const seriesList: { name: string; values: string[] }[] = [];
      let barIdx = 1;
      let lineIdx = 1;

      for (const raw of lines) {
        const trimmed = raw.trim();
        if (trimmed.startsWith("%%")) continue;
        const xMatch = /^x-axis\s+(?:"[^"]*"\s+)?\[(.*)\]/i.exec(trimmed);
        if (xMatch) {
          xCategories = xMatch[1]
            .split(",")
            .map((s) => unquote(s))
            .filter(Boolean);
          continue;
        }
        const yMatch = /^y-axis\s+(?:"([^"]*)"\s*)?(?:(-?[\d.]+)\s*-->\s*(-?[\d.]+))?/i.exec(trimmed);
        if (yMatch) {
          if (yMatch[1]) state.canvas.yAxis.label = yMatch[1];
          if (yMatch[2] !== undefined && yMatch[3] !== undefined) {
            state.canvas.yAxis.autoRange = false;
            state.canvas.yAxis.min = yMatch[2];
            state.canvas.yAxis.max = yMatch[3];
          }
          continue;
        }
        const barMatch = /^(bar|line)\s*\[(.*)\]/i.exec(trimmed);
        if (barMatch) {
          const kind = barMatch[1].toLowerCase();
          const vals = barMatch[2]
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          const name = kind === "line" ? `Line ${lineIdx++}` : `Bar ${barIdx++}`;
          seriesList.push({ name, values: vals });
        }
      }

      if (xCategories.length === 0) {
        xCategories = ["Q1", "Q2", "Q3"];
      }
      if (seriesList.length === 0) {
        seriesList.push({ name: "Bar 1", values: ["20", "35", "40"] });
      }

      state.matrixHeaders = seriesList.map((s) => s.name);
      state.matrixRows = xCategories.map((cat, idx) => [
        cat,
        ...seriesList.map((s) => s.values[idx] ?? "0"),
      ]);
      return state;
    }

    case "quadrant": {
      const qLabels: [string, string, string, string] = ["", "", "", ""];
      const rows: string[][] = [];

      for (const raw of lines) {
        const trimmed = raw.trim();
        if (trimmed.startsWith("%%")) continue;
        const xMatch = /^x-axis\s+(.+?)\s*-->\s*(.+)$/i.exec(trimmed);
        if (xMatch) {
          state.canvas.xAxis.label = `${unquote(xMatch[1])} --> ${unquote(xMatch[2])}`;
          continue;
        }
        const yMatch = /^y-axis\s+(.+?)\s*-->\s*(.+)$/i.exec(trimmed);
        if (yMatch) {
          state.canvas.yAxis.label = `${unquote(yMatch[1])} --> ${unquote(yMatch[2])}`;
          continue;
        }
        const qMatch = /^quadrant-([1-4])\s+(.+)$/i.exec(trimmed);
        if (qMatch) {
          qLabels[Number(qMatch[1]) - 1] = unquote(qMatch[2]);
          continue;
        }
        const ptMatch = /^([^:]+):\s*\[\s*([-+]?[\d.]+)\s*,\s*([-+]?[\d.]+)\s*\]/.exec(trimmed);
        if (ptMatch) {
          rows.push([ptMatch[1].trim(), ptMatch[2], ptMatch[3]]);
        }
      }
      state.canvas.quadrants = qLabels;
      state.rows =
        rows.length > 0
          ? rows
          : [
              ["Editor", "0.85", "0.35"],
              ["Export", "0.70", "0.80"],
            ];
      return state;
    }

    case "sankey": {
      const rows: string[][] = [];
      for (const raw of lines) {
        const flow = parseMermaidSankeyCsvLine(raw);
        if (!flow) continue;
        rows.push([flow.source, flow.target, formatCleanNumber(flow.value)]);
      }
      state.rows =
        rows.length > 0
          ? rows
          : [
              ["Visit", "Catalog", "80"],
              ["Catalog", "Checkout", "50"],
            ];
      return state;
    }

    case "gantt": {
      const rows: string[][] = [];
      let currentSection = "";
      const bodyExtraLines: string[] = [];
      if (format === "plantuml") {
        interface PumlGanttTaskInfo {
          start: string;
          duration: string;
          section: string;
          status: string;
          taskId: string;
          color: string;
        }
        const tasks = new Map<string, PumlGanttTaskInfo>();
        let sawSaturdayClosed = false;
        let sawSundayClosed = false;

        const ensureTask = (name: string): PumlGanttTaskInfo => {
          const existing = tasks.get(name);
          if (existing) return existing;
          const created: PumlGanttTaskInfo = {
            start: "",
            duration: "3d",
            section: currentSection,
            status: "",
            taskId: "",
            color: "",
          };
          tasks.set(name, created);
          return created;
        };

        for (const raw of lines) {
          const trimmed = raw.trim();
          if (
            !trimmed ||
            trimmed.startsWith("'") ||
            /^@(?:start|end)gantt\b/i.test(trimmed) ||
            /^title\b/i.test(trimmed)
          ) {
            continue;
          }
          const projStart = /^project\s+starts\s+(\S+)/i.exec(trimmed);
          if (projStart) {
            state.canvas.ganttDateFormat = "YYYY-MM-DD";
            state.canvas.ganttProjectStarts = projStart[1];
            continue;
          }
          const langMatch = /^language\s+(\S+)/i.exec(trimmed);
          if (langMatch) {
            state.canvas.ganttLanguage = langMatch[1].toLowerCase();
            continue;
          }
          const scaleMatch = /^(?:printscale|ganttscale|projectscale)\s+(daily|weekly|monthly|quarterly|yearly)\b(.*)$/i.exec(
            trimmed,
          );
          if (scaleMatch) {
            state.canvas.ganttScale = scaleMatch[1].toLowerCase() as NonNullable<
              typeof state.canvas.ganttScale
            >;
            const zoomTail = /\bzoom\s+([\d.]+)/i.exec(scaleMatch[2] ?? "");
            if (zoomTail) {
              state.canvas.ganttZoom = zoomTail[1];
            }
            continue;
          }
          const zoomMatch = /^zoom\s+([\d.]+)$/i.exec(trimmed);
          if (zoomMatch) {
            state.canvas.ganttZoom = zoomMatch[1];
            continue;
          }
          if (/^saturday\s+are\s+closed$/i.test(trimmed)) {
            sawSaturdayClosed = true;
            if (sawSundayClosed) state.canvas.ganttClosedWeekends = true;
            continue;
          }
          if (/^sunday\s+are\s+closed$/i.test(trimmed)) {
            sawSundayClosed = true;
            if (sawSaturdayClosed) state.canvas.ganttClosedWeekends = true;
            continue;
          }
          const sepMatch = /^--\s*(.+?)\s*--$/.exec(trimmed);
          if (sepMatch) {
            currentSection = sepMatch[1].trim();
            continue;
          }
          const taskMatch = /^(?:then\s+)?\[([^\]]+)\](?:\s+as\s+\[([^\]]+)\])?\s+(.+)$/i.exec(trimmed);
          if (
            taskMatch &&
            /\b(?:lasts|requires|starts|ends|happens|is)\b/i.test(taskMatch[3])
          ) {
            const name = taskMatch[1].trim();
            const alias = taskMatch[2]?.trim() ?? "";
            const clauses = taskMatch[3].trim();
            const info = ensureTask(name);
            if (alias) info.taskId = alias;
            if (currentSection && !info.section) info.section = currentSection;

            const colorClause = /\bis\s+colored\s+in\s+([^\s]+)\b/i.exec(clauses);
            if (colorClause) {
              info.color = colorClause[1];
            }
            const pctClause = /\bis\s+(\d+)%\s+completed?\b/i.exec(clauses);
            if (pctClause) {
              const pct = Number(pctClause[1]);
              info.status = pct >= 100 ? "done" : pct > 0 ? "active" : info.status;
            }
            const happensClause = /\bhappens\s+(?:at\s+)?(.+?)(?:\s+and\s+is\b|$)/i.exec(clauses);
            if (happensClause) {
              info.status = "milestone";
              info.duration = "0d";
              const target = happensClause[1].trim();
              const depEnd = /^\[([^\]]+)\]'s\s+(?:end|start)$/i.exec(target);
              info.start = depEnd ? `after ${depEnd[1]}` : target;
            }
            const lastsClause = /\b(?:lasts|requires)\s+(\d+)\s*(days?|weeks?|months?)/i.exec(clauses);
            if (lastsClause) {
              const unit = lastsClause[2].toLowerCase().startsWith("w")
                ? "w"
                : lastsClause[2].toLowerCase().startsWith("m")
                  ? "m"
                  : "d";
              info.duration = `${lastsClause[1]}${unit}`;
            }
            const startsAtClause = /\bstarts\s+(?:at\s+)?\[([^\]]+)\]'s\s+(?:end|start)/i.exec(clauses);
            if (startsAtClause) {
              info.start = `after ${startsAtClause[1]}`;
            } else {
              const startsDateClause = /\bstarts\s+(\d{4}-\d{2}-\d{2}|D\+\d+)/i.exec(clauses);
              if (startsDateClause) {
                info.start = startsDateClause[1];
              }
            }
            const endsDateClause = /\bends\s+(\d{4}-\d{2}-\d{2})/i.exec(clauses);
            if (endsDateClause && !lastsClause) {
              info.duration = endsDateClause[1];
            }
            continue;
          }
          bodyExtraLines.push(trimmed);
        }
        if (sawSaturdayClosed !== sawSundayClosed) {
          bodyExtraLines.unshift(
            sawSaturdayClosed ? "saturday are closed" : "sunday are closed",
          );
        }
        const defaultStart = state.canvas.ganttProjectStarts || "2026-01-01";
        let idx = 0;
        for (const [task, info] of tasks.entries()) {
          const fallbackStart = idx === 0 ? defaultStart : "";
          rows.push([
            task,
            info.start || fallbackStart,
            info.duration || "3d",
            info.section,
            info.status,
            info.taskId,
            info.color,
          ]);
          idx += 1;
        }
      } else {
        for (const raw of lines) {
          const trimmed = raw.trim();
          if (!trimmed || trimmed.startsWith("%%") || /^gantt\b/i.test(trimmed)) continue;
          const dfMatch = /^dateFormat\s+(.+)$/i.exec(trimmed);
          if (dfMatch) {
            state.canvas.ganttDateFormat = dfMatch[1].trim();
            continue;
          }
          const afMatch = /^axisFormat\s+(.+)$/i.exec(trimmed);
          if (afMatch) {
            state.canvas.ganttAxisFormat = afMatch[1].trim();
            continue;
          }
          const exMatch = /^excludes\s+(.+)$/i.exec(trimmed);
          if (exMatch) {
            state.canvas.ganttExcludes = exMatch[1].trim();
            continue;
          }
          const tmMatch = /^todayMarker\s+(.+)$/i.exec(trimmed);
          if (tmMatch) {
            state.canvas.ganttTodayMarker = tmMatch[1].trim();
            continue;
          }
          if (/^inclusiveEndDates\b/i.test(trimmed)) {
            state.canvas.ganttInclusiveEndDates = true;
            continue;
          }
          const tickMatch = /^tickInterval\s+(.+)$/i.exec(trimmed);
          if (tickMatch) {
            state.appearance.gantt.tickInterval = tickMatch[1].trim();
            continue;
          }
          const wdMatch = /^weekday\s+(.+)$/i.exec(trimmed);
          if (wdMatch) {
            state.appearance.gantt.weekday = wdMatch[1].trim();
            continue;
          }
          if (/^topAxis\b/i.test(trimmed)) {
            state.appearance.gantt.topAxis = true;
            continue;
          }
          const secMatch = /^section\s+(.+)$/i.exec(trimmed);
          if (secMatch) {
            currentSection = secMatch[1].trim();
            continue;
          }
          if (/^title\b/i.test(trimmed)) continue;
          if (/^(?:click|includes|weekend|accTitle|accDescr)\b/i.test(trimmed)) {
            bodyExtraLines.push(trimmed);
            continue;
          }
          const colonIdx = trimmed.indexOf(":");
          if (colonIdx > 0) {
            const taskName = trimmed.slice(0, colonIdx).trim();
            const tailParts = trimmed
              .slice(colonIdx + 1)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            let status = "";
            let isMilestone = false;
            let taskId = "";
            let start = "";
            let duration = "";
            const remaining: string[] = [];
            for (const part of tailParts) {
              const lower = part.toLowerCase();
              if (lower === "done" || lower === "active" || lower === "crit") {
                if (!status || lower === "crit") status = lower;
              } else if (lower === "milestone") {
                isMilestone = true;
              } else {
                remaining.push(part);
              }
            }
            if (isMilestone) {
              status = "milestone";
            }
            for (const part of remaining) {
              if (/^after\s+/i.test(part) || (/^\d{4}-\d{2}-\d{2}/.test(part) && !start)) {
                start = part;
              } else if (/^\d+\s*[dwmyhs]/i.test(part) || /^until\s+/i.test(part) || (/^\d{4}-\d{2}-\d{2}/.test(part) && start)) {
                duration = part;
              } else if (!taskId && /^[A-Za-z_][\w-]*$/.test(part)) {
                taskId = part;
              } else if (!start) {
                start = part;
              } else if (!duration) {
                duration = part;
              }
            }
            rows.push([
              taskName,
              start || "2026-01-01",
              duration || (isMilestone ? "0d" : "3d"),
              currentSection,
              status,
              taskId,
              "",
            ]);
          } else {
            bodyExtraLines.push(trimmed);
          }
        }
      }
      if (state.preservedBlocks) {
        state.preservedBlocks.bodyExtraLines = bodyExtraLines;
      }
      state.rows =
        rows.length > 0
          ? rows
          : [
              ["Analysis", "2026-01-02", "5d", "Planning", "", "a1", ""],
              ["Prototype", "after a1", "4d", "Planning", "", "a2", ""],
            ];
      return state;
    }

    case "timeline": {
      const rows: string[][] = [];
      let currentSection = "";
      for (const raw of lines) {
        const trimmed = raw.trim();
        if (!trimmed || trimmed.startsWith("%%") || trimmed.startsWith("'")) continue;
        if (/^(?:timeline|title|@start|@end)/i.test(trimmed)) continue;
        const pumlMatch = /^\[([^\]]+)\]\s+is\s+\{([^}]+)\}/i.exec(trimmed);
        if (pumlMatch) {
          rows.push([pumlMatch[1].trim(), pumlMatch[2].trim(), ""]);
          continue;
        }
        const secMatch = /^section\s+(.+)$/i.exec(trimmed);
        if (secMatch) {
          currentSection = secMatch[1].trim();
          continue;
        }
        const colonIdx = trimmed.indexOf(":");
        if (colonIdx > 0) {
          rows.push([
            trimmed.slice(0, colonIdx).trim(),
            trimmed.slice(colonIdx + 1).trim(),
            currentSection,
          ]);
        }
      }
      state.rows =
        rows.length > 0
          ? rows
          : [
              ["2024", "PlantUML offline", "Core"],
              ["2025", "Mermaid & D2", "Languages"],
            ];
      return state;
    }

    case "journey": {
      const rows: string[][] = [];
      let currentSection = "";
      for (const raw of lines) {
        const trimmed = raw.trim();
        if (!trimmed || trimmed.startsWith("%%") || /^(?:journey|title)\b/i.test(trimmed)) continue;
        const secMatch = /^section\s+(.+)$/i.exec(trimmed);
        if (secMatch) {
          currentSection = secMatch[1].trim();
          continue;
        }
        const parts = trimmed.split(":").map((s) => s.trim());
        if (parts.length >= 2) {
          rows.push([parts[0], parts[1] || "5", parts[2] || "User", currentSection]);
        }
      }
      state.rows =
        rows.length > 0
          ? rows
          : [
              ["Open catalog", "5", "Customer", "Browse"],
              ["Pay with card", "4", "Customer, Bank", "Checkout"],
            ];
      return state;
    }

    case "packet": {
      const rows: string[][] = [];
      for (const raw of lines) {
        const trimmed = raw.trim();
        const m = /^(\d+(?:-\d+)?)\s*:\s*(.+)$/.exec(trimmed);
        if (m) {
          rows.push([m[1], unquote(m[2])]);
        }
      }
      state.rows =
        rows.length > 0
          ? rows
          : [
              ["0-15", "Source Port"],
              ["16-31", "Destination Port"],
            ];
      return state;
    }

    case "wbs":
    case "mindmap": {
      if (format === "plantuml" && diagramType === "mindmap") {
        state.canvas.direction = detectDiagramDirection(source, format) ?? "TB";
      }
      if (format === "plantuml") {
        state.plantUmlSkin = extractPlantUmlStyleDirectives(source);
        const bodyExtra: string[] = [];
        let inLegend = false;
        for (const raw of lines) {
          const trimmed = raw.trim();
          if (/^legend\b/i.test(trimmed)) {
            inLegend = true;
            bodyExtra.push(trimmed);
            continue;
          }
          if (inLegend) {
            bodyExtra.push(trimmed);
            if (/^endlegend\b/i.test(trimmed)) inLegend = false;
            continue;
          }
          if (/^(?:header|footer|caption)\b/i.test(trimmed)) {
            bodyExtra.push(trimmed);
          }
        }
        if (state.preservedBlocks) {
          state.preservedBlocks.bodyExtraLines = bodyExtra;
        }
      }
      const rows = parseHierarchyLinesToFlatRows(
        lines,
        format === "mermaid" && diagramType === "mindmap",
      );
      state.rows =
        rows.length > 0
          ? rows
          : [
              ["Project", "Design", "UI", ""],
              ["Project", "Backend", "API", ""],
            ];
      return state;
    }

    case "nwdiag": {
      const rows: string[][] = [];
      let currentNet = "";
      for (const raw of lines) {
        const trimmed = raw.trim();
        const netMatch = /^network\s+([^\s{]+)/i.exec(trimmed);
        if (netMatch) {
          currentNet = netMatch[1];
          continue;
        }
        if (trimmed === "}") {
          currentNet = "";
          continue;
        }
        if (currentNet && !trimmed.startsWith("address") && !trimmed.startsWith("color")) {
          const nodeMatch = /^([^\s[]+)(?:\s*\[.*address\s*=\s*"([^"]+)".*\])?/i.exec(trimmed);
          if (nodeMatch) {
            rows.push([nodeMatch[1], nodeMatch[2] ?? "", currentNet]);
          }
        }
      }
      state.rows =
        rows.length > 0
          ? rows
          : [
              ["web", "10.0.0.1", "office"],
              ["api", "10.0.0.2", "office"],
            ];
      return state;
    }

    case "wireframe": {
      const headers: string[] = [];
      const bodyRows: string[][] = [];
      let inHead = false;
      let inBody = false;
      let currentRow: string[] | null = null;

      for (const raw of lines) {
        const trimmed = raw.trim();
        if (/^TableHead\b/.test(trimmed)) {
          inHead = true;
          inBody = false;
          continue;
        }
        if (/^TableBody\b/.test(trimmed)) {
          inHead = false;
          inBody = true;
          continue;
        }
        if (/^TableRow\b/.test(trimmed)) {
          if (currentRow && inBody) {
            bodyRows.push(currentRow);
          }
          currentRow = [];
          continue;
        }
        const cellMatch = /^TableCell\s+"([^"]*)"/.exec(trimmed);
        if (cellMatch) {
          if (inHead) {
            headers.push(cellMatch[1]);
          } else if (inBody && currentRow) {
            currentRow.push(cellMatch[1]);
          }
        }
      }
      if (currentRow && inBody && currentRow.length > 0) {
        bodyRows.push(currentRow);
      }

      if (headers.length >= 2 && bodyRows.length > 0) {
        state.matrixHeaders = headers.slice(1);
        state.matrixRows = bodyRows.map((r) => [r[0] ?? "", ...r.slice(1)]);
      } else {
        state.matrixHeaders = ["Owner", "Status", "Metric"];
        state.matrixRows = [
          ["Login", "Anna", "Draft", "128"],
          ["Dashboard", "Mark", "Ready", "860"],
        ];
      }
      return state;
    }

    default: {
      state.graphNodes = [];
      state.graphEdges = [];
      // Graph / Structural / Behavioral diagrams via DiagramIR
      const { ir } = safeParseSourceToIr(source, format);
      if (ir) {
        state.canvas.direction = ir.direction ?? "TB";
        if (!state.canvas.title && ir.extras?.title && format !== "d2") {
          state.canvas.title = ir.extras.title;
        }
        if (ir.extras?.blockColumns) {
          state.canvas.blockColumns = ir.extras.blockColumns;
        }
        const groupMap = new Map(
          (ir.groups ?? []).map((g) => [g.id, g.label || g.id]),
        );
        state.graphNodes = ir.nodes.map((node) => {
          const pType = node.semantic?.participantType
            ? String(node.semantic.participantType)
            : "";
          const resolvedKind =
            pType && pType !== "participant" ? pType : (node.kind ?? "default");
          return {
            id: node.id,
            label: node.label || node.id,
            kind: resolvedKind,
            group: node.groupId ? (groupMap.get(node.groupId) ?? node.groupId) : "",
            color: node.visual?.fill ?? "",
          };
        });
        if (format === "plantuml") {
          const groupColors: Record<string, string> = {};
          for (const group of ir.groups ?? []) {
            if (group.fill && group.label) {
              groupColors[group.label] = group.fill;
            }
          }
          state.groupColors = groupColors;
          state.plantUmlSkin = extractPlantUmlStyleDirectives(source);
        }
        if (state.preservedBlocks) {
          state.preservedBlocks.bodyExtraLines = extractGraphExtraLines(source, format);
        }
        state.graphEdges = ir.edges.map((edge) => ({
          source: edge.source,
          target: edge.target,
          kind: edge.kind ?? "arrow",
          label: edge.label ?? "",
        }));
      }

      if (state.graphNodes.length === 0) {
        state.graphNodes = [
          { id: "A", label: "Start", kind: "default", group: "", color: "" },
          { id: "B", label: "Process", kind: "default", group: "", color: "" },
          { id: "C", label: "End", kind: "default", group: "", color: "" },
        ];
        state.graphEdges = [
          { source: "A", target: "B", kind: "arrow", label: "Step 1" },
          { source: "B", target: "C", kind: "arrow", label: "Step 2" },
        ];
      }
      return state;
    }
  }
}

function extractGraphExtraLines(source: string, format: DiagramFormat): string[] {
  const extras: string[] = [];
  if (format === "mermaid") {
    for (const raw of source.split(/\r?\n/)) {
      const trimmed = raw.trim();
      if (/^(?:classDef|style|linkStyle|click)\b/i.test(trimmed)) {
        extras.push(`  ${trimmed}`);
      }
    }
  } else if (format === "plantuml") {
    let inNote = false;
    let inLegend = false;
    for (const raw of source.split(/\r?\n/)) {
      const trimmed = raw.trim();
      if (inNote) {
        extras.push(trimmed);
        if (/^end\s*note\b/i.test(trimmed)) inNote = false;
        continue;
      }
      if (inLegend) {
        extras.push(trimmed);
        if (/^endlegend\b/i.test(trimmed)) inLegend = false;
        continue;
      }
      if (/^note\b/i.test(trimmed)) {
        extras.push(trimmed);
        if (!/:/.test(trimmed)) inNote = true;
        continue;
      }
      if (/^legend\b/i.test(trimmed)) {
        extras.push(trimmed);
        if (!/:/.test(trimmed)) inLegend = true;
        continue;
      }
      if (/^(?:header|footer|caption|hide\b|show\b|scale\b|pragma\b|!pragma\b)/i.test(trimmed)) {
        extras.push(trimmed);
      }
    }
  }
  return extras;
}

function injectPreservedLinesAndComments(
  source: string,
  state: DiagramBuilderState,
): string {
  let result = source;
  const comments = state.preservedComments.filter((c) => c.trim());
  const extras = (state.preservedBlocks?.bodyExtraLines ?? []).filter((e) => e.trim());

  if (state.format === "plantuml") {
    if (comments.length > 0 && /^@start\w+/m.test(result)) {
      const missingComments = comments.filter((c) => !result.includes(c));
      if (missingComments.length > 0) {
        result = result.replace(
          /^(@start\w+[^\n]*\r?\n)/m,
          `$1${missingComments.join("\n")}\n`,
        );
      }
    }
    if (extras.length > 0 && /^@end\w+/m.test(result)) {
      const missingExtras = extras.filter((e) => !result.includes(e));
      if (missingExtras.length > 0) {
        result = result.replace(
          /^(@end\w+)/m,
          `${missingExtras.join("\n")}\n$1`,
        );
      }
    }
  } else if (state.format === "mermaid") {
    if (comments.length > 0) {
      const missingComments = comments.filter((c) => !result.includes(c));
      if (missingComments.length > 0) {
        result = `${missingComments.join("\n")}\n${result}`;
      }
    }
    if (extras.length > 0) {
      const missingExtras = extras.filter((e) => !result.includes(e.trim()));
      if (missingExtras.length > 0) {
        result = `${result}\n${missingExtras.join("\n")}`;
      }
    }
  }
  return result;
}

export function emitStandardDiagramFromBuilderState(
  state: DiagramBuilderState,
  originalSource = "",
): string {
  const rawBody = emitStandardDiagramBody(state, originalSource);
  const source = injectPreservedLinesAndComments(rawBody, state);
  const withNumbers =
    state.appearance.sequenceAutonumber && state.diagramType === "sequence"
      ? injectSequenceAutonumber(source, state.format)
      : source;
  return insertAspectMarker(
    prependMermaidConfig(state, injectDiagramTitle(withNumbers, state)),
    state.format,
    canvasAspectToken(state.canvas),
  );
}

function prependMermaidConfig(state: DiagramBuilderState, source: string): string {
  if (state.format !== "mermaid") {
    return source;
  }
  const title = sourceHasTitleDirective(source) ? "" : state.canvas.title;
  const header = buildMermaidConfigHeader(
    state.appearance,
    state.diagramType,
    title,
    state.preservedBlocks?.frontmatterRoot,
  );
  return header ? `${header}${source}` : source;
}

function readTitleComment(source: string): string {
  const match = /^(?:#|\/\/)[ \t]*title:[ \t]*(.+)$/im.exec(source);
  return match?.[1]?.trim() ?? "";
}

function injectDiagramTitle(source: string, state: DiagramBuilderState): string {
  const title = state.canvas.title.trim().replace(/\s+/g, " ");
  if (state.format === "plantuml") {
    if (!title || sourceHasTitleDirective(source)) return source;
    const line = `title ${title}`;
    if (/^@start\w+/m.test(source)) {
      return source.replace(/^(@start\w+[^\n]*\r?\n)/m, `$1${line}\n`);
    }
    return `${line}\n${source}`;
  }
  if (state.format !== "d2" && state.format !== "wiremark") {
    return source;
  }
  const stripped = source.replace(/^(?:#|\/\/)[ \t]*title:[^\n]*(?:\r?\n|$)/gim, "");
  if (!title) return stripped;
  const prefix = state.format === "d2" ? "# title:" : "// title:";
  return `${prefix} ${title}\n${stripped}`;
}

function emitStandardDiagramBody(
  state: DiagramBuilderState,
  originalSource = "",
): string {
  const { canvas, options, format, diagramType } = state;

  switch (diagramType) {
    case "pie": {
      const header = options.showData ? "pie showData" : "pie";
      const lines = [header];
      if (canvas.title.trim()) {
        lines.push(`    title ${canvas.title.trim()}`);
      }
      for (const row of state.rows) {
        const label = (row[0] ?? "").trim().replace(/"/g, "'") || "Slice";
        const num = Number((row[1] ?? "10").replace(",", "."));
        const safeNum = Number.isFinite(num) && num >= 0 ? num : 10;
        lines.push(`    "${label}" : ${formatCleanNumber(safeNum)}`);
      }
      if ( lines.length === 1 || (lines.length === 2 && canvas.title.trim()) ) {
        lines.push('    "Item 1" : 60', '    "Item 2" : 40');
      }
      return lines.join("\n");
    }

    case "xychart": {
      const lines = ["xychart-beta"];
      if (canvas.title.trim()) {
        lines.push(`    title "${canvas.title.trim().replace(/"/g, "'")}"`);
      }
      const cats =
        state.matrixRows.length > 0
          ? state.matrixRows.map((r, idx) => `"${((r[0] ?? "").trim() || `${idx + 1}`).replace(/"/g, "'")}"`)
          : ['"Q1"', '"Q2"'];
      lines.push(`    x-axis [${cats.join(", ")}]`);

      const allNums: number[] = [];
      for (const row of state.matrixRows) {
        for (let c = 1; c <= state.matrixHeaders.length; c += 1) {
          const n = Number((row[c] ?? "0").replace(",", "."));
          if (Number.isFinite(n)) allNums.push(n);
        }
      }
      const yLbl = `"${canvas.yAxis.label.trim().replace(/"/g, "'")}"`;
      if (!canvas.yAxis.autoRange) {
        const min = Number(canvas.yAxis.min);
        const max = Number(canvas.yAxis.max);
        if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
          lines.push(`    y-axis ${yLbl} ${formatCleanNumber(min)} --> ${formatCleanNumber(max)}`);
        }
      } else {
        const minVal = Math.min(0, ...allNums);
        const maxVal = Math.ceil(Math.max(10, ...allNums) * 1.1);
        lines.push(`    y-axis ${yLbl} ${formatCleanNumber(minVal)} --> ${formatCleanNumber(maxVal)}`);
      }

      state.matrixHeaders.forEach((header, colIdx) => {
        const isLine = /^line\b/i.test(header.trim());
        const vals = state.matrixRows.map((row) => {
          const n = Number((row[colIdx + 1] ?? "0").replace(",", "."));
          return Number.isFinite(n) ? formatCleanNumber(n) : "0";
        });
        lines.push(`    ${isLine ? "line" : "bar"} [${vals.join(", ")}]`);
      });

      return lines.join("\n");
    }

    case "quadrant": {
      const lines = ["quadrantChart"];
      if (canvas.title.trim()) {
        lines.push(`    title ${canvas.title.trim()}`);
      }
      if (canvas.xAxis.label.trim()) {
        const parts = canvas.xAxis.label.split("-->").map((s) => s.trim());
        if (parts.length === 2 && parts[0] && parts[1]) {
          lines.push(`    x-axis ${parts[0]} --> ${parts[1]}`);
        } else {
          lines.push(`    x-axis ${canvas.xAxis.label.trim()}`);
        }
      } else {
        lines.push("    x-axis Low --> High");
      }
      if (canvas.yAxis.label.trim()) {
        const parts = canvas.yAxis.label.split("-->").map((s) => s.trim());
        if (parts.length === 2 && parts[0] && parts[1]) {
          lines.push(`    y-axis ${parts[0]} --> ${parts[1]}`);
        } else {
          lines.push(`    y-axis ${canvas.yAxis.label.trim()}`);
        }
      } else {
        lines.push("    y-axis Low --> High");
      }

      canvas.quadrants.forEach((q, idx) => {
        if (q.trim()) {
          lines.push(`    quadrant-${idx + 1} ${q.trim()}`);
        }
      });

      for (const row of state.rows) {
        const label = (row[0] ?? "").trim().replace(/:/g, " -") || "Item";
        let x = Number((row[1] ?? "0.5").replace(",", "."));
        let y = Number((row[2] ?? "0.5").replace(",", "."));
        if (!Number.isFinite(x)) x = 0.5;
        if (!Number.isFinite(y)) y = 0.5;
        if (x > 1 || y > 1) {
          x /= 100;
          y /= 100;
        }
        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));
        lines.push(`    ${label}: [${formatCleanNumber(x)}, ${formatCleanNumber(y)}]`);
      }
      return lines.join("\n");
    }

    case "sankey": {
      const lines = ["sankey-beta"];
      for (const row of state.rows) {
        const src = (row[0] ?? "").trim() || "Source";
        const tgt = (row[1] ?? "").trim() || "Target";
        const val = Number((row[2] ?? "10").replace(",", "."));
        lines.push(
          `${formatMermaidSankeyCsvField(src)},${formatMermaidSankeyCsvField(tgt)},${formatCleanNumber(Number.isFinite(val) ? val : 10)}`,
        );
      }
      return lines.join("\n");
    }

    case "gantt": {
      if (format === "plantuml") {
        const lines = ["@startgantt"];
        if (canvas.ganttLanguage?.trim()) {
          lines.push(`language ${canvas.ganttLanguage.trim()}`);
        }
        if (canvas.ganttScale?.trim()) {
          const zoomPart = canvas.ganttZoom?.trim()
            ? ` zoom ${canvas.ganttZoom.trim()}`
            : "";
          lines.push(`printscale ${canvas.ganttScale.trim()}${zoomPart}`);
        } else if (canvas.ganttZoom?.trim()) {
          lines.push(`zoom ${canvas.ganttZoom.trim()}`);
        }
        if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
        const projStarts = canvas.ganttProjectStarts?.trim() || "2026-01-01";
        lines.push(`project starts ${projStarts}`);
        if (canvas.ganttClosedWeekends) {
          lines.push("saturday are closed", "sunday are closed");
        }
        let currentSec = "";
        state.rows.forEach((row, idx) => {
          const task = (row[0] ?? "").trim().replace(/[[\]]/g, "") || `Task ${idx + 1}`;
          const start = (row[1] ?? "").trim();
          const rawDur = (row[2] ?? "").trim();
          const sec = (row[3] ?? "").trim();
          const status = (row[4] ?? "").trim().toLowerCase();
          const alias = (row[5] ?? "").trim().replace(/[[\]]/g, "");
          const color = (row[6] ?? "").trim();

          if (sec && sec !== currentSec) {
            currentSec = sec;
            lines.push(`-- ${currentSec} --`);
          }

          const aliasPart = alias && alias !== task ? ` as [${alias}]` : "";
          const colorPart = color ? ` and is colored in ${color}` : "";

          if (status === "milestone") {
            const afterMatch = /^after\s+(.+)$/i.exec(start);
            const target = afterMatch
              ? `[${afterMatch[1].trim().replace(/[[\]]/g, "")}]'s end`
              : start || projStarts;
            lines.push(`[${task}]${aliasPart} happens at ${target}${colorPart}`);
            return;
          }

          const durMatch = /^(\d+)\s*([dwm])?/i.exec(rawDur);
          const count = durMatch ? Math.max(1, Number(durMatch[1])) : 3;
          const unitCode = (durMatch?.[2] ?? "d").toLowerCase();
          const unitWord =
            unitCode === "w" ? "weeks" : unitCode === "m" ? "months" : "days";

          let startClause = "";
          const afterMatch = /^after\s+(.+)$/i.exec(start);
          if (afterMatch) {
            const depName = afterMatch[1].trim().replace(/[[\]]/g, "");
            startClause = ` and starts at [${depName}]'s end`;
          } else if (
            start &&
            start !== projStarts &&
            (/^\d{4}-\d{2}-\d{2}$/.test(start) || /^D\+\d+$/i.test(start))
          ) {
            startClause = ` and starts ${start}`;
          }

          const pctClause =
            status === "done"
              ? " and is 100% completed"
              : status === "active"
                ? " and is 50% completed"
                : "";

          lines.push(
            `[${task}]${aliasPart} lasts ${count} ${unitWord}${startClause}${colorPart}${pctClause}`,
          );
        });
        lines.push("@endgantt");
        return lines.join("\n");
      }
      const lines = ["gantt"];
      if (canvas.title.trim()) lines.push(`    title ${canvas.title.trim()}`);
      lines.push(`    dateFormat ${canvas.ganttDateFormat.trim() || "YYYY-MM-DD"}`);
      if (canvas.ganttAxisFormat.trim()) {
        lines.push(`    axisFormat ${canvas.ganttAxisFormat.trim()}`);
      }
      if (canvas.ganttExcludes.trim()) {
        lines.push(`    excludes ${canvas.ganttExcludes.trim()}`);
      }
      if (canvas.ganttTodayMarker?.trim()) {
        lines.push(`    todayMarker ${canvas.ganttTodayMarker.trim()}`);
      }
      if (canvas.ganttInclusiveEndDates) {
        lines.push("    inclusiveEndDates");
      }
      let currentSec = "";
      state.rows.forEach((row, idx) => {
        const task = (row[0] ?? "").trim().replace(/:/g, " -") || `Task ${idx + 1}`;
        const start = (row[1] ?? "").trim() || "2026-01-01";
        const dur = (row[2] ?? "").trim() || "3d";
        const sec = (row[3] ?? "").trim();
        const status = (row[4] ?? "").trim().toLowerCase();
        const customId = (row[5] ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "");
        const taskId = customId || `t${idx + 1}`;
        if (sec && sec !== currentSec) {
          currentSec = sec;
          lines.push(`    section ${currentSec}`);
        }
        const tags: string[] = [];
        if (
          status === "done" ||
          status === "active" ||
          status === "crit" ||
          status === "milestone"
        ) {
          tags.push(status);
        }
        tags.push(taskId, start, status === "milestone" && !row[2]?.trim() ? "0d" : dur);
        lines.push(`    ${task} :${tags.join(", ")}`);
      });
      return lines.join("\n");
    }

    case "timeline": {
      if (format === "plantuml") {
        const lines = ["@startchronology"];
        if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
        let currentSec = "";
        state.rows.forEach((row, idx) => {
          const period = (row[0] ?? "").trim() || `${2026 + idx}`;
          const event = (row[1] ?? "").trim() || `Event ${idx + 1}`;
          const sec = (row[2] ?? "").trim();
          if (sec && sec !== currentSec) {
            currentSec = sec;
            lines.push(`' section: ${currentSec}`);
          }
          lines.push(`[${period}] is {${event}}`);
        });
        lines.push("@endchronology");
        return lines.join("\n");
      }
      const lines = ["timeline"];
      if (canvas.title.trim()) lines.push(`    title ${canvas.title.trim()}`);
      let currentSec = "";
      state.rows.forEach((row, idx) => {
        const period = (row[0] ?? "").trim() || `${2026 + idx}`;
        const event = (row[1] ?? "").trim() || `Event ${idx + 1}`;
        const sec = (row[2] ?? "").trim();
        if (sec && sec !== currentSec) {
          currentSec = sec;
          lines.push(`    section ${currentSec}`);
        }
        lines.push(`${currentSec ? "      " : "    "}${period} : ${event}`);
      });
      return lines.join("\n");
    }

    case "journey": {
      const lines = ["journey"];
      if (canvas.title.trim()) lines.push(`    title ${canvas.title.trim()}`);
      let currentSec = "";
      state.rows.forEach((row, idx) => {
        const step = (row[0] ?? "").trim().replace(/:/g, " -") || `Step ${idx + 1}`;
        const scoreNum = Number((row[1] ?? "5").trim());
        const score = Number.isFinite(scoreNum)
          ? Math.max(1, Math.min(5, Math.round(scoreNum)))
          : 5;
        const actors = (row[2] ?? "").trim() || "User";
        const sec = (row[3] ?? "").trim();
        if (sec && sec !== currentSec) {
          currentSec = sec;
          lines.push(`    section ${currentSec}`);
        }
        lines.push(`      ${step}: ${score}: ${actors}`);
      });
      return lines.join("\n");
    }

    case "packet": {
      const lines = ["packet-beta"];
      if (canvas.title.trim()) lines.push(`    title ${canvas.title.trim()}`);
      state.rows.forEach((row, idx) => {
        const rawBits = (row[0] ?? "").trim();
        const bits = /^\d+(?:\s*-\s*\d+)?$/.test(rawBits)
          ? rawBits.replace(/\s+/g, "")
          : `${idx * 16}-${(idx + 1) * 16 - 1}`;
        const label = ((row[1] ?? "").trim() || `Field ${idx + 1}`).replace(/"/g, "'");
        lines.push(`    ${bits}: "${label}"`);
      });
      return lines.join("\n");
    }

    case "wbs":
    case "mindmap": {
      const roots = new Map<string, Map<string, Array<{ text: string; color: string }>>>();
      const branchColors = new Map<string, string>();
      let lastL1 = "Root";
      let lastL2 = "";
      for (const row of state.rows) {
        const l1 = (row[0] ?? "").trim() || lastL1 || "Root";
        const l2 = (row[1] ?? "").trim();
        const l3 = (row[2] ?? "").trim();
        const rawColor = (row[3] ?? "").trim();
        lastL1 = l1;
        if (!roots.has(l1)) {
          roots.set(l1, new Map());
        }
        const branchMap = roots.get(l1)!;
        const effL2 = l2 || (l3 ? lastL2 || "Branch 1" : "");
        if (effL2) {
          lastL2 = effL2;
          if (!branchMap.has(effL2)) {
            branchMap.set(effL2, []);
          }
          if (l3) {
            branchMap.get(effL2)!.push({ text: l3, color: rawColor });
          } else if (rawColor) {
            branchColors.set(`${l1}::${effL2}`, rawColor);
          }
        }
      }
      if (roots.size === 0) {
        roots.set("Root", new Map([["Branch 1", []]]));
      }

      if (format === "plantuml") {
        const startTag = diagramType === "wbs" ? "@startwbs" : "@startmindmap";
        const endTag = diagramType === "wbs" ? "@endwbs" : "@endmindmap";
        const lines = [startTag];
        if (state.plantUmlSkin?.length) {
          lines.push(...state.plantUmlSkin);
        }
        if (diagramType === "mindmap") {
          lines.push(
            canvas.direction === "LR" || canvas.direction === "RL"
              ? "left to right direction"
              : "top to bottom direction",
          );
        }
        if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
        const fmtPumlColor = (c: string | undefined): string => {
          if (!c) return "";
          const clean = c.trim();
          if (!clean) return "";
          return `[${clean.startsWith("#") ? clean : `#${clean}`}]`;
        };
        for (const [rLabel, branches] of roots.entries()) {
          lines.push(`* ${rLabel}`);
          for (const [bLabel, leaves] of branches.entries()) {
            const bCol = fmtPumlColor(branchColors.get(`${rLabel}::${bLabel}`));
            lines.push(`**${bCol} ${bLabel}`);
            for (const leaf of leaves) {
              const lCol = fmtPumlColor(leaf.color);
              lines.push(`***${lCol} ${leaf.text}`);
            }
          }
        }
        lines.push(endTag);
        return lines.join("\n");
      }

      const lines = ["mindmap"];
      const firstRoot = [...roots.entries()][0];
      if (firstRoot) {
        lines.push(`  root((${firstRoot[0]}))`);
        for (const [bLabel, leaves] of firstRoot[1].entries()) {
          lines.push(`    ${bLabel}`);
          for (const leaf of leaves) {
            lines.push(`      ${leaf.text}`);
          }
        }
      }
      return lines.join("\n");
    }

    case "nwdiag": {
      const lines = ["@startnwdiag"];
      if (canvas.title.trim()) lines.push(`title ${canvas.title.trim()}`);
      lines.push("nwdiag {");
      const networks = new Map<string, { node: string; addr: string }[]>();
      state.rows.forEach((row, idx) => {
        const node = ((row[0] ?? "").trim() || `node_${idx + 1}`).replace(/\s+/g, "_");
        const addr = (row[1] ?? "").trim().replace(/"/g, "");
        const net = ((row[2] ?? "").trim() || "lan").replace(/\s+/g, "_");
        const list = networks.get(net) ?? [];
        list.push({ node, addr });
        networks.set(net, list);
      });
      for (const [net, list] of networks.entries()) {
        lines.push(`  network ${net} {`);
        for (const item of list) {
          lines.push(
            item.addr
              ? `    ${item.node} [address = "${item.addr}"]`
              : `    ${item.node}`,
          );
        }
        lines.push("  }");
      }
      lines.push("}", "@endnwdiag");
      return lines.join("\n");
    }

    case "wireframe": {
      const gridRows = [
        ["Item", ...state.matrixHeaders.map((h, i) => h.trim() || `Col ${i + 1}`)],
        ...state.matrixRows.map((r, i) => [
          (r[0] ?? "").trim() || `Row ${i + 1}`,
          ...state.matrixHeaders.map((_, cIdx) => (r[cIdx + 1] ?? "").trim() || "—"),
        ]),
      ];
      const tsv = serializeGridToClipboardTsv(gridRows);
      const res = applyTableFromClipboardText({
        clipboardText: tsv,
        source: originalSource,
        format: "wiremark",
      });
      if (res.ok) return res.fullSource;
      return originalSource;
    }

    default: {
      // Build DiagramIR from graphNodes & graphEdges and emit for target format
      const irKind = (diagramType === "flowchart" ? "graph" : diagramType) as DiagramKind;
      const ir: DiagramIR = createEmptyDiagramIR(irKind);
      ir.direction = canvas.direction;
      if (canvas.title.trim()) {
        ir.extras = { ...ir.extras, title: canvas.title.trim() };
      }
      if (diagramType === "block") {
        const columns = Number(canvas.blockColumns);
        ir.extras = {
          ...ir.extras,
          blockColumns: Number.isFinite(columns) && columns > 0 ? columns : 3,
        };
      }

      const groupsSet = new Map<string, string>();
      const nodeById = new Map<string, DiagramNode>();
      const nodeIdByLabel = new Map<string, string>();

      state.graphNodes.forEach((n, idx) => {
        const rawId = n.id.trim() || n.label.trim();
        if (!rawId) return;
        const id = sanitizeDiagramId(rawId || `N${idx + 1}`);
        let groupId: string | undefined;
        if (n.group.trim()) {
          const gId = sanitizeDiagramId(n.group.trim());
          groupsSet.set(gId, n.group.trim());
          groupId = gId;
        }
        const label = n.label.trim() || n.id.trim() || id;
        const pumlSeqTypes = new Set([
          "actor",
          "participant",
          "boundary",
          "control",
          "entity",
          "database",
          "queue",
          "collections",
        ]);
        const rawKind = n.kind || "default";
        const diagramNode: DiagramNode = {
          id,
          label,
          kind: (rawKind === "boundary" || rawKind === "control" || rawKind === "entity" || rawKind === "queue"
            ? "container"
            : rawKind) as DiagramNodeSemanticKind,
          groupId,
          visual: n.color.trim() ? { fill: n.color.trim() } : undefined,
          semantic: pumlSeqTypes.has(rawKind) ? { participantType: rawKind } : undefined,
          matchConfidence: 1,
        };
        nodeById.set(id, diagramNode);
        nodeIdByLabel.set(label.toLowerCase(), id);
        if (n.id.trim()) {
          nodeIdByLabel.set(n.id.trim().toLowerCase(), id);
        }
      });

      const resolveOrAddEndpoint = (rawEndpoint: string, fallbackIdx: number): string => {
        const trimmed = rawEndpoint.trim();
        const existingByLabel = nodeIdByLabel.get(trimmed.toLowerCase());
        if (existingByLabel && nodeById.has(existingByLabel)) {
          return existingByLabel;
        }
        const sanitized = sanitizeDiagramId(trimmed || `N${fallbackIdx}`);
        if (nodeById.has(sanitized)) {
          return sanitized;
        }
        const newNode: DiagramNode = {
          id: sanitized,
          label: trimmed || sanitized,
          kind: "default",
          matchConfidence: 1,
        };
        nodeById.set(sanitized, newNode);
        nodeIdByLabel.set((trimmed || sanitized).toLowerCase(), sanitized);
        return sanitized;
      };

      const edges: DiagramEdge[] = state.graphEdges
        .filter((e) => e.source.trim() || e.target.trim())
        .map((e, idx) => {
          const srcId = resolveOrAddEndpoint(e.source || `N${idx * 2 + 1}`, idx * 2 + 1);
          const tgtId = resolveOrAddEndpoint(e.target || `N${idx * 2 + 2}`, idx * 2 + 2);
          return {
            id: `e${idx + 1}`,
            source: srcId,
            target: tgtId,
            label: e.label.trim() || undefined,
            kind: (e.kind || "arrow") as DiagramEdge["kind"],
            matchConfidence: 1,
          };
        });

      if (nodeById.size === 0 && edges.length === 0) {
        nodeById.set("N1", { id: "N1", label: "N1", kind: "default", matchConfidence: 1 });
        nodeById.set("N2", { id: "N2", label: "N2", kind: "default", matchConfidence: 1 });
        edges.push({
          id: "e1",
          source: "N1",
          target: "N2",
          kind: "arrow",
          matchConfidence: 1,
        });
      }

      ir.nodes = [...nodeById.values()];
      ir.groups = [...groupsSet.entries()].map(([id, label]) => ({
        id,
        label,
        fill: state.groupColors?.[label],
      }));
      ir.edges = edges;
      if (format === "plantuml" && state.plantUmlSkin?.length) {
        ir.extras = { ...ir.extras, plantUmlSkin: state.plantUmlSkin };
      }

      switch (format) {
        case "mermaid":
          return emitMermaidFromIr(ir);
        case "plantuml":
          return emitPlantUmlFromIr(ir);
        case "d2":
          return emitD2FromIr(ir);
        case "graphml":
          return emitGraphmlFromIr(ir);
        case "structurizr":
          return emitStructurizrFromIr(ir);
        case "wiremark":
          return emitWiremarkFromIr(ir);
        default:
          return emitMermaidFromIr(ir);
      }
    }
  }
}
