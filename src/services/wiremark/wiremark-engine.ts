import { render, WiremarkError } from "@wiremark/core";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { unwrapWiremarkSource } from "@/utils/wiremark-source";

/** MUI spacing units. 2 × 8px matches WireMark's documented frame inset. */
const WIREMARK_DEFAULT_FRAME_PADDING = 2;

/** Pixels added around the SVG so sketch strokes are not clipped. */
const WIREMARK_VIEWBOX_MARGIN_PX = 8;

const WIREFRAME_LINE = /^([ \t]*Wireframe\b.*)$/gm;
const WIREFRAME_PADDING = /\b(?:padding|pad)\s*=/;
const SVG_OPEN_TAG = /^<svg\b[^>]*>/;
const VIEW_BOX_ATTR =
  /\bviewBox="(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)"/;

export interface WiremarkRenderOptions {
  dark: boolean;
}

function commentStart(line: string): number {
  let inString = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (inString && char === "\\") {
      index += 1;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString && char === "/" && line[index + 1] === "/") {
      return index;
    }
  }

  return -1;
}

/** Give a bare Wireframe the library frame inset unless the author set padding. */
export function ensureWireframePadding(source: string): string {
  return source.replace(WIREFRAME_LINE, (line) => {
    const commentIndex = commentStart(line);
    const code = commentIndex === -1 ? line : line.slice(0, commentIndex);
    const comment = commentIndex === -1 ? "" : line.slice(commentIndex);
    if (WIREFRAME_PADDING.test(code)) {
      return line;
    }

    const padded = `${code.trimEnd()} padding=${WIREMARK_DEFAULT_FRAME_PADDING}`;
    if (!comment) {
      return padded;
    }

    return `${padded} ${comment.trimStart()}`;
  });
}

function bumpSvgLength(tag: string, name: string, delta: number): string {
  const pattern = new RegExp(`\\b${name}="(-?\\d+(?:\\.\\d+)?)(px)?"`);
  return tag.replace(pattern, (_match, value: string, unit: string = "") => {
    return `${name}="${Number(value) + delta}${unit}"`;
  });
}

function expandSvgMargin(svg: string, margin: number): string {
  return svg.replace(SVG_OPEN_TAG, (tag) => {
    const viewBox = tag.match(VIEW_BOX_ATTR);
    if (!viewBox) {
      return tag;
    }

    const minX = Number(viewBox[1]) - margin;
    const minY = Number(viewBox[2]) - margin;
    const width = Number(viewBox[3]) + margin * 2;
    const height = Number(viewBox[4]) + margin * 2;
    let next = tag.replace(
      VIEW_BOX_ATTR,
      `viewBox="${minX} ${minY} ${width} ${height}"`,
    );
    next = bumpSvgLength(next, "width", margin * 2);
    next = bumpSvgLength(next, "height", margin * 2);
    return next;
  });
}

export function renderWiremarkToSvg(
  source: string,
  options: WiremarkRenderOptions,
): string {
  const unwrapped = ensureWireframePadding(unwrapWiremarkSource(source));
  if (!unwrapped.trim()) {
    throw new LocalizedAppError("wiremark.emptySource");
  }

  try {
    const { svg } = render(unwrapped, {
      theme: options.dark ? "dark" : "light",
      interactive: true,
    });

    if (!svg.trim()) {
      throw new LocalizedAppError("wiremark.renderFailed", {
        detail: "empty svg",
      });
    }

    return expandSvgMargin(svg, WIREMARK_VIEWBOX_MARGIN_PX);
  } catch (error) {
    if (error instanceof LocalizedAppError) {
      throw error;
    }

    const detail =
      error instanceof WiremarkError || error instanceof Error
        ? error.message
        : "unknown";
    throw new LocalizedAppError("wiremark.renderFailed", { detail });
  }
}
