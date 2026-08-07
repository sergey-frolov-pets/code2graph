import mermaid from "mermaid";
import {
  DEFAULT_RENDER_MODE,
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { renderMermaidOnlineToSvg } from "@/services/mermaid/mermaid-online";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { prepareMermaidSource } from "@/utils/mermaid-source";

let initialized = false;
let renderCounter = 0;

function ensureMermaidInitialized(dark: boolean): void {
  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    securityLevel: "strict",
    gantt: {
      useWidth: 1200,
    },
  });
  initialized = true;
}

export function isMermaidReady(): boolean {
  return initialized;
}

export async function waitForMermaidReady(dark: boolean): Promise<void> {
  ensureMermaidInitialized(dark);
}

async function renderMermaidOfflineToSvg(
  source: string,
  options: { dark?: boolean } = {},
): Promise<string> {
  const prepared = prepareMermaidSource(source);
  if (!prepared) {
    throw new LocalizedAppError("mermaid.emptySource");
  }

  ensureMermaidInitialized(Boolean(options.dark));

  renderCounter += 1;
  const renderId = `mermaid-render-${renderCounter}`;
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "absolute";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "1200px";
  document.body.appendChild(container);

  try {
    const result = await mermaid.render(renderId, prepared, container);
    return result.svg;
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "mermaid.renderFailed";
    throw new LocalizedAppError("mermaid.renderFailed", { detail: message });
  } finally {
    container.remove();
  }
}

export async function renderMermaidToSvg(
  source: string,
  options: { dark?: boolean } = {},
  renderMode: RenderMode = DEFAULT_RENDER_MODE,
): Promise<string> {
  if (isOnlineRenderMode(renderMode)) {
    return renderMermaidOnlineToSvg(source, options);
  }

  return renderMermaidOfflineToSvg(source, options);
}
