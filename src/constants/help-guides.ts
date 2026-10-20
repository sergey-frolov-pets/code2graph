import { APP_LINKS } from "@/constants";

export const FORMAT_GUIDE_LINKS = [
  {
    id: "plantuml",
    href: APP_LINKS.plantumlGuide,
    labelKey: "settings.plantumlGuide",
  },
  {
    id: "mermaid",
    href: APP_LINKS.mermaidGuide,
    labelKey: "settings.mermaidGuide",
  },
  {
    id: "graphml",
    href: APP_LINKS.graphmlGuide,
    labelKey: "settings.graphmlGuide",
  },
  {
    id: "wiremark",
    href: APP_LINKS.wiremarkGuide,
    labelKey: "settings.wiremarkGuide",
  },
] as const;
