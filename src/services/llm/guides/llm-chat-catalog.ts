import { AI_CHAT_READ_PAGES_MAX } from "@/constants/ai-chat";
import { LLM_PAGES, llmPageByPath, resolveLlmPagePath } from "@shared/llm-pages";
import { loadLlmPage, bundledLlmPage } from "@/services/llm/guides/llm-page-text";

export const LLM_SYNTAX_REPLY_LINE =
  "Reply with diagram source for the editor only. Do not return an image or an external renderer URL.";

export const LLM_CHAT_CATALOG_HEADING =
  "Diagram syntax catalog (request pages before writing source):";

export const LLM_CHAT_PAGES_HEADING = "Diagram syntax pages:";

const READ_PAGES_RULE =
  'Before writing or changing diagram source, return {"kind":"read_pages","paths":["..."]} with every catalog path you need, at most 4, and no proposal. For a question or a clarification that does not need syntax, return the normal envelope now.';

const PAGES_LOADED_RULE =
  "Page bodies are loaded. Return the normal JSON envelope. Do not return read_pages.";

function isSyntaxNavLine(line: string): boolean {
  if (!line.includes("](")) {
    return false;
  }
  const stripped = line.replace(/\[[^\]]+\]\([^)]+\)/g, "").replace(/[·\s]/g, "");
  return stripped.length === 0;
}

function pageSummary(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  let heading = "";
  let seenHeading = false;
  let inFence = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) {
      continue;
    }
    if (trimmed.startsWith("# ")) {
      heading = trimmed.slice(2).trim();
      seenHeading = true;
      continue;
    }
    if (!seenHeading || !trimmed || isSyntaxNavLine(trimmed) || trimmed === LLM_SYNTAX_REPLY_LINE) {
      continue;
    }
    return trimmed;
  }
  return heading;
}

export function stripSyntaxPageChrome(markdown: string): string {
  const kept = markdown.split(/\r?\n/).filter((line) => {
    const trimmed = line.trim();
    return trimmed !== LLM_SYNTAX_REPLY_LINE && !isSyntaxNavLine(trimmed);
  });
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function sharedPaths(language: string): string[] {
  const paths = [`${language}/shared.md`];
  if (language === "mermaid") {
    paths.push("mermaid/ext/shared.md");
  }
  return paths;
}

function sharedRules(language: string): string {
  return sharedPaths(language)
    .map((path) => stripSyntaxPageChrome(bundledLlmPage(path)))
    .filter((text) => text.length > 0)
    .join("\n\n");
}

export function chatSyntaxLanguage(
  format: string,
  target?: { active: boolean; format: string },
): string {
  return target?.active ? target.format : format;
}

/** Оглавление текущего языка: путь и одна фраза, без примеров. */
export function buildLlmChatCatalog(language: string): string {
  const lines = LLM_PAGES.filter(
    (page) => page.language === language && (page.kind === "card" || page.kind === "subpage"),
  ).map((page) => {
    const summary = pageSummary(bundledLlmPage(page.path));
    return summary ? `- ${page.path} — ${summary}` : `- ${page.path}`;
  });
  const rules = sharedRules(language);
  const parts = [LLM_CHAT_CATALOG_HEADING, "", LLM_SYNTAX_REPLY_LINE, ""];
  if (rules) {
    parts.push(rules, "");
  }
  parts.push("Pages:", ...lines, "", READ_PAGES_RULE);
  return parts.join("\n");
}

/** Пути из ответа модели, которые есть в каталоге этого языка и не являются оглавлением. */
export function acceptChatSyntaxPaths(paths: readonly string[], language: string): string[] {
  const accepted: string[] = [];
  for (const path of paths) {
    const resolved = resolveLlmPagePath(path);
    if (!resolved?.startsWith(`${language}/`)) {
      continue;
    }
    const page = llmPageByPath(resolved);
    if (!page || (page.kind !== "card" && page.kind !== "subpage")) {
      continue;
    }
    if (!accepted.includes(resolved)) {
      accepted.push(resolved);
    }
    if (accepted.length >= AI_CHAT_READ_PAGES_MAX) {
      break;
    }
  }
  return accepted;
}

export function composeLoadedSyntaxPages(
  pages: readonly { path: string; body: string }[],
): string {
  const blocks = pages
    .map((page) => {
      const body = stripSyntaxPageChrome(page.body);
      return body ? `Page: ${page.path}\n\n${body}` : "";
    })
    .filter((block) => block.length > 0);
  if (blocks.length === 0) {
    return "";
  }
  return [LLM_CHAT_PAGES_HEADING, "", LLM_SYNTAX_REPLY_LINE, "", PAGES_LOADED_RULE, "", ...blocks].join(
    "\n",
  );
}

function sharedPathsForRequest(language: string, pages: readonly string[]): string[] {
  const paths = [`${language}/shared.md`];
  if (pages.some((path) => path.startsWith("mermaid/ext/"))) {
    paths.push("mermaid/ext/shared.md");
  }
  return paths.filter((path) => llmPageByPath(path));
}

/** Shared-правила плюс запрошенные страницы. Shared в лимит путей не входит. */
export async function loadChatSyntaxBodies(
  language: string,
  requested: readonly string[],
): Promise<string> {
  const accepted = acceptChatSyntaxPaths(requested, language);
  if (accepted.length === 0) {
    return "";
  }
  const paths = [...sharedPathsForRequest(language, accepted), ...accepted];
  const pages: { path: string; body: string }[] = [];
  for (const path of paths) {
    const body = await loadLlmPage(path);
    if (body.trim()) {
      pages.push({ path, body });
    }
  }
  return composeLoadedSyntaxPages(pages);
}
