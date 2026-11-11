import catalogJson from "./llm-page-catalog.json" with { type: "json" };
import {
  isAgentDiagramLanguage,
  matchAgentDiagramLanguage,
  type AgentDiagramLanguage,
} from "./agent-diagram.js";

/** Keywords this short match only as a whole word, so "er" does not hit "error". */
const SHORT_KEYWORD_MAX_LENGTH = 3;

const PAGE_NAME_PATTERN = /^[a-z0-9_-]+$/i;

export const LLM_PAGE_KINDS = [
  "root",
  "language",
  "shared",
  "card",
  "subpage",
] as const;

export type LlmPageKind = (typeof LLM_PAGE_KINDS)[number];

export interface LlmPageRecord {
  id: string;
  path: string;
  parent: string | null;
  language: AgentDiagramLanguage | null;
  diagramType: string | null;
  kind: LlmPageKind;
  keywords: readonly string[];
  sourceHints: readonly string[];
}

export const LLM_PAGES: readonly LlmPageRecord[] =
  catalogJson as readonly LlmPageRecord[];

const PAGE_BY_ID = new Map(LLM_PAGES.map((page) => [page.id, page]));
const PAGE_BY_PATH = new Map(LLM_PAGES.map((page) => [page.path, page]));

export interface ResolveLlmPageInput {
  language?: string | null;
  request?: string;
  source?: string;
}

function asLanguage(value: string | null | undefined): AgentDiagramLanguage | null {
  return value && isAgentDiagramLanguage(value) ? value : null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function keywordHits(request: string, keyword: string): boolean {
  const needle = keyword.trim();
  if (!needle || !request.trim()) {
    return false;
  }

  if (needle.length <= SHORT_KEYWORD_MAX_LENGTH) {
    const pattern = new RegExp(
      `(^|[^\\p{L}\\p{N}_])${escapeRegExp(needle)}([^\\p{L}\\p{N}_]|$)`,
      "iu",
    );
    return pattern.test(request);
  }

  return request.toLowerCase().includes(needle.toLowerCase());
}

function bestByKeyword(
  candidates: readonly LlmPageRecord[],
  request: string,
): LlmPageRecord | null {
  let best: { page: LlmPageRecord; length: number } | null = null;
  for (const page of candidates) {
    for (const keyword of page.keywords) {
      if (!keywordHits(request, keyword)) {
        continue;
      }
      if (!best || keyword.length > best.length) {
        best = { page, length: keyword.length };
      }
    }
  }
  return best?.page ?? null;
}

function pageFromSource(
  source: string,
  language: AgentDiagramLanguage | null,
): LlmPageRecord | null {
  if (!source.trim()) {
    return null;
  }

  const cards = LLM_PAGES.filter(
    (page) =>
      page.kind === "card" &&
      (language === null || page.language === language),
  );
  let best: { page: LlmPageRecord; length: number } | null = null;
  for (const page of cards) {
    for (const hint of page.sourceHints) {
      let matched = false;
      try {
        // Hints may start with (?m); JavaScript only accepts that flag on the RegExp.
        const body = hint.replace(/^\(\?m\)/, "");
        matched = new RegExp(body, "im").test(source);
      } catch {
        matched = false;
      }
      if (!matched) {
        continue;
      }
      if (!best || hint.length > best.length) {
        best = { page, length: hint.length };
      }
    }
  }
  return best?.page ?? null;
}

function matchingShared(
  pool: readonly LlmPageRecord[],
  request: string,
  preferExt: boolean,
): LlmPageRecord | null {
  const hits = pool.filter(
    (page) =>
      page.kind === "shared" &&
      page.keywords.some((keyword) => keywordHits(request, keyword)),
  );
  if (hits.length === 0) {
    return null;
  }
  if (preferExt) {
    return hits.find((page) => page.path.includes("/ext/")) ?? hits[0];
  }
  return hits.find((page) => !page.path.includes("/ext/")) ?? null;
}

function languageIndex(language: AgentDiagramLanguage): LlmPageRecord {
  const page = PAGE_BY_ID.get(`${language}/index`);
  if (!page) {
    throw new Error(`Missing language index for ${language}`);
  }
  return page;
}

function rootIndex(): LlmPageRecord {
  const page = PAGE_BY_ID.get("index");
  if (!page) {
    throw new Error("Missing root LLM page index");
  }
  return page;
}

/**
 * Pick exactly one catalog page.
 * A known language drops every other language. A diagram already open in the
 * editor keeps subpage keywords inside that type.
 */
function pagesForLanguage(
  language: AgentDiagramLanguage | null,
): readonly LlmPageRecord[] {
  if (!language) {
    return LLM_PAGES.filter((page) => page.language !== null);
  }
  return LLM_PAGES.filter((page) => page.language === language);
}

function ambiguousCardHit(
  cards: readonly LlmPageRecord[],
  request: string,
): boolean {
  const languages = new Set(
    cards
      .filter((page) =>
        page.keywords.some((keyword) => keywordHits(request, keyword)),
      )
      .map((page) => page.language),
  );
  return languages.size > 1;
}

export function resolveLlmPage(input: ResolveLlmPageInput): LlmPageRecord {
  const request = input.request ?? "";
  const namedLanguage =
    asLanguage(input.language) ?? matchAgentDiagramLanguage(request);
  const sourceCard = pageFromSource(input.source ?? "", namedLanguage);
  const language = namedLanguage ?? sourceCard?.language ?? null;
  const pool = pagesForLanguage(language);

  if (sourceCard) {
    const subpage = bestByKeyword(
      pool.filter(
        (page) =>
          page.kind === "subpage" &&
          page.diagramType === sourceCard.diagramType,
      ),
      request,
    );
    if (subpage) {
      return subpage;
    }

    const otherType = bestByKeyword(
      pool.filter(
        (page) =>
          page.kind === "card" && page.diagramType !== sourceCard.diagramType,
      ),
      request,
    );
    if (otherType) {
      return otherType;
    }

    const shared = matchingShared(
      pool,
      request,
      sourceCard.path.includes("/ext/"),
    );
    if (shared) {
      return shared;
    }
    return sourceCard;
  }

  const cards = pool.filter((page) => page.kind === "card");
  if (language === null && ambiguousCardHit(cards, request)) {
    return rootIndex();
  }

  const requested = bestByKeyword(cards, request);
  if (requested) {
    const subpage = bestByKeyword(
      pool.filter(
        (page) =>
          page.kind === "subpage" &&
          page.diagramType === requested.diagramType,
      ),
      request,
    );
    if (subpage) {
      return subpage;
    }
    return requested;
  }

  if (language) {
    return languageIndex(language);
  }
  return rootIndex();
}

/** Resolve a markdown link to a catalog path. `..` cannot leave the tree. */
export function resolveLlmPagePath(path: string, from?: string): string | null {
  const raw = path.trim();
  if (!raw) {
    return null;
  }

  const base = from?.trim();
  let combined = raw.replace(/\\/g, "/");
  if (base && (combined.startsWith("./") || combined.startsWith("../"))) {
    const baseDir = base.replace(/\\/g, "/").split("/").slice(0, -1).join("/");
    combined = `${baseDir}/${combined}`;
  }

  const parts: string[] = [];
  for (const part of combined.split("/")) {
    if (!part || part === ".") {
      continue;
    }
    if (part === "..") {
      if (parts.length === 0) {
        return null;
      }
      parts.pop();
      continue;
    }
    const stem = part.replace(/\.md$/i, "");
    if (!PAGE_NAME_PATTERN.test(stem)) {
      return null;
    }
    parts.push(part);
  }

  let normalized = parts.join("/");
  if (!normalized) {
    return null;
  }
  if (!normalized.toLowerCase().endsWith(".md")) {
    normalized = `${normalized}.md`;
  }
  return PAGE_BY_PATH.has(normalized) ? normalized : null;
}

export function llmPageByPath(path: string): LlmPageRecord | null {
  return PAGE_BY_PATH.get(path) ?? null;
}
