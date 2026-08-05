import { describe, expect, it } from "vitest";
import type { SectionDto } from "@/constants/diagram-library";
import {
  buildSectionTree,
  collectSectionSubtree,
  flattenSections,
} from "@/shared/library/section-tree";

const flatSections: SectionDto[] = [
  {
    id: "root",
    parentId: null,
    title: "Root",
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "child",
    parentId: "root",
    title: "Child",
    sortOrder: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("section-tree", () => {
  it("builds nested tree from flat sections", () => {
    const tree = buildSectionTree(flatSections);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children?.[0]?.id).toBe("child");
  });

  it("collects subtree ids", () => {
    const ids = collectSectionSubtree("root", flatSections);
    expect(ids.has("root")).toBe(true);
    expect(ids.has("child")).toBe(true);
  });

  it("flattens tree with depth", () => {
    const tree = buildSectionTree(flatSections);
    const flat = flattenSections(tree);
    expect(flat).toEqual([
      { id: "root", title: "Root", depth: 0 },
      { id: "child", title: "Child", depth: 1 },
    ]);
  });
});
