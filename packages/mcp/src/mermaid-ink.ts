import { deflateSync } from "node:zlib";
import { MERMAID_DEFLATE_LEVEL } from "./render-limits.js";

const BASE64_PLUS = /\+/g;
const BASE64_SLASH = /\//g;
const BASE64_PADDING = /=+$/g;

/**
 * mermaid.ink state encoding used by the editor: zlib-wrapped JSON, then
 * URL-safe base64 with a `pako:` prefix.
 */
export function encodeMermaidInkPath(source: string): string {
  const state = {
    code: source,
    mermaid: JSON.stringify({ theme: "default" }),
    updateDiagram: true,
    rough: false,
  };
  const compressed = deflateSync(Buffer.from(JSON.stringify(state), "utf8"), {
    level: MERMAID_DEFLATE_LEVEL,
  });
  const encoded = compressed
    .toString("base64")
    .replace(BASE64_PLUS, "-")
    .replace(BASE64_SLASH, "_")
    // Padding "=" makes mermaid.ink hold the connection open instead of rendering.
    .replace(BASE64_PADDING, "");
  return `pako:${encoded}`;
}
