import { languageKeywords } from "@/languages/keyword-completion";
import type { LanguageKeyword } from "@/languages/types";

const PROPERTY_INSERT_SUFFIX = ": ";

const D2_PROPERTY_KEYWORDS = [
  "direction",
  "shape",
  "style",
  "class",
  "classes",
  "constraint",
  "label",
  "icon",
  "tooltip",
  "link",
  "near",
  "width",
  "height",
  "grid-rows",
  "grid-columns",
  "grid-gap",
  "animated",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dash",
  "opacity",
  "bold",
  "italic",
  "underline",
  "font",
  "font-size",
  "font-color",
  "border-radius",
  "shadow",
  "multiple",
  "double-border",
  "fill-pattern",
  "text-transform",
] as const;

const D2_VALUE_KEYWORDS = [
  "right",
  "left",
  "up",
  "down",
  "rectangle",
  "square",
  "page",
  "parallelogram",
  "document",
  "cylinder",
  "queue",
  "package",
  "step",
  "callout",
  "stored_data",
  "person",
  "diamond",
  "oval",
  "circle",
  "hexagon",
  "cloud",
  "text",
  "sql_table",
  "sequence_diagram",
  "primary_key",
  "foreign_key",
  "unique",
] as const;

export const D2_KEYWORD_SET = new Set<string>([
  ...D2_PROPERTY_KEYWORDS,
  ...D2_VALUE_KEYWORDS,
]);

export const d2LanguageKeywords: readonly LanguageKeyword[] = [
  ...languageKeywords(D2_PROPERTY_KEYWORDS, {
    insertSuffix: PROPERTY_INSERT_SUFFIX,
  }),
  ...languageKeywords(D2_VALUE_KEYWORDS),
];
