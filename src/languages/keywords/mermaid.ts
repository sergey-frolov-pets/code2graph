import { languageKeywords } from "@/languages/keyword-completion";
import type { LanguageKeyword } from "@/languages/types";
import {
  MERMAID_DIAGRAM_KEYWORDS,
  MERMAID_DIRECTIONS,
  MERMAID_KEYWORDS,
} from "@/utils/mermaid-highlight";

export const mermaidLanguageKeywords: readonly LanguageKeyword[] = [
  ...languageKeywords([...MERMAID_DIAGRAM_KEYWORDS], { kind: "directive" }),
  ...languageKeywords([...MERMAID_KEYWORDS, ...MERMAID_DIRECTIONS]),
];
