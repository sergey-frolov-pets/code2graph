import type { FlatSectionOption } from "@/shared/library/section-tree";
import { diagramAllowsWrite } from "@/utils/library-display";

const SECTION_DEPTH_MARK = "—";

export interface MoveDiagramRequest {
  id: string;
  title: string;
  sectionId: string | null;
}

export function writableMoveSectionOptions(
  options: readonly FlatSectionOption[],
  sections: readonly { id: string; canWrite?: boolean }[],
): FlatSectionOption[] {
  const writableIds = new Set(
    sections
      .filter((section) => section.canWrite !== false)
      .map((section) => section.id),
  );
  return options.filter((option) => writableIds.has(option.id));
}

export function diagramCanMoveToAnotherSection(
  diagram: { canWrite?: boolean; sectionId: string | null },
  moveSectionOptions: readonly { id: string }[],
): boolean {
  if (!diagramAllowsWrite(diagram)) {
    return false;
  }

  const hasOtherSection = moveSectionOptions.some(
    (section) => section.id !== diagram.sectionId,
  );
  return hasOtherSection || Boolean(diagram.sectionId);
}

export function formatSectionOptionLabel(section: FlatSectionOption): string {
  const indent = SECTION_DEPTH_MARK.repeat(section.depth);
  const gap = section.depth > 0 ? " " : "";
  return `${indent}${gap}${section.title}`;
}
