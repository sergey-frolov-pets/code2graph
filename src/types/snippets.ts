import type { LocaleKey } from "@/locales/types";

export const SNIPPET_CATEGORY_IDS = [
  "basic",
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
  "wbs",
] as const;

export type SnippetCategoryId = (typeof SNIPPET_CATEGORY_IDS)[number];

export interface BuiltinSnippet {
  id: string;
  categoryId: SnippetCategoryId;
  titleKey: LocaleKey;
  descriptionKey?: LocaleKey;
  content: string;
}

export interface CustomSnippet {
  id: string;
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
      categoryId: SnippetCategoryId;
      titleKey: LocaleKey;
      descriptionKey?: LocaleKey;
      content: string;
    }
  | {
      kind: "custom";
      snippet: CustomSnippet;
    };
