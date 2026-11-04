import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { D2_PRIMER } from "@/languages/primers/d2";
import { GRAPHML_PRIMER } from "@/languages/primers/graphml";
import { MERMAID_PRIMER } from "@/languages/primers/mermaid";
import { PLANTUML_PRIMER } from "@/languages/primers/plantuml";
import {
  primerExample,
  type LanguagePrimer,
  type LanguagePrimerKeyword,
  type LanguagePrimerType,
  type LocalizedExample,
} from "@/languages/primers/shared";
import { STRUCTURIZR_PRIMER } from "@/languages/primers/structurizr";
import { WIREMARK_PRIMER } from "@/languages/primers/wiremark";

export {
  primerExample,
  type LanguagePrimer,
  type LanguagePrimerKeyword,
  type LanguagePrimerType,
  type LocalizedExample,
};

export const LANGUAGE_PRIMERS: Record<DiagramFormat, LanguagePrimer> = {
  plantuml: PLANTUML_PRIMER,
  mermaid: MERMAID_PRIMER,
  graphml: GRAPHML_PRIMER,
  wiremark: WIREMARK_PRIMER,
  d2: D2_PRIMER,
  structurizr: STRUCTURIZR_PRIMER,
};
