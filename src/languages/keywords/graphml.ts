import { languageKeywords } from "@/languages/keyword-completion";
import type { LanguageKeyword } from "@/languages/types";

export const GRAPHML_ROOT_TAGS = ["graphml", "graph"] as const;

export const GRAPHML_ELEMENT_TAGS = [
  "node",
  "edge",
  "key",
  "data",
  "desc",
  "loc",
  "port",
  "hyperedge",
  "endpoint",
] as const;

export const graphmlLanguageKeywords: readonly LanguageKeyword[] = [
  ...languageKeywords(GRAPHML_ROOT_TAGS, { kind: "directive" }),
  ...languageKeywords(GRAPHML_ELEMENT_TAGS),
];
