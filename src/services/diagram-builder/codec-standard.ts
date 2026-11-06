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
import { emitD2FromIr } from "@/services/conversion/emit/emit-d2";
import { emitGraphmlFromIr } from "@/services/conversion/emit/emit-graphml";
import { emitStructurizrFromIr } from "@/services/conversion/emit/emit-structurizr";
import { emitWiremarkFromIr } from "@/services/conversion/emit/emit-wiremark";
import { formatCleanNumber, parseTableNumber } from "@/services/table-paste/parse-clipboard-grid";
import { applyTableFromClipboardText } from "@/services/table-paste";
import { detectDiagramDirection } from "@/services/conversion/classify-diagram-kind";
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

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("%%") || trimmed.startsWith("'") || /^@(?:start|end)/i.test(trimmed)) {
      continue;
    }
    if (/^(?:mindmap|wbs|title)\b/i.test(trimmed)) {
      continue;
    }

    let depth = 1;
    let label = trimmed;

    if (!isMermaidMindmap && /^[*+-]+/.test(trimmed)) {
      const m = /^([*+-]+)(?:\[#[0-9a-fA-F]+\])?_?\s*:?\s*(.*)$/.exec(trimmed);
      if (!m) continue;
      depth = m[1].length;
      label = m[2].replace(/;\s*$/, "").trim();
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
    stack.length = depth;

    if (depth >= 2) {
      rows.push([stack[0] ?? "Root", stack[1] ?? "", stack[2] ?? ""]);
    }
  }

  if (rows.length === 0 && stack.length > 0) {
    rows.push([stack[0] ?? "Root", "Branch 1", "Item 1"]);
  }

  return rows;
}

export function parseStandardDiagramToBuilderState(
  source: string,
  format: DiagramFormat,
  diagramType: DiagramTypeTag,
): DiagramBuilderState {
  const state = createDefaultBuilderState(format, diagramType);
  const lines = source.split(/\r?\n/);

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
        const trimmed = raw.trim();
        if (!trimmed || trimmed.startsWith("%%") || /^sankey/i.test(trimmed)) continue;
        const parts = trimmed.split(",").map((s) => unquote(s));
        if (parts.length >= 3 && parseTableNumber(parts[2]) !== null) {
          rows.push([parts[0], parts[1], parts[2]]);
        }
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
      if (format === "plantuml") {
        const tasks = new Map<string, { start: string; duration: string }>();
        for (const raw of lines) {
          const trimmed = raw.trim();
          const projStart = /^project\s+starts\s+(\S+)/i.exec(trimmed);
          if (projStart) {
            state.canvas.ganttDateFormat = "YYYY-MM-DD";
            continue;
          }
          const lastsMatch = /^\[([^\]]+)\]\s+lasts\s+(\d+)\s*days?/i.exec(trimmed);
          if (lastsMatch) {
            const cur = tasks.get(lastsMatch[1]) ?? { start: "2026-01-01", duration: "3d" };
            cur.duration = `${lastsMatch[2]}d`;
            tasks.set(lastsMatch[1], cur);
            continue;
          }
          const startsMatch = /^\[([^\]]+)\]\s+starts\s+(\d{4}-\d{2}-\d{2})/i.exec(trimmed);
          if (startsMatch) {
            const cur = tasks.get(startsMatch[1]) ?? { start: startsMatch[2], duration: "3d" };
            cur.start = startsMatch[2];
            tasks.set(startsMatch[1], cur);
          }
        }
        for (const [task, info] of tasks.entries()) {
          rows.push([task, info.start, info.duration, ""]);
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
          const secMatch = /^section\s+(.+)$/i.exec(trimmed);
          if (secMatch) {
            currentSection = secMatch[1].trim();
            continue;
          }
          if (/^title\b/i.test(trimmed)) continue;
          const colonIdx = trimmed.indexOf(":");
          if (colonIdx > 0) {
            const taskName = trimmed.slice(0, colonIdx).trim();
            const tailParts = trimmed
              .slice(colonIdx + 1)
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            let start = "2026-01-01";
            let duration = "3d";
            for (const part of tailParts) {
              if (/^\d{4}-\d{2}-\d{2}/.test(part) || /^after\s+/i.test(part)) {
                start = part;
              } else if (/^\d+\s*[dwmyh]/i.test(part)) {
                duration = part;
              }
            }
            rows.push([taskName, start, duration, currentSection]);
          }
        }
      }
      state.rows =
        rows.length > 0
          ? rows
          : [
              ["Analysis", "2026-01-02", "5d", "Planning"],
              ["Prototype", "2026-01-08", "4d", "Planning"],
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
      const rows = parseHierarchyLinesToFlatRows(
        lines,
        format === "mermaid" && diagramType === "mindmap",
      );
      state.rows =
        rows.length > 0
          ? rows
          : [
              ["Project", "Design", "UI"],
              ["Project", "Backend", "API"],
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
      // Graph / Structural / Behavioral diagrams via DiagramIR
      const { ir } = safeParseSourceToIr(source, format);
      if (ir) {
        state.canvas.direction = ir.direction ?? "TB";
        state.canvas.title = ir.extras?.title ?? state.canvas.title;
        const groupMap = new Map(
          (ir.groups ?? []).map((g) => [g.id, g.label || g.id]),
        );
        state.graphNodes = ir.nodes.map((node) => ({
          id: node.id,
          label: node.label || node.id,
          kind: node.kind ?? "default",
          group: node.groupId ? (groupMap.get(node.groupId) ?? node.groupId) : "",
          color: node.visual?.fill ?? "",
        }));
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

export function emitStandardDiagramFromBuilderState(
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
        lines.push(`${src},${tgt},${formatCleanNumber(Number.isFinite(val) ? val : 10)}`);
      }
      return lines.join("\n");
    }

    case "gantt": {
      if (format === "plantuml") {
        const tsv = serializeGridToClipboardTsv(state.rows);
        const res = applyTableFromClipboardText({
          clipboardText: tsv,
          source: originalSource || "@startgantt\n@endgantt",
          format: "plantuml",
        });
        if (res.ok) return res.fullSource;
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
      let currentSec = "";
      state.rows.forEach((row, idx) => {
        const task = (row[0] ?? "").trim().replace(/:/g, " -") || `Task ${idx + 1}`;
        const start = (row[1] ?? "").trim() || "2026-01-01";
        const dur = (row[2] ?? "").trim() || "3d";
        const sec = (row[3] ?? "").trim();
        if (sec && sec !== currentSec) {
          currentSec = sec;
          lines.push(`    section ${currentSec}`);
        }
        lines.push(`    ${task} :t${idx + 1}, ${start}, ${dur}`);
      });
      return lines.join("\n");
    }

    case "timeline":
    case "journey":
    case "packet":
    case "wbs":
    case "mindmap":
    case "nwdiag": {
      const tsv = serializeGridToClipboardTsv(state.rows);
      let baseSource =
        canvas.title.trim() && format === "mermaid"
          ? `${diagramType === "packet" ? "packet-beta" : diagramType}\n    title ${canvas.title.trim()}`
          : originalSource;

      if (format === "plantuml" && diagramType === "mindmap") {
        const dirDirective =
          canvas.direction === "LR" || canvas.direction === "RL"
            ? "left to right direction"
            : "top to bottom direction";
        if (/(?:top\s+to\s+bottom|left\s+to\s+right)\s+direction/i.test(baseSource)) {
          baseSource = baseSource.replace(
            /(?:top\s+to\s+bottom|left\s+to\s+right)\s+direction/gi,
            dirDirective,
          );
        } else if (/@startmindmap\b/i.test(baseSource)) {
          baseSource = baseSource.replace(
            /@startmindmap\b/i,
            `@startmindmap\n${dirDirective}`,
          );
        } else {
          baseSource = `@startmindmap\n${dirDirective}\n@endmindmap`;
        }
      }

      const res = applyTableFromClipboardText({
        clipboardText: tsv,
        source: baseSource,
        format,
      });
      if (res.ok) {
        return res.fullSource;
      }
      return baseSource;
    }

    case "wireframe": {
      const gridRows = [
        ["Item", ...state.matrixHeaders],
        ...state.matrixRows,
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

      const groupsSet = new Map<string, string>();
      const nodes: DiagramNode[] = state.graphNodes.map((n, idx) => {
        const id = sanitizeDiagramId(n.id || n.label || `N${idx + 1}`);
        let groupId: string | undefined;
        if (n.group.trim()) {
          const gId = sanitizeDiagramId(n.group.trim());
          groupsSet.set(gId, n.group.trim());
          groupId = gId;
        }
        return {
          id,
          label: n.label || id,
          kind: (n.kind || "default") as DiagramNodeSemanticKind,
          groupId,
          visual: n.color.trim() ? { fill: n.color.trim() } : undefined,
          matchConfidence: 1,
        };
      });

      ir.nodes = nodes;
      ir.groups = [...groupsSet.entries()].map(([id, label]) => ({ id, label }));

      const edges: DiagramEdge[] = state.graphEdges
        .filter((e) => e.source.trim() && e.target.trim())
        .map((e, idx) => ({
          id: `e${idx + 1}`,
          source: sanitizeDiagramId(e.source),
          target: sanitizeDiagramId(e.target),
          label: e.label.trim() || undefined,
          kind: (e.kind || "arrow") as DiagramEdge["kind"],
          matchConfidence: 1,
        }));
      ir.edges = edges;

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
