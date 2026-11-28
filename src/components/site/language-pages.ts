import { reportSiteClick } from "@/analytics";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import type { LocaleKey } from "@/locales/types";
import { languagePageHash } from "@/router";

export interface PublicLanguagePageLink {
  id: DiagramFormat;
  labelKey: LocaleKey;
  site: { purposeKey: LocaleKey };
}

/**
 * Ссылки лендинга на языковые страницы. Без реестра движков:
 * тот тянет D2, Mermaid и PlantUML в первый экран.
 */
export const PUBLIC_LANGUAGE_PAGES: readonly PublicLanguagePageLink[] = [
  {
    id: "plantuml",
    labelKey: "editor.format.plantuml",
    site: { purposeKey: "site.formats.plantuml.purpose" },
  },
  {
    id: "mermaid",
    labelKey: "editor.format.mermaid",
    site: { purposeKey: "site.formats.mermaid.purpose" },
  },
  {
    id: "graphml",
    labelKey: "editor.format.graphml",
    site: { purposeKey: "site.formats.graphml.purpose" },
  },
  {
    id: "wiremark",
    labelKey: "editor.format.wiremark",
    site: { purposeKey: "site.formats.wiremark.purpose" },
  },
  {
    id: "d2",
    labelKey: "editor.format.d2",
    site: { purposeKey: "site.formats.d2.purpose" },
  },
  {
    id: "structurizr",
    labelKey: "editor.format.structurizr",
    site: { purposeKey: "site.formats.structurizr.purpose" },
  },
];

export { languagePageHash };

export function trackLanguagePage(languageId: DiagramFormat): void {
  reportSiteClick(languageId);
}
