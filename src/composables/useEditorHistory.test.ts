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
    const { pushHistoryEntry, undo, clearHistory } = useEditorHistory();

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
  });
});
