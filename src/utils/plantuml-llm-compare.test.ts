import { describe, expect, it } from "vitest";
import {
  normalizePlantUmlForCompare,
  plantUmlSourcesEqual,
} from "@/utils/plantuml-llm-compare";

describe("plantUmlSourcesEqual", () => {
  it("ignores trailing whitespace and line ending differences", () => {
    const left = "@startuml\nAlice -> Bob\n@enduml";
    const right = "@startuml\nAlice -> Bob\n@enduml\n";
    expect(plantUmlSourcesEqual(left, right)).toBe(true);
    expect(normalizePlantUmlForCompare("@startuml\r\nA\r\n@enduml")).toBe(
      "@startuml\nA\n@enduml",
    );
  });

  it("detects real content changes", () => {
    const left = "@startuml\nAlice -> Bob\n@enduml";
    const right = "@startuml\nAlice -> Charlie\n@enduml";
    expect(plantUmlSourcesEqual(left, right)).toBe(false);
  });
});
