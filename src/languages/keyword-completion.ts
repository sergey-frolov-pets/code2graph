import type { FormatHandler } from "@/formats/types";
import type { LanguageKeyword } from "@/languages/types";
import type { CompletionItem, CompletionPrefixInfo, CompletionQuery } from "@/utils/completion-types";
import {
  MAX_COMPLETION_ITEMS,
  MIN_COMPLETION_PREFIX_LENGTH,
} from "@/utils/completion-types";
import type { LocaleKey } from "@/locales/types";

/** A keyword token at the caret, including PlantUML `@`/`!` and hyphenated names. */
const KEYWORD_PREFIX_PATTERN = /[@!]?[A-Za-z_][\w:-]*$/;

const DETAIL_KEY_BY_KIND = {
  keyword: "editor.completion.keyword",
  directive: "editor.completion.directive",
  preprocessor: "editor.completion.preprocessor",
} as const satisfies Record<NonNullable<LanguageKeyword["kind"]>, LocaleKey>;

export interface LanguageKeywordOptions {
  insertSuffix?: string;
  kind?: NonNullable<LanguageKeyword["kind"]>;
  detailKey?: LocaleKey;
}

export function languageKeywords(
  labels: readonly string[],
  options: LanguageKeywordOptions = {},
): LanguageKeyword[] {
  const kind = options.kind ?? "keyword";
  const insertSuffix = options.insertSuffix ?? "";
  const detailKey = options.detailKey ?? DETAIL_KEY_BY_KIND[kind];
  const seen = new Set<string>();
  const keywords: LanguageKeyword[] = [];

  for (const label of labels) {
    const normalized = label.toLowerCase();
    if (seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    keywords.push({
      label,
      insertText: `${label}${insertSuffix}`,
      kind,
      detailKey,
    });
  }

  return keywords;
}

export function extractKeywordPrefix(
  line: string,
  column: number,
): CompletionPrefixInfo {
  const before = line.slice(0, Math.max(column, 0));
  const match = before.match(KEYWORD_PREFIX_PATTERN);
  const prefix = match?.[0] ?? "";

  return {
    prefix,
    replaceStart: column - prefix.length,
    mode: "word",
  };
}

function toCompletionItem(keyword: LanguageKeyword): CompletionItem {
  const kind = keyword.kind ?? "keyword";

  return {
    label: keyword.label,
    insertText: keyword.insertText ?? keyword.label,
    kind,
    detailKey: keyword.detailKey ?? DETAIL_KEY_BY_KIND[kind],
  };
}

/**
 * Shared keyword matcher used by every diagram language.
 * Matching is case-insensitive; inserted text keeps the catalog spelling.
 */
export function completeLanguageKeywords(
  keywords: readonly LanguageKeyword[],
  query: CompletionQuery,
): CompletionItem[] {
  const prefix = query.prefixInfo.prefix;
  if (prefix.length < MIN_COMPLETION_PREFIX_LENGTH) {
    return [];
  }

  const normalizedPrefix = prefix.toLowerCase();
  const matches: CompletionItem[] = [];
  const seen = new Set<string>();

  for (const keyword of keywords) {
    const normalizedLabel = keyword.label.toLowerCase();
    if (!normalizedLabel.startsWith(normalizedPrefix) || seen.has(normalizedLabel)) {
      continue;
    }

    seen.add(normalizedLabel);
    matches.push(toCompletionItem(keyword));
    if (matches.length >= MAX_COMPLETION_ITEMS) {
      break;
    }
  }

  return matches;
}

/**
 * Attaches the shared keyword engine to a format handler.
 * Handler-specific suggestions win. The catalog fills the gap when the
 * handler has nothing to offer for a plain word prefix — that is how
 * languages without a custom completer still show keyword hints.
 */
export function withKeywordCompletions(
  handler: FormatHandler,
  keywords: readonly LanguageKeyword[],
): FormatHandler {
  return {
    ...handler,
    extractCompletionPrefix(line, column) {
      const extracted = handler.extractCompletionPrefix(line, column);
      if (extracted.mode !== "word" || extracted.prefix.length > 0) {
        return extracted;
      }

      return extractKeywordPrefix(line, column);
    },
    getCompletions(query) {
      const custom = handler.getCompletions(query);
      if (custom.length > 0 || query.prefixInfo.mode !== "word") {
        return custom;
      }

      return completeLanguageKeywords(keywords, query);
    },
  };
}
