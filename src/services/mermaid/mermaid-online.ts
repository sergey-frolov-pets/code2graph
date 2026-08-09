import {
  MERMAID_ONLINE_MAX_URL_LENGTH,
  MERMAID_ONLINE_PROBE_TIMEOUT_MS,
  MERMAID_ONLINE_SERVER_URL,
  MERMAID_ONLINE_SVG_PATH,
} from "@/constants/render-settings";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { prepareMermaidSource } from "@/utils/mermaid-source";
import { encodeMermaidStateForInk } from "@/utils/mermaid-encode";
import { isFileProtocol } from "@/pwa/installPromptState";

const MERMAID_INK_PROBE_ENCODED =
  "pako:eNpNkM9qwzAMh19F6NRB8wI5DNak7aWwwXqLexCxUpvNf3AURkny7rNbynaTPn0_ITRjHzRjjddE0cC5VR7grWtMsqM4Gi9QVa_LkQVc8HxbYLc5BhhNiNH660uxd0WBZj4ViUGM9V9rGTT37LvnBdruRFFCvPzx809YYN_ZD5MX_-cmcU4cuoHqgaqeEjSUsqBECW7RcXJkdT55LiGFYtixwjqXmgeavkWh8mtWp6hJeK-thIS1pIm3SJOEz5vvn_3DaS3lB7gHXH8BFrFcZw";

let inkReachable: boolean | null = null;
let inkProbePromise: Promise<boolean> | null = null;

function buildOnlineSvgUrl(encodedState: string, dark: boolean): string {
  const url = new URL(
    `${MERMAID_ONLINE_SERVER_URL}${MERMAID_ONLINE_SVG_PATH}/${encodedState}`,
  );

  if (dark) {
    url.searchParams.set("theme", "dark");
    url.searchParams.set("bgColor", "1b1b1f");
  }

  return url.toString();
}

function buildInkProbeUrl(): string {
  return `${MERMAID_ONLINE_SERVER_URL}${MERMAID_ONLINE_SVG_PATH}/${MERMAID_INK_PROBE_ENCODED}`;
}

export function resetMermaidInkConnectivity(): void {
  inkReachable = null;
  inkProbePromise = null;
}

export function getMermaidInkReachable(): boolean {
  if (typeof window === "undefined") {
    return true;
  }

  if (isFileProtocol()) {
    return false;
  }

  if (inkReachable !== null) {
    return inkReachable;
  }

  return navigator.onLine;
}

export async function probeMermaidInkConnectivity(): Promise<boolean> {
  if (typeof window === "undefined") {
    return true;
  }

  if (isFileProtocol()) {
    inkReachable = false;
    return false;
  }

  if (!navigator.onLine) {
    inkReachable = false;
    return false;
  }

  if (inkProbePromise) {
    return inkProbePromise;
  }

  inkProbePromise = (async () => {
    try {
      const response = await fetch(buildInkProbeUrl(), {
        method: "GET",
        mode: "cors",
        cache: "no-store",
        signal: AbortSignal.timeout(MERMAID_ONLINE_PROBE_TIMEOUT_MS),
      });
      const body = await response.text();
      inkReachable =
        response.ok && body.trim().startsWith("<");
    } catch {
      inkReachable = false;
    }

    inkProbePromise = null;
    return inkReachable;
  })();

  return inkProbePromise;
}

export async function renderMermaidOnlineToSvg(
  source: string,
  options: { dark?: boolean } = {},
): Promise<string> {
  if (isFileProtocol()) {
    throw new LocalizedAppError("engine.mermaidOnlineFileProtocol");
  }

  const prepared = prepareMermaidSource(source);
  if (!prepared) {
    throw new LocalizedAppError("mermaid.emptySource");
  }

  const encoded = await encodeMermaidStateForInk(prepared, options);
  const url = buildOnlineSvgUrl(encoded, Boolean(options.dark));

  if (url.length > MERMAID_ONLINE_MAX_URL_LENGTH) {
    throw new LocalizedAppError("engine.mermaidOnlineUrlTooLong");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
      signal: AbortSignal.timeout(MERMAID_ONLINE_PROBE_TIMEOUT_MS),
    });
  } catch {
    throw new LocalizedAppError("engine.mermaidOnlineNetworkError");
  }

  if (!response.ok) {
    const detail = (await response.text()).trim().slice(0, 300);
    throw new LocalizedAppError("engine.mermaidOnlineRenderFailed", {
      status: response.status,
      detail: detail || response.statusText,
    });
  }

  const svg = await response.text();
  if (!svg.trim().startsWith("<")) {
    throw new LocalizedAppError("engine.mermaidOnlineRenderInvalid");
  }

  inkReachable = true;
  return svg;
}
