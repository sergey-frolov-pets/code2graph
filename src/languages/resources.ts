import { APP_LINKS } from "@/constants";
import type { DiagramFormat } from "@/constants/diagram-format-ids";

export type LanguageResourceKind = "site" | "library";

export interface LanguageResourceLink {
  kind: LanguageResourceKind;
  href: string;
  label: string;
}

export const LANGUAGE_RESOURCES: Record<DiagramFormat, readonly LanguageResourceLink[]> = {
  plantuml: [
    { kind: "site", href: APP_LINKS.plantuml, label: "PlantUML" },
    { kind: "site", href: APP_LINKS.plantumlGuide, label: "PlantUML Guide" },
    { kind: "library", href: APP_LINKS.plantumlCore, label: "@plantuml/core" },
    { kind: "library", href: APP_LINKS.smetana, label: "Smetana" },
    { kind: "library", href: APP_LINKS.c4PlantUml, label: "C4-PlantUML" },
    { kind: "library", href: APP_LINKS.archimatePlantUml, label: "Archimate-PlantUML" },
  ],
  mermaid: [
    { kind: "site", href: APP_LINKS.mermaid, label: "Mermaid" },
    { kind: "site", href: APP_LINKS.mermaidGuide, label: "Mermaid docs" },
    { kind: "site", href: APP_LINKS.mermaidInk, label: "mermaid.ink" },
    { kind: "library", href: APP_LINKS.mermaidPackage, label: "mermaid" },
  ],
  graphml: [
    { kind: "site", href: APP_LINKS.graphml, label: "GraphML" },
    { kind: "site", href: APP_LINKS.graphmlGuide, label: "GraphML Primer" },
    { kind: "site", href: APP_LINKS.yEd, label: "yEd" },
    { kind: "library", href: APP_LINKS.dagre, label: "dagre" },
  ],
  wiremark: [
    { kind: "site", href: APP_LINKS.wiremark, label: "WireMark" },
    { kind: "site", href: APP_LINKS.wiremarkGuide, label: "WireMark docs" },
    { kind: "library", href: APP_LINKS.wiremarkCore, label: "@wiremark/core" },
  ],
  d2: [
    { kind: "site", href: APP_LINKS.d2, label: "D2" },
    { kind: "site", href: APP_LINKS.d2Guide, label: "D2 tour" },
    { kind: "library", href: APP_LINKS.d2Package, label: "@d2lang/d2" },
  ],
  structurizr: [
    { kind: "site", href: APP_LINKS.structurizr, label: "Structurizr" },
    { kind: "site", href: APP_LINKS.structurizrGuide, label: "Structurizr DSL" },
    { kind: "library", href: APP_LINKS.plantumlCore, label: "@plantuml/core" },
    { kind: "library", href: APP_LINKS.c4PlantUml, label: "C4-PlantUML" },
  ],
};
