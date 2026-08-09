export const RENDER_MODES = {
  offline: "offline",
  online: "online",
} as const;

export type RenderMode = (typeof RENDER_MODES)[keyof typeof RENDER_MODES];

export const DEFAULT_RENDER_MODE: RenderMode = RENDER_MODES.offline;

export const STORAGE_KEY_RENDER_MODE = "plantuml-smetana-render-mode";

export const PLANTUML_ONLINE_SERVER_URL = "https://www.plantuml.com/plantuml";

export const PLANTUML_ONLINE_ENCODE_PREFIX = "~1";

export const MERMAID_ONLINE_SERVER_URL = "https://mermaid.ink";

export const MERMAID_ONLINE_SVG_PATH = "/svg";

export const MERMAID_ONLINE_MAX_URL_LENGTH = 7500;

export const MERMAID_ONLINE_PROBE_TIMEOUT_MS = 15000;

export const MERMAID_LIVE_EDITOR_URL = "https://mermaid.live/edit";

export function isRenderMode(value: string): value is RenderMode {
  return Object.values(RENDER_MODES).includes(value as RenderMode);
}

export function isOnlineRenderMode(mode: RenderMode): boolean {
  return mode === RENDER_MODES.online;
}
