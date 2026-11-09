import { describe, expect, it } from "vitest";
import { DATA_LINK_SOURCE_KEYWORD } from "@/services/local-data-link/constants";
import {
  parseDataLinkMarker,
  upsertDataLinkMarker,
  type DataLinkSourceMarker,
} from "@/services/local-data-link/source-marker";

const marker: DataLinkSourceMarker = {
  slug: "Waterfall",
  filePathLabel: "C:\\data\\a b.xlsx",
  sheetRange: "Sheet1!A3:C10",
  untilEmptyRow: true,
};

describe("local data link source marker", () => {
  it("round-trips a PlantUML comment placed after @startuml", () => {
    const source = upsertDataLinkMarker(
      "@startuml Demo\nactor User\n@enduml\n",
      "plantuml",
      marker,
    );
    expect(source.startsWith("@startuml Demo\n' ")).toBe(true);
    expect(source).toContain(DATA_LINK_SOURCE_KEYWORD);
    expect(parseDataLinkMarker(source)).toEqual({
      slug: "waterfall",
      filePathLabel: "C:\\data\\a b.xlsx",
      sheetRange: "Sheet1!A3:C10",
      untilEmptyRow: true,
    });
  });

  it("uses a comment that each diagram language accepts", () => {
    expect(upsertDataLinkMarker("flowchart TD\nA-->B\n", "mermaid", marker)).toMatch(
      /^%% code2graph-data-link /,
    );
    expect(upsertDataLinkMarker("x -> y\n", "d2", marker)).toMatch(
      /^# code2graph-data-link /,
    );
    expect(upsertDataLinkMarker("workspace {\n}\n", "structurizr", marker)).toMatch(
      /^\/\/ code2graph-data-link /,
    );
    expect(upsertDataLinkMarker('Button "Save"\n', "wiremark", marker)).toMatch(
      /^\/\/ code2graph-data-link /,
    );
    const graphml = upsertDataLinkMarker(
      '<?xml version="1.0"?>\n<graphml></graphml>\n',
      "graphml",
      marker,
    );
    expect(graphml.startsWith('<?xml version="1.0"?>\n<!-- code2graph-data-link ')).toBe(
      true,
    );
    expect(graphml).toContain("-->\n<graphml>");
  });

  it("replaces an existing marker instead of adding a second one", () => {
    const first = upsertDataLinkMarker("@startuml\nA -> B\n@enduml\n", "plantuml", marker);
    const next = upsertDataLinkMarker(first, "plantuml", {
      ...marker,
      slug: "other",
      untilEmptyRow: false,
    });
    expect(next.match(/code2graph-data-link/g)).toHaveLength(1);
    expect(parseDataLinkMarker(next)?.slug).toBe("other");
    expect(parseDataLinkMarker(next)?.untilEmptyRow).toBe(false);
    expect(upsertDataLinkMarker(next, "plantuml", {
      ...marker,
      slug: "other",
      untilEmptyRow: false,
    })).toBe(next);
  });

  it("returns null when the keyword is absent", () => {
    expect(parseDataLinkMarker("@startuml\nA -> B\n@enduml\n")).toBeNull();
  });
});
