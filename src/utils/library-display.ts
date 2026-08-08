import type { DiagramLanguage } from "@/constants/diagram-library";
import type { DiagramVisibility, SectionAccessPermission } from "@/constants/diagram-library";

const DIAGRAM_FORMAT_LABELS: Record<DiagramLanguage, string> = {
  plantuml: "puml",
  mermaid: "mermaid",
  graphviz: "graphviz",
  graphml: "graphml",
  ditaa: "ditaa",
  other: "other",
};

export function getDiagramFormatLabel(language: DiagramLanguage | string): string {
  if (language in DIAGRAM_FORMAT_LABELS) {
    return DIAGRAM_FORMAT_LABELS[language as DiagramLanguage];
  }
  return language;
}

export function getSectionAccessIcon(section: {
  visibility?: DiagramVisibility;
  userAccessPermission?: SectionAccessPermission | null;
  canAdmin?: boolean;
  ownerId?: string | null;
}): string {
  if (section.userAccessPermission) {
    switch (section.userAccessPermission) {
      case "view":
        return "👁";
      case "download":
        return "⬇";
      case "contribute":
        return "✎";
      default:
        return "🔑";
    }
  }

  switch (section.visibility) {
    case "personal":
      return "👤";
    case "subscription":
      return "🔒";
    case "all":
    default:
      return "🌐";
  }
}
