import { computed, nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import { useEditorHistory } from "@/composables/useEditorHistory";
import { useEditorSourceHistory } from "@/composables/useEditorSourceHistory";

describe("useEditorSourceHistory", () => {
  it("pushes debounced history entry after manual edit", async () => {
    vi.useFakeTimers();

    const source = ref("line 1");
    const diagramFormat = ref<"plantuml">("plantuml");
    const isSuppressed = ref(false);
    const pushHistoryEntry = vi.fn();

    useEditorSourceHistory({
      source,
      diagramFormat,
      pushHistoryEntry,
      historyEditLabel: computed(() => "Edit"),
      isSuppressed,
    });

    source.value = "line 1\nline 2";
    await vi.advanceTimersByTimeAsync(400);
    await nextTick();

    expect(pushHistoryEntry).toHaveBeenCalledWith({
      before: "line 1",
      after: "line 1\nline 2",
      label: "Edit",
    });

    vi.useRealTimers();
  });

  it("does not record an undo assignment after suppression is cleared synchronously", async () => {
    vi.useFakeTimers();

    const source = ref("line 1");
    const diagramFormat = ref<"plantuml">("plantuml");
    const isSuppressed = ref(false);
    const pushHistoryEntry = vi.fn();

    useEditorSourceHistory({
      source,
      diagramFormat,
      pushHistoryEntry,
      historyEditLabel: computed(() => "Edit"),
      isSuppressed,
    });

    isSuppressed.value = true;
    source.value = "line 1\nline 2";
    isSuppressed.value = false;
    await vi.advanceTimersByTimeAsync(500);
    await nextTick();

    expect(pushHistoryEntry).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("keeps redo available after undo", async () => {
    vi.useFakeTimers();

    const source = ref("v1");
    const diagramFormat = ref<"plantuml">("plantuml");
    const isSuppressed = ref(false);
    const history = useEditorHistory();
    history.setActiveDocument("redo-after-undo");
    history.clearHistory();

    const { flushPendingHistory } = useEditorSourceHistory({
      source,
      diagramFormat,
      pushHistoryEntry: history.pushHistoryEntry,
      historyEditLabel: computed(() => "Edit"),
      isSuppressed,
    });

    source.value = "v2";
    await vi.advanceTimersByTimeAsync(400);
    await nextTick();

    flushPendingHistory();
    isSuppressed.value = true;
    const previous = history.undo(source.value, diagramFormat.value);
    if (previous) {
      source.value = previous.source;
    }
    isSuppressed.value = false;
    await vi.advanceTimersByTimeAsync(500);
    await nextTick();

    expect(history.canRedo.value).toBe(true);
    expect(history.redo(source.value, diagramFormat.value)?.source).toBe("v2");

    history.clearHistory();
    vi.useRealTimers();
  });

  it("skips history while suppressed", async () => {
    vi.useFakeTimers();

    const source = ref("line 1");
    const diagramFormat = ref<"plantuml">("plantuml");
    const isSuppressed = ref(true);
    const pushHistoryEntry = vi.fn();

    useEditorSourceHistory({
      source,
      diagramFormat,
      pushHistoryEntry,
      historyEditLabel: computed(() => "Edit"),
      isSuppressed,
    });

    source.value = "line 1\nline 2";
    await vi.advanceTimersByTimeAsync(500);
    await nextTick();

    expect(pushHistoryEntry).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it("remembers a format change that arrives with the edit", async () => {
    vi.useFakeTimers();

    const source = ref("flowchart TD\n  A");
    const diagramFormat = ref<"mermaid" | "plantuml">("mermaid");
    const isSuppressed = ref(false);
    const pushHistoryEntry = vi.fn();

    useEditorSourceHistory({
      source,
      diagramFormat,
      pushHistoryEntry,
      historyEditLabel: computed(() => "Edit"),
      isSuppressed,
    });

    source.value = "@startuml\nA -> B\n@enduml";
    await nextTick();
    diagramFormat.value = "plantuml";
    await vi.advanceTimersByTimeAsync(400);
    await nextTick();

    expect(pushHistoryEntry).toHaveBeenCalledWith({
      before: "flowchart TD\n  A",
      after: "@startuml\nA -> B\n@enduml",
      label: "Edit",
      beforeFormat: "mermaid",
      afterFormat: "plantuml",
    });

    vi.useRealTimers();
  });
});
