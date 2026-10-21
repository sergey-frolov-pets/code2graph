/** How long an online render request may take before it is aborted. */
export const RENDER_TIMEOUT_MS = 20_000;

/** Reject rendered payloads larger than this so a tool result stays usable. */
export const MAX_RENDER_BYTES = 4_000_000;

/** mermaid.ink rejects very long GET urls. Matches the editor limit. */
export const MERMAID_INK_MAX_URL_LENGTH = 7_500;

export const MERMAID_DEFLATE_LEVEL = 9;

/** Rasterized SVG previews are scaled to this width. */
export const PREVIEW_WIDTH_PX = 1_200;

export const PREVIEW_BACKGROUND = "#ffffff";

export const PNG_MIME_TYPE = "image/png";

export const JPEG_MIME_TYPE = "image/jpeg";

export const DEFAULT_KROKI_URL = "https://kroki.io";

export const DEFAULT_MERMAID_INK_URL = "https://mermaid.ink";

export const KROKI_URL_ENV = "CODE2GRAPH_KROKI_URL";

export const MERMAID_INK_URL_ENV = "CODE2GRAPH_MERMAID_INK_URL";

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47] as const;

export const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;

/** Truncate upstream error bodies before they reach the tool result. */
export const ERROR_BODY_LIMIT = 200;
