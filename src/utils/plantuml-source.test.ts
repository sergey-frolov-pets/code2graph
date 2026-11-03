import { describe, expect, it } from "vitest";
import {
  applyLayoutPragma,
  migrateDeprecatedActivityColorSyntax,
  preparePlantUmlSource,
  stripUnsupportedActivityDirection,
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

  it("strips layout pragma from timing diagrams", () => {
    const timing = `@startuml
!pragma layout smetana

title Диаграмма синхронизации
concise "Сигнал 1" as S1
@0
S1 is Idle
@enduml`;

    const result = applyLayoutPragma(timing, "dot");

    expect(result).not.toContain("!pragma layout");
    expect(result).toContain("concise");
    expect(result).toContain("Диаграмма синхронизации");
  });

  it("strips layout pragma from sequence diagrams", () => {
    const sequence = `@startuml
!pragma layout smetana
actor A
actor B
A -> B: hello
@enduml`;

    const result = applyLayoutPragma(sequence, "dot");

    expect(result).not.toContain("!pragma layout");
    expect(result).toContain("A -> B: hello");
  });

  it("strips layout pragma from activity diagrams", () => {
    const activity = `@startuml
!pragma layout smetana
start
:Step;
stop
@enduml`;

    const result = applyLayoutPragma(activity, "dot");

    expect(result).not.toContain("!pragma layout");
    expect(result).toContain("start");
  });

  it("replaces layout pragma for class diagrams", () => {
    const source = `@startuml
!pragma layout smetana
class A
@enduml`;

    expect(applyLayoutPragma(source, "dot")).toContain("!pragma layout dot");
  });
});

describe("stripUnsupportedActivityDirection", () => {
  it("removes direction directives from activity diagrams", () => {
    const source = `@startuml
top to bottom direction
|Lane|
start
:Step;
stop
@enduml`;

    expect(stripUnsupportedActivityDirection(source)).not.toContain(
      "top to bottom direction",
    );
    expect(stripUnsupportedActivityDirection(source)).toContain("start");
  });

  it("keeps direction directives for class diagrams", () => {
    const source = `@startuml
top to bottom direction
class A
@enduml`;

    expect(stripUnsupportedActivityDirection(source)).toContain(
      "top to bottom direction",
    );
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

  it("strips unsupported direction directives from activity diagrams", async () => {
    const prepared = await preparePlantUmlSource(
      `@startuml
top to bottom direction
start
:Step;
stop
@enduml`,
      "smetana",
    );

    expect(prepared).not.toContain("top to bottom direction");
    expect(prepared).toContain("start");
  });
});
