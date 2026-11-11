import type { DiagramFormat } from "@/constants/diagram-format-ids";
import type { LocaleKey } from "@/locales/types";

export const SNIPPET_LANGUAGE_IDS = [
  "plantuml",
  "mermaid",
  "wiremark",
  "d2",
  "structurizr",
] as const satisfies readonly Exclude<DiagramFormat, "graphml">[];

export type SnippetLanguageId = (typeof SNIPPET_LANGUAGE_IDS)[number];

export function isSnippetLanguageId(value: string): value is SnippetLanguageId {
  return (SNIPPET_LANGUAGE_IDS as readonly string[]).includes(value);
}

export const SNIPPET_CATEGORY_IDS = [
  "basic",
  "flowchart",
  "classes",
  "sequence",
  "state",
  "activity",
  "components",
  "styles",
  "notes",
  "conditional",
  "c4",
  "er",
  "gantt",
  "mindmap",
  "wbs",
  "architecture",
  "charts",
  "wireframe",
] as const;

export type SnippetCategoryId = (typeof SNIPPET_CATEGORY_IDS)[number];

export function isSnippetCategoryId(value: string): value is SnippetCategoryId {
  return (SNIPPET_CATEGORY_IDS as readonly string[]).includes(value);
}

export interface BuiltinSnippet {
  id: string;
  language: SnippetLanguageId;
  categoryId: SnippetCategoryId;
  titleKey: LocaleKey;
  descriptionKey?: LocaleKey;
  content: string;
}

export interface CustomSnippet {
  id: string;
  language: SnippetLanguageId;
  title: string;
  content: string;
  description?: string;
  categoryId: SnippetCategoryId | "custom";
  createdAt: string;
  updatedAt: string;
}

export type SnippetListItem =
  | {
      kind: "builtin";
      id: string;
      language: SnippetLanguageId;
      categoryId: SnippetCategoryId;
      titleKey: LocaleKey;
      descriptionKey?: LocaleKey;
      content: string;
    }
  | {
      kind: "custom";
      snippet: CustomSnippet;
    };
