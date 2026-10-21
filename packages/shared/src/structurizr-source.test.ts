import { describe, expect, it } from "vitest";
import {
  looksLikeStructurizrSource,
  unwrapStructurizrSource,
} from "./structurizr-source";

describe("looksLikeStructurizrSource", () => {
  it("recognizes a workspace and a fenced document", () => {
    expect(looksLikeStructurizrSource("workspace {\nmodel {}\n}")).toBe(true);
    expect(
      looksLikeStructurizrSource("// note\nworkspace \"Shop\" {\n}"),
    ).toBe(true);
    expect(
      looksLikeStructurizrSource("```structurizr\nworkspace {}\n```"),
    ).toBe(true);
  });

  it("does not treat PlantUML, Mermaid, or D2 as Structurizr", () => {
    expect(looksLikeStructurizrSource("@startuml\nAlice -> Bob\n@enduml")).toBe(
      false,
    );
    expect(looksLikeStructurizrSource("flowchart TD\nA --> B")).toBe(false);
    expect(looksLikeStructurizrSource("direction: right\nx -> y")).toBe(false);
  });
});

describe("unwrapStructurizrSource", () => {
  it("strips a structurizr fence", () => {
    expect(unwrapStructurizrSource("```dsl\nworkspace {}\n```")).toBe(
      "workspace {}",
    );
  });
});
