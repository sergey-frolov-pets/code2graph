import type { DiagramFormat } from "@/constants/diagram-formats";

export interface FrameAspect {
  width: number;
  height: number;
}

const MAX_FRAME_ASPECT = 8;
const ASPECT_VALUE = /(\d+(?:[.,]\d+)?)\s*[xх×:/]\s*(\d+(?:[.,]\d+)?)/i;
const MARKER_LINE =
  /^[ \t]*(?:%%|\/\/|#|')[ \t]*ratio\b[^\n]*(?:\r?\n|$)/gim;
const XML_MARKER_LINE = /^[ \t]*<!--[ \t]*ratio\b[^>]*-->[ \t]*(?:\r?\n|$)/gim;
const MARKER_VALUE =
  /(?:^|\n)[ \t]*(?:%%|\/\/|#|')[ \t]*ratio\b[ \t]*([^\n]+)|<!--[ \t]*ratio\b[ \t]*([^>]+?)\s*-->/i;
const PRESET_RATIOS = new Set(["16x9", "4x3", "1x1", "16x6", "21x9"]);
const SVG_OPEN_TAG = /<svg\b[^>]*>/i;
const VIEW_BOX_ATTR =
  /\bviewBox="(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)"/i;
const LENGTH_ATTR = (name: string) =>
  new RegExp(`\\b${name}="(-?\\d+(?:\\.\\d+)?)(px)?"`, "i");

export function parseAspectToken(body: string): FrameAspect | null {
  const value = ASPECT_VALUE.exec(body.trim());
  if (!value) return null;
  const width = Number(value[1].replace(",", "."));
  const height = Number(value[2].replace(",", "."));
  if (!(width > 0) || !(height > 0)) return null;
  const aspect = width / height;
  if (aspect > MAX_FRAME_ASPECT || 1 / aspect > MAX_FRAME_ASPECT) return null;
  return { width, height };
}

export function readAspectMarker(source: string): FrameAspect | null {
  const match = MARKER_VALUE.exec(source);
  if (!match) return null;
  return parseAspectToken(match[1] ?? match[2] ?? "");
}

export function aspectFieldsFromMarker(aspect: FrameAspect): {
  preset: string;
  customW: string;
  customH: string;
} {
  const token = aspectToken(aspect.width, aspect.height);
  if (PRESET_RATIOS.has(token)) {
    return {
      preset: token,
      customW: String(aspect.width),
      customH: String(aspect.height),
    };
  }
  return {
    preset: "custom",
    customW: String(aspect.width),
    customH: String(aspect.height),
  };
}

export function canvasAspectToken(canvas: {
  aspectRatio: string;
  customAspectWidth: string;
  customAspectHeight: string;
}): string | null {
  if (!canvas.aspectRatio) return null;
  if (canvas.aspectRatio === "custom") {
    const width = Number(canvas.customAspectWidth);
    const height = Number(canvas.customAspectHeight);
    if (!(width > 0) || !(height > 0)) return null;
    const token = aspectToken(width, height);
    return parseAspectToken(token) ? token : null;
  }
  return parseAspectToken(canvas.aspectRatio) ? canvas.aspectRatio : null;
}

export function stripAspectMarkers(source: string): string {
  return source.replace(MARKER_LINE, "").replace(XML_MARKER_LINE, "");
}

export function insertAspectMarker(
  source: string,
  format: DiagramFormat,
  token: string | null,
): string {
  const stripped = stripAspectMarkers(source);
  if (!token) return stripped;
  const line = aspectComment(format, token);
  if (format === "mermaid") {
    const frontmatter = /^(---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$))/.exec(stripped);
    if (frontmatter) {
      return `${frontmatter[1]}${line}\n${stripped.slice(frontmatter[1].length)}`;
    }
    return `${line}\n${stripped}`;
  }
  if (format === "plantuml") {
    if (/@start\w+\b/i.test(stripped)) {
      return stripped.replace(/(@start\w+\b[^\n]*\r?\n)/i, `$1${line}\n`);
    }
    return `${line}\n${stripped}`;
  }
  if (format === "graphml" && /^<\?xml\b[^\n]*\r?\n/i.test(stripped)) {
    return stripped.replace(/^(<\?xml\b[^\n]*\r?\n)/i, `$1${line}\n`);
  }
  return `${line}\n${stripped}`;
}

export function padSvgToAspect(svg: string, aspect: FrameAspect): string {
  const open = SVG_OPEN_TAG.exec(svg);
  if (!open) return svg;
  const tag = open[0];
  const viewBox = VIEW_BOX_ATTR.exec(tag);
  const widthAttr = LENGTH_ATTR("width").exec(tag);
  const heightAttr = LENGTH_ATTR("height").exec(tag);
  const minX = viewBox ? Number(viewBox[1]) : 0;
  const minY = viewBox ? Number(viewBox[2]) : 0;
  const boxWidth = viewBox
    ? Number(viewBox[3])
    : widthAttr
      ? Number(widthAttr[1])
      : 0;
  const boxHeight = viewBox
    ? Number(viewBox[4])
    : heightAttr
      ? Number(heightAttr[1])
      : 0;
  if (!(boxWidth > 0) || !(boxHeight > 0)) return svg;

  const target = aspect.width / aspect.height;
  const current = boxWidth / boxHeight;
  let nextMinX = minX;
  let nextMinY = minY;
  let nextWidth = boxWidth;
  let nextHeight = boxHeight;
  if (current < target - 0.001) {
    nextWidth = boxHeight * target;
    nextMinX -= (nextWidth - boxWidth) / 2;
  } else if (current > target + 0.001) {
    nextHeight = boxWidth / target;
    nextMinY -= (nextHeight - boxHeight) / 2;
  } else {
    return svg;
  }

  let nextTag = tag;
  const nextViewBox = `viewBox="${formatLength(nextMinX)} ${formatLength(nextMinY)} ${formatLength(nextWidth)} ${formatLength(nextHeight)}"`;
  nextTag = viewBox
    ? nextTag.replace(VIEW_BOX_ATTR, nextViewBox)
    : nextTag.replace("<svg", `<svg ${nextViewBox}`);
  nextTag = replaceLength(nextTag, "width", nextWidth, widthAttr?.[2] ?? "");
  nextTag = replaceLength(nextTag, "height", nextHeight, heightAttr?.[2] ?? "");
  return svg.replace(tag, nextTag);
}

export function applyMarkedAspectFrame(source: string, svg: string): string {
  const aspect = readAspectMarker(source);
  if (!aspect) return svg;
  return padSvgToAspect(svg, aspect);
}

function aspectComment(format: DiagramFormat, token: string): string {
  switch (format) {
    case "plantuml":
      return `' ratio ${token}`;
    case "d2":
      return `# ratio ${token}`;
    case "graphml":
      return `<!-- ratio ${token} -->`;
    case "structurizr":
    case "wiremark":
      return `// ratio ${token}`;
    default:
      return `%% ratio ${token}`;
  }
}

function aspectToken(width: number, height: number): string {
  return `${formatLength(width)}x${formatLength(height)}`;
}

function formatLength(value: number): string {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded);
}

function replaceLength(tag: string, name: string, value: number, unit: string): string {
  const pattern = LENGTH_ATTR(name);
  if (!pattern.test(tag)) return tag;
  return tag.replace(pattern, `${name}="${formatLength(value)}${unit}"`);
}
