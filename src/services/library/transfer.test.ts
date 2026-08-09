import { describe, expect, it } from "vitest";
import { sortSectionsForPush } from "@/services/library/transfer";
import type { SectionDto } from "@/constants/diagram-library";

function section(id: string, parentId: string | null = null): SectionDto {
  return {
    id,
    title: id,
    parentId,
    sortOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("sortSectionsForPush", () => {
  it("orders parents before children", () => {
    const sorted = sortSectionsForPush([
      section("child", "parent"),
      section("parent"),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["parent", "child"]);
  });

  it("keeps unrelated sections in stable order when parent is outside selection", () => {
    const sorted = sortSectionsForPush([
      section("orphan", "missing-parent"),
      section("root"),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["orphan", "root"]);
  });
});
