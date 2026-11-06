// @vitest-environment jsdom

import { computed, createApp, defineComponent, h, nextTick, ref } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { useEditorHistory } from "@/composables/useEditorHistory";
import { useEditorSourceHistory } from "@/composables/useEditorSourceHistory";
import InlineDiagramBuilder from "@/components/editor/InlineDiagramBuilder.vue";

const FLOW = "flowchart LR\n  A[Start] --> B[End]";

describe("inline builder undo", () => {
  it("redoes a step-by-step edit after undo", async () => {
    vi.useFakeTimers();
    const history = useEditorHistory();
    history.clearHistory();
    history.setActiveDocument("builder-undo");

    const source = ref(FLOW);
    const format = ref<DiagramFormat>("mermaid");
    const suppressed = ref(false);

    const host = document.createElement("div");
    document.body.appendChild(host);
    const app = createApp(
      defineComponent({
        setup() {
          useEditorSourceHistory({
            source,
            diagramFormat: format,
            pushHistoryEntry: history.pushHistoryEntry,
            historyEditLabel: computed(() => "Edit"),
            isSuppressed: suppressed,
          });

          return () =>
            h(InlineDiagramBuilder, {
              source: source.value,
              format: format.value,
              "onUpdate:source": (value: string) => {
                source.value = value;
              },
            });
        },
      }),
    );
    app.mount(host);
    await nextTick();

    const label = host.querySelectorAll("input.builder-cell-input")[2];
    if (!(label instanceof HTMLInputElement)) {
      throw new Error("expected an edge label input");
    }
    label.value = "Changed";
    label.dispatchEvent(new Event("input", { bubbles: true }));
    await nextTick();
    await vi.advanceTimersByTimeAsync(400);
    await nextTick();

    const edited = source.value;
    expect(edited).toContain("Changed");

    suppressed.value = true;
    const undone = history.undo(source.value, format.value);
    expect(undone?.source).toBe(FLOW);
    source.value = undone?.source ?? source.value;
    await nextTick();

    const redone = history.redo(source.value, format.value);
    expect(redone?.source).toBe(edited);
    source.value = redone?.source ?? source.value;
    await nextTick();
    suppressed.value = false;
    await vi.advanceTimersByTimeAsync(400);

    expect(source.value).toBe(edited);
    const restoredLabel = host.querySelectorAll("input.builder-cell-input")[2];
    if (!(restoredLabel instanceof HTMLInputElement)) {
      throw new Error("expected the edge label input after redo");
    }
    expect(restoredLabel.value).toBe("Changed");

    app.unmount();
    host.remove();
    history.clearHistory();
    history.setActiveDocument("current");
    vi.useRealTimers();
  });
});
