import { describe, expect, it } from "vitest";
import { looksLikeD2Source, unwrapD2Source } from "./d2-source";

describe("looksLikeD2Source", () => {
  it("recognizes direction, shape, and fenced d2", () => {
    expect(looksLikeD2Source("direction: right\nx -> y")).toBe(true);
    expect(looksLikeD2Source("a: A\nshape: person\na -> b")).toBe(true);
    expect(looksLikeD2Source("```d2\nx -> y\n```")).toBe(true);
  });

  it("does not treat PlantUML or Mermaid as D2", () => {
    expect(looksLikeD2Source("@startuml\nAlice -> Bob\n@enduml")).toBe(false);
    expect(looksLikeD2Source("flowchart TD\nA --> B")).toBe(false);
    expect(looksLikeD2Source("Alice -> Bob")).toBe(false);
  });
});

describe("unwrapD2Source", () => {
  it("strips a d2 fence", () => {
    expect(unwrapD2Source("```d2\nx -> y\n```")).toBe("x -> y");
  });
});
