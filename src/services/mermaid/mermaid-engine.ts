import mermaid from "mermaid";
import { LocalizedAppError } from "@/utils/localized-app-error";

let initialized = false;
let renderCounter = 0;

function ensureMermaidInitialized(dark: boolean): void {
  if (initialized) {
    mermaid.initialize({
      startOnLoad: false,
      theme: dark ? "dark" : "default",
      securityLevel: "strict",
    });
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    securityLevel: "strict",
  });
  initialized = true;
}

export function prepareMermaidSource(source: string): string {
  const trimmed = source.trim();
  const fencedMatch = trimmed.match(/^```(?:mermaid)?\s*\n([\s\S]*?)```$/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  return trimmed;
}

export function isMermaidReady(): boolean {
  return initialized;
}

export async function waitForMermaidReady(dark: boolean): Promise<void> {
  ensureMermaidInitialized(dark);
}

export async function renderMermaidToSvg(
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

  try {
    const result = await mermaid.render(renderId, prepared);
    return result.svg;
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : "mermaid.renderFailed";
    throw new LocalizedAppError("mermaid.renderFailed", { detail: message });
  }
}
