import { describe, expect, it } from "vitest";
import {
  getTargetKindOptions,
  isTargetFormatBlocked,
  isVisualModeBlocked,
} from "@/services/conversion/conversion-route";

const PLANTUML_GANTT = "@startgantt\n[Task] lasts 1 day\n@endgantt";

describe("conversion-route", () => {
  it("detects blocked pie to graphml route", () => {
    expect(
      isTargetFormatBlocked(
        'pie showData\n    "Slice A" : 40\n    "Slice B" : 60',
        "mermaid",
        "graphml",
      ),
    ).toBe(true);
  });

  it("opens gantt to graphml only through the graph diagram type", () => {
    expect(isTargetFormatBlocked(PLANTUML_GANTT, "plantuml", "graphml")).toBe(false);
    expect(
      getTargetKindOptions(PLANTUML_GANTT, "plantuml", "graphml").map((option) => option.kind),
    ).toEqual(["graph"]);
  });

  it("blocks visual mode for sequence diagrams", () => {
    expect(
      isVisualModeBlocked(
        "@startuml\nactor A\nA -> B: hi\n@enduml",
        "plantuml",
        "mermaid",
        "visual",
      ),
    ).toBe(true);
  });
});
