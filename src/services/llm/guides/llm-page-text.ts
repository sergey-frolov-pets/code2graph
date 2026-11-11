import { resolveLlmPage, type ResolveLlmPageInput } from "@shared/llm-pages";

const LLM_PUBLIC_DIRECTORY = "llm";

const pageModules = import.meta.glob<string>("./pages/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

function readModule(source: unknown): string {
  if (typeof source === "string") {
    return source;
  }
  if (
    source &&
    typeof source === "object" &&
    "default" in source &&
    typeof source.default === "string"
  ) {
    return source.default;
  }
  return "";
}

const bundledByPath = new Map<string, string>();
for (const [path, source] of Object.entries(pageModules)) {
  const relative = path.replace(/^\.\/pages\//, "");
  const text = readModule(source).trim();
  if (relative && text) {
    bundledByPath.set(relative, text);
  }
}

export const LLM_PAGE_PROMPT_HEADING =
  "Diagram syntax page (one file; linked pages are not loaded):";

export function bundledLlmPage(pagePath: string): string {
  return bundledByPath.get(pagePath) ?? "";
}

function pageUrl(pagePath: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const base = import.meta.env.BASE_URL || "./";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return new URL(`${prefix}${LLM_PUBLIC_DIRECTORY}/${pagePath}`, window.location.href)
    .href;
}

function looksLikeHtml(text: string): boolean {
  const start = text.trimStart().slice(0, 32).toLowerCase();
  return start.startsWith("<!doctype") || start.startsWith("<html");
}

/** Same-origin /llm page, then the copy bundled with the editor. */
export async function loadLlmPage(pagePath: string): Promise<string> {
  const bundled = bundledLlmPage(pagePath);
  const url = pageUrl(pagePath);
  if (!url) {
    return bundled;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return bundled;
    }
    const text = (await response.text()).trim();
    if (!text || looksLikeHtml(text)) {
      return bundled;
    }
    return text;
  } catch {
    return bundled;
  }
}

export function resolveBundledLlmPage(input: ResolveLlmPageInput): string {
  return bundledLlmPage(resolveLlmPage(input).path);
}
