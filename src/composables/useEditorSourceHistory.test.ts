import { computed, nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
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
});
