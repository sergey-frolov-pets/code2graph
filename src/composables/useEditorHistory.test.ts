import { describe, expect, it } from "vitest";
import {
  MAX_EDITOR_HISTORY_ENTRIES,
  useEditorHistory,
} from "@/composables/useEditorHistory";

describe("useEditorHistory", () => {
  it("keeps only the last 10 undo and redo changes", () => {
    expect(MAX_EDITOR_HISTORY_ENTRIES).toBe(10);

    const { pushHistoryEntry, undo, redo, setActiveDocument, clearHistory } =
      useEditorHistory();
    const documentId = "history-limit";
    const total = MAX_EDITOR_HISTORY_ENTRIES + 2;

    setActiveDocument(documentId);
    clearHistory();

    for (let index = 0; index < total; index += 1) {
      pushHistoryEntry({
        before: `v${index}`,
        after: `v${index + 1}`,
        label: `Edit ${index + 1}`,
      });
    }

    const undone: string[] = [];
    let current = `v${total}`;
    for (let step = 0; step < total; step += 1) {
      const snapshot = undo(current);
      if (!snapshot) {
        break;
      }
      undone.push(snapshot.source);
      current = snapshot.source;
    }

    expect(undone).toHaveLength(MAX_EDITOR_HISTORY_ENTRIES);
    expect(undone[0]).toBe(`v${total - 1}`);
    expect(undone.at(-1)).toBe(`v${total - MAX_EDITOR_HISTORY_ENTRIES}`);
    expect(undo(current)).toBeNull();

    const redone: string[] = [];
    for (let step = 0; step < total; step += 1) {
      const snapshot = redo(current);
      if (!snapshot) {
        break;
      }
      redone.push(snapshot.source);
      current = snapshot.source;
    }

    expect(redone).toHaveLength(MAX_EDITOR_HISTORY_ENTRIES);
    expect(redone.at(-1)).toBe(`v${total}`);
    expect(redo(current)).toBeNull();

    setActiveDocument("current");
    clearHistory();
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
