import {
  DEFAULT_RENDER_MODE,
  isOnlineRenderMode,
  type RenderMode,
} from "@/constants/render-settings";
import { loadMermaid } from "@/services/mermaid/mermaid-loader";
import { renderMermaidOnlineToSvg } from "@/services/mermaid/mermaid-online";
import { LocalizedAppError } from "@/utils/localized-app-error";
import { prepareMermaidSource } from "@/utils/mermaid-source";

let initialized = false;
let renderCounter = 0;
let lastRenderUsedOnlineInk = false;

export function didLastMermaidRenderUseOnlineInk(): boolean {
  return lastRenderUsedOnlineInk;
}

const MERMAID_RENDER_CONTAINER_WIDTH_PX = 1200;
const MERMAID_RENDER_CONTAINER_HEIGHT_PX = 800;

function createMermaidRenderContainer(): HTMLDivElement {
  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = `${MERMAID_RENDER_CONTAINER_WIDTH_PX}px`;
  container.style.height = `${MERMAID_RENDER_CONTAINER_HEIGHT_PX}px`;
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  container.style.zIndex = "-1";
  document.body.appendChild(container);
  return container;
}

async function ensureMermaidInitialized(dark: boolean): Promise<void> {
  const mermaid = await loadMermaid();
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
  await ensureMermaidInitialized(dark);
}

async function renderMermaidOfflineToSvg(
  source: string,
  options: { dark?: boolean } = {},
): Promise<string> {
  const prepared = prepareMermaidSource(source);
  if (!prepared) {
    throw new LocalizedAppError("mermaid.emptySource");
  }

  const mermaid = await loadMermaid();
  await ensureMermaidInitialized(Boolean(options.dark));

  renderCounter += 1;
  const renderId = `mermaid-render-${renderCounter}`;
  const container = createMermaidRenderContainer();

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
    try {
      const svg = await renderMermaidOnlineToSvg(source, options);
      lastRenderUsedOnlineInk = true;
      return svg;
    } catch (onlineError) {
      try {
        const svg = await renderMermaidOfflineToSvg(source, options);
        lastRenderUsedOnlineInk = false;
        return svg;
      } catch {
        throw onlineError;
      }
    }
  }

  lastRenderUsedOnlineInk = false;
  return renderMermaidOfflineToSvg(source, options);
}
