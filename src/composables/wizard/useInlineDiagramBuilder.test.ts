import { nextTick, ref } from "vue";
import { describe, expect, it } from "vitest";
import type { DiagramFormat } from "@/constants/diagram-formats";
import { useInlineDiagramBuilder } from "@/composables/wizard/useInlineDiagramBuilder";

const FLOW = "flowchart LR\n  A[Start] --> B[End]";

describe("useInlineDiagramBuilder", () => {
  it("keeps the current source until the builder edits it", async () => {
    const source = ref(FLOW);
    const format = ref<DiagramFormat>("mermaid");
    const active = ref(false);
    const builder = useInlineDiagramBuilder({ active, source, format });

    active.value = true;
    await nextTick();

    expect(source.value).toBe(FLOW);
    expect(builder.builderState.value.graphNodes.map((node) => node.label)).toEqual([
      "Start",
      "End",
    ]);

    const start = builder.builderState.value.graphNodes[0];
    if (!start) {
      throw new Error("expected a start node");
    }
    start.label = "Changed";
    builder.handleBuilderChange();
    await nextTick();

    expect(source.value).toContain("Changed");
    expect(source.value).not.toBe(FLOW);
  });

  it("reloads builder state when the editor source changes outside the builder", async () => {
    const source = ref(FLOW);
    const format = ref<DiagramFormat>("mermaid");
    const active = ref(true);
    const builder = useInlineDiagramBuilder({ active, source, format });
    await nextTick();

    source.value = "flowchart TD\n  X[One] --> Y[Two]";
    await nextTick();

    expect(builder.builderState.value.graphNodes.map((node) => node.label)).toEqual([
      "One",
      "Two",
    ]);
  });
});
