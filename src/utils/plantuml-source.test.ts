import { describe, expect, it } from "vitest";
import {
  applyLayoutPragma,
  migrateDeprecatedActivityColorSyntax,
  preparePlantUmlSource,
} from "@/utils/plantuml-source";

describe("migrateDeprecatedActivityColorSyntax", () => {
  it("converts legacy activity color prefix syntax", () => {
    const source = `@startuml
if (ok?) then (yes)
  #Pink:Show error;
else (no)
  :continue;
endif
#LightBlue:Export PNG/SVG;
@enduml`;

    expect(migrateDeprecatedActivityColorSyntax(source)).toBe(`@startuml
if (ok?) then (yes)
  :Show error; <<#Pink>>
else (no)
  :continue;
endif
:Export PNG/SVG; <<#LightBlue>>
@enduml`);
  });

  it("leaves sequence participant colors unchanged", () => {
    const source = `participant "Web App" as app #LightBlue`;
    expect(migrateDeprecatedActivityColorSyntax(source)).toBe(source);
  });

  it("leaves already migrated activity syntax unchanged", () => {
    const source = `:Show error; <<#Pink>>`;
    expect(migrateDeprecatedActivityColorSyntax(source)).toBe(source);
  });
});

describe("applyLayoutPragma", () => {
  it("keeps gantt diagrams untouched", () => {
    const gantt = `@startgantt
project starts 2026-01-01
[Task A] lasts 3 days
@endgantt`;

    expect(applyLayoutPragma(gantt, "smetana")).toBe(gantt);
  });
});

describe("preparePlantUmlSource", () => {
  it("migrates deprecated activity colors before rendering", async () => {
    const prepared = await preparePlantUmlSource(
      "#Pink:Show error;",
      "smetana",
    );

    expect(prepared).toContain(":Show error; <<#Pink>>");
    expect(prepared).not.toContain("#Pink:Show error;");
  });
});
