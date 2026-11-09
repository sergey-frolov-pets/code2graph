import type { DiagramFormat } from "@/constants/diagram-format-ids";
import {
  DATA_LINK_DEFAULT_RANGE,
  DATA_LINK_SOURCE_KEYWORD,
} from "@/services/local-data-link/constants";
import { normalizeDataLinkSlug } from "@/storage/local-data-links";

const UNTIL_EMPTY_ON = "1";
const UNTIL_EMPTY_OFF = "0";

const MARKER_LINE =
  /^[^\n]*code2graph-data-link[^\n]*\r?\n?/m;

const FILE_EXTENSION_PATTERN = /^[a-z0-9]{1,8}$/;

export interface DataLinkSourceMarker {
  slug: string;
  fileExtension: string;
  sheetRange: string;
  untilEmptyRow: boolean;
}

/** Keeps only a file extension. A directory path is never returned. */
export function normalizeDataLinkExtension(value: string): string {
  const base = value.trim().split(/[/\\]/).pop() ?? "";
  const extension = base.includes(".")
    ? base.slice(base.lastIndexOf(".") + 1)
    : base.replace(/^\./, "");
  const normalized = extension.trim().toLowerCase();
  return FILE_EXTENSION_PATTERN.test(normalized) ? normalized : "";
}

interface CommentWrap {
  open: string;
  close: string;
}

function commentWrap(format: DiagramFormat): CommentWrap {
  switch (format) {
    case "mermaid":
      return { open: "%% ", close: "" };
    case "d2":
      return { open: "# ", close: "" };
    case "structurizr":
    case "wiremark":
      return { open: "// ", close: "" };
    case "graphml":
      return { open: "<!-- ", close: " -->" };
    case "plantuml":
      return { open: "' ", close: "" };
  }
}

function newlineOf(source: string): string {
  return source.includes("\r\n") ? "\r\n" : "\n";
}

export function formatDataLinkMarkerLine(
  format: DiagramFormat,
  marker: DataLinkSourceMarker,
): string {
  const params = new URLSearchParams();
  params.set("slug", normalizeDataLinkSlug(marker.slug));
  params.set("ext", normalizeDataLinkExtension(marker.fileExtension));
  params.set("range", marker.sheetRange.trim() || DATA_LINK_DEFAULT_RANGE);
  params.set("untilEmpty", marker.untilEmptyRow ? UNTIL_EMPTY_ON : UNTIL_EMPTY_OFF);
  const wrap = commentWrap(format);
  return `${wrap.open}${DATA_LINK_SOURCE_KEYWORD} ${params.toString()}${wrap.close}`;
}

export function parseDataLinkMarker(source: string): DataLinkSourceMarker | null {
  const keywordAt = source.indexOf(DATA_LINK_SOURCE_KEYWORD);
  if (keywordAt < 0) {
    return null;
  }

  const after = source.slice(keywordAt + DATA_LINK_SOURCE_KEYWORD.length);
  const end = after.search(/\r|\n|-->/);
  const raw = (end < 0 ? after : after.slice(0, end)).trim();
  const params = new URLSearchParams(raw.startsWith("&") ? raw.slice(1) : raw);
  const range = params.get("range")?.trim() || DATA_LINK_DEFAULT_RANGE;

  const fileExtension =
    normalizeDataLinkExtension(params.get("ext") ?? "") ||
    normalizeDataLinkExtension(params.get("path") ?? "");

  return {
    slug: normalizeDataLinkSlug(params.get("slug") ?? ""),
    fileExtension,
    sheetRange: range,
    untilEmptyRow: params.get("untilEmpty") === UNTIL_EMPTY_ON,
  };
}

export function removeDataLinkMarker(source: string): string {
  return source.replace(MARKER_LINE, "");
}

function insertMarkerLine(
  source: string,
  format: DiagramFormat,
  line: string,
): string {
  const newline = newlineOf(source);
  const bom = source.startsWith("\uFEFF") ? "\uFEFF" : "";
  const body = bom ? source.slice(1) : source;

  if (format === "graphml") {
    const xml = body.match(/^\s*<\?xml[\s\S]*?\?>\s*/);
    if (xml) {
      const head = xml[0];
      const rest = body.slice(head.length).replace(/^\r?\n/, "");
      const headWithBreak = head.endsWith("\n") ? head : `${head}${newline}`;
      return `${bom}${headWithBreak}${line}${newline}${rest}`;
    }
  }

  if (format === "plantuml") {
    const start = body.match(/^[ \t]*@start\w+[^\n]*\r?\n/);
    if (start) {
      const at = start[0].length;
      return `${bom}${body.slice(0, at)}${line}${newline}${body.slice(at)}`;
    }
  }

  return `${bom}${line}${newline}${body}`;
}

export function upsertDataLinkMarker(
  source: string,
  format: DiagramFormat,
  marker: DataLinkSourceMarker,
): string {
  const line = formatDataLinkMarkerLine(format, marker);
  const current = source.match(MARKER_LINE)?.[0]?.replace(/\r?\n$/, "");
  if (current === line) {
    return source;
  }

  return insertMarkerLine(removeDataLinkMarker(source), format, line);
}
