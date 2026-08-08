import type { SectionDto } from "../types.js";

export function buildSectionTree(flatSections: SectionDto[]): SectionDto[] {
  const byId = new Map(
    flatSections.map((section) => [
      section.id,
      { ...section, children: [] as SectionDto[] },
    ]),
  );
  const roots: SectionDto[] = [];

  for (const section of byId.values()) {
    if (section.parentId && byId.has(section.parentId)) {
      byId.get(section.parentId)!.children!.push(section);
    } else {
      roots.push(section);
    }
  }

  const sortRecursive = (items: SectionDto[]): void => {
    items.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
    );
    for (const item of items) {
      if (item.children?.length) {
        sortRecursive(item.children);
      }
    }
  };

  sortRecursive(roots);
  return roots;
}

export function collectSectionSubtree(
  rootId: string,
  sections: Array<{ id: string; parentId: string | null }>,
): Set<string> {
  const ids = new Set<string>([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const section of sections) {
      if (section.parentId && ids.has(section.parentId) && !ids.has(section.id)) {
        ids.add(section.id);
        changed = true;
      }
    }
  }

  return ids;
}
