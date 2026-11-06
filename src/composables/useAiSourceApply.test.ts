import { ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useAiSourceApply } from "@/composables/useAiSourceApply";
import { useEditorHistory } from "@/composables/useEditorHistory";

describe("useAiSourceApply", () => {
  it("restores the previous format when undoing a step-by-step apply", () => {
    const history = useEditorHistory();
    history.clearHistory();
    history.setActiveDocument("wizard-apply");

    const source = ref("@startuml\nAlice -> Bob\n@enduml");
    const diagramFormat = ref<"plantuml" | "mermaid">("plantuml");
    const { applyWizardDiagram } = useAiSourceApply({
      source,
      diagramFormat,
      error: ref(""),
      syntaxErrorLines: ref<number[]>([]),
      persistSettings: vi.fn(),
      scheduleRender: vi.fn(),
      pushHistoryEntry: history.pushHistoryEntry,
    });

    applyWizardDiagram(
      "flowchart TD\n  Alice --> Bob",
      "Step by step",
      "mermaid",
    );

    expect(source.value).toContain("flowchart");
    expect(diagramFormat.value).toBe("mermaid");

    const restored = history.undo(source.value, diagramFormat.value);
    expect(restored).toEqual({
      source: "@startuml\nAlice -> Bob\n@enduml",
      format: "plantuml",
    });

    history.clearHistory();
    history.setActiveDocument("current");
  });
});
