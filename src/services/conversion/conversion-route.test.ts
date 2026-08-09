import { describe, expect, it } from "vitest";
import {
  isTargetFormatBlocked,
  isVisualModeBlocked,
} from "@/services/conversion/conversion-route";

describe("conversion-route", () => {
  it("detects blocked gantt to graphml route", () => {
    expect(
      isTargetFormatBlocked(
        "@startgantt\n[Task] lasts 1 day\n@endgantt",
        "plantuml",
        "graphml",
      ),
    ).toBe(true);
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
