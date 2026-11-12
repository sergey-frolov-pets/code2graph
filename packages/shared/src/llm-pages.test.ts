import { describe, expect, it } from "vitest";
import {
  resolveLlmPage,
  resolveLlmPagePath,
} from "./llm-pages.js";

describe("resolveLlmPage", () => {
  it("returns the root index when nothing is specified", () => {
    expect(resolveLlmPage({ request: "hello" }).path).toBe("index.md");
  });

  it("narrows types to the given language", () => {
    expect(
      resolveLlmPage({ language: "plantuml", request: "последовательность" }).path,
    ).toBe("plantuml/sequence.md");
    expect(
      resolveLlmPage({ language: "plantuml", request: "waterfall водопад" }).path,
    ).toBe("plantuml/index.md");
  });

  it("returns one mermaid ext card, and a subpage only for that type", () => {
    expect(
      resolveLlmPage({ language: "mermaid", request: "нарисуй водопад" }).path,
    ).toBe("mermaid/ext/waterfall.md");
    expect(
      resolveLlmPage({
        language: "mermaid",
        source: "waterfall\n=10 : Start\n+2 : Step",
        request: "добавь разрыв шкалы",
      }).path,
    ).toBe("mermaid/ext/waterfall-scale.md");
    expect(
      resolveLlmPage({ language: "mermaid", request: "только break" }).path,
    ).toBe("mermaid/index.md");
  });

  it("opens the series page for a stacked area request", () => {
    expect(
      resolveLlmPage({ request: "stacked area по регионам" }).path,
    ).toBe("mermaid/ext/series.md");
    expect(
      resolveLlmPage({
        language: "mermaid",
        request: "построй площади по годам",
      }).path,
    ).toBe("mermaid/ext/series.md");
  });

  it("does not pick a type that exists in several languages until a language is named", () => {
    expect(resolveLlmPage({ request: "sequence diagram" }).path).toBe("index.md");
    expect(
      resolveLlmPage({ request: "mermaid sequence diagram" }).path,
    ).toBe("mermaid/sequence.md");
  });

  it("resolves a relative link from the page that contained it", () => {
    expect(
      resolveLlmPagePath("./shared.md", "mermaid/ext/waterfall.md"),
    ).toBe("mermaid/ext/shared.md");
    expect(resolveLlmPagePath("../secret.md", "mermaid/ext/waterfall.md")).toBe(
      null,
    );
    expect(resolveLlmPagePath("mermaid/ext/waterfall.md")).toBe(
      "mermaid/ext/waterfall.md",
    );
  });
});
