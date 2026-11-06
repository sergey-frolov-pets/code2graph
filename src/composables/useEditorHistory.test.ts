import { describe, expect, it } from "vitest";
import {
  MIN_EDITOR_HISTORY_ENTRIES,
  useEditorHistory,
} from "@/composables/useEditorHistory";

describe("useEditorHistory", () => {
  it("keeps at least the minimum number of history entries", () => {
    expect(MIN_EDITOR_HISTORY_ENTRIES).toBeGreaterThanOrEqual(10);
  });

  it("restores source and format on undo after conversion", () => {
    const { pushHistoryEntry, undo, redo, clearHistory } = useEditorHistory();

    clearHistory();
    pushHistoryEntry({
      before: "@startuml\n[Alice]\n@enduml",
      after: "flowchart TD\n  Alice[Alice]",
      beforeFormat: "plantuml",
      afterFormat: "mermaid",
      label: "Format conversion",
    });

    const restored = undo("flowchart TD\n  Alice[Alice]", "mermaid");
    expect(restored).toEqual({
      source: "@startuml\n[Alice]\n@enduml",
      format: "plantuml",
    });

    const redone = redo("@startuml\n[Alice]\n@enduml", "plantuml");
    expect(redone).toEqual({
      source: "flowchart TD\n  Alice[Alice]",
      format: "mermaid",
    });
  });

  it("keeps undo stacks separate for each open document", () => {
    const { pushHistoryEntry, undo, setActiveDocument, clearHistory, canUndo } =
      useEditorHistory();

    clearHistory();
    setActiveDocument("diagram-a");
    pushHistoryEntry({
      before: "flowchart TD\n  A",
      after: "flowchart TD\n  B",
      label: "Edit",
    });

    setActiveDocument("diagram-b");
    expect(canUndo.value).toBe(false);
    expect(undo("flowchart TD\n  B")).toBeNull();

    setActiveDocument("diagram-a");
    expect(undo("flowchart TD\n  B")).toEqual({
      source: "flowchart TD\n  A",
      format: undefined,
    });

    setActiveDocument("current");
    clearHistory();
  });
});
