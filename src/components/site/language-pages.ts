import { trackEvent } from "@/analytics";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { DIAGRAM_LANGUAGE_MODULES } from "@/languages/registry";
import type {
  DiagramLanguageModule,
  DiagramLanguageSiteCopy,
} from "@/languages/types";
import { languagePageHash } from "@/router";

export type PublicLanguagePage = DiagramLanguageModule & {
  site: DiagramLanguageSiteCopy;
};

function hasPublicSite(
  module: DiagramLanguageModule,
): module is PublicLanguagePage {
  return module.site != null;
}

/** Diagram languages that have a public page at `#/lang/<id>`. */
export const PUBLIC_LANGUAGE_PAGES: readonly PublicLanguagePage[] =
  DIAGRAM_LANGUAGE_MODULES.filter(hasPublicSite);

export { languagePageHash };

export function trackLanguagePage(languageId: DiagramFormat): void {
  trackEvent(`cta-language-${languageId}`, `Open ${languageId} page`);
}
