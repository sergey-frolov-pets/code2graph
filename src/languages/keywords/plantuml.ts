import { languageKeywords } from "@/languages/keyword-completion";
import type { LanguageKeyword } from "@/languages/types";
import {
  PLANTUML_KEYWORDS,
  PLANTUML_MULTI_WORD_KEYWORDS,
} from "@/utils/plantuml-highlight";

export const plantumlLanguageKeywords: readonly LanguageKeyword[] = languageKeywords([
  ...PLANTUML_KEYWORDS,
  ...PLANTUML_MULTI_WORD_KEYWORDS,
]);
