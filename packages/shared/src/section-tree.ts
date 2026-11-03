export interface SectionNodeBase {
  id: string;
  parentId: string | null;
  title: string;
  sortOrder: number;
}

export type SectionTreeNode<T extends SectionNodeBase> = T & {
  children?: SectionTreeNode<T>[];
};

export interface FlatSectionOption {
  id: string;
  title: string;
  depth: number;
}

export function collectSectionSubtree(
  rootId: string,
  sections: Array<Pick<SectionNodeBase, "id" | "parentId">>,
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

export function buildSectionTree<T extends SectionNodeBase>(
  flatSections: T[],
): SectionTreeNode<T>[] {
  const byId = new Map(
    flatSections.map((section) => [
      section.id,
      { ...section, children: [] as SectionTreeNode<T>[] },
    ]),
  );
  const roots: SectionTreeNode<T>[] = [];

  for (const section of byId.values()) {
    if (section.parentId && byId.has(section.parentId)) {
      byId.get(section.parentId)!.children!.push(section);
    } else {
      roots.push(section);
    }
  }

  const sortRecursive = (items: SectionTreeNode<T>[]): void => {
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

export function flattenSections<T extends SectionNodeBase>(
  sections: SectionTreeNode<T>[],
  depth = 0,
): FlatSectionOption[] {
  const result: FlatSectionOption[] = [];

  for (const section of sections) {
    result.push({ id: section.id, title: section.title, depth });
    if (section.children?.length) {
      result.push(...flattenSections(section.children, depth + 1));
    }
  }

  return result;
}
