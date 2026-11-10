import { describe, expect, it } from "vitest";
import {
  diagramCanMoveToAnotherSection,
  formatSectionOptionLabel,
  writableMoveSectionOptions,
} from "@/utils/library-move-targets";

const options = [
  { id: "personal", title: "Личное", depth: 0 },
  { id: "shared", title: "Общее", depth: 0 },
  { id: "nested", title: "Вложенное", depth: 1 },
];

describe("writableMoveSectionOptions", () => {
  it("keeps sections the user can write, including local sections without a flag", () => {
    const result = writableMoveSectionOptions(options, [
      { id: "personal", canWrite: true },
      { id: "shared", canWrite: false },
      { id: "nested" },
    ]);

    expect(result.map((section) => section.id)).toEqual(["personal", "nested"]);
  });
});

describe("diagramCanMoveToAnotherSection", () => {
  it("hides the action when the diagram is read-only", () => {
    expect(
      diagramCanMoveToAnotherSection(
        { canWrite: false, sectionId: "personal" },
        options,
      ),
    ).toBe(false);
  });

  it("allows leaving the current section even when no other writable section exists", () => {
    expect(
      diagramCanMoveToAnotherSection(
        { canWrite: true, sectionId: "personal" },
        [],
      ),
    ).toBe(true);
  });

  it("hides the action when the diagram is already unfiled and there is nowhere to put it", () => {
    expect(
      diagramCanMoveToAnotherSection({ sectionId: null }, []),
    ).toBe(false);
  });
});

describe("formatSectionOptionLabel", () => {
  it("indents nested sections", () => {
    expect(formatSectionOptionLabel(options[2]!)).toBe("— Вложенное");
    expect(formatSectionOptionLabel(options[0]!)).toBe("Личное");
  });
});
