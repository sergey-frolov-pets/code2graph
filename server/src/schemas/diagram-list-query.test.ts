import { describe, expect, it } from "vitest";
import { FAVORITES_SECTION_ID } from "../types.js";
import {
  isFavoritesSectionQuery,
  parseDiagramListQueryFromSearchParams,
} from "./diagram-list-query.js";

describe("diagram-list-query schema", () => {
  it("parses search params with defaults", () => {
    const parsed = parseDiagramListQueryFromSearchParams(new URLSearchParams());
    expect(parsed.q).toBe("");
    expect(parsed.sortBy).toBe("updated");
  });

  it("parses numeric filters", () => {
    const parsed = parseDiagramListQueryFromSearchParams(
      new URLSearchParams("minRating=4.5&minVotes=10"),
    );
    expect(parsed.minRating).toBe(4.5);
    expect(parsed.minVotes).toBe(10);
  });

  it("falls back sortBy for invalid value", () => {
    const parsed = parseDiagramListQueryFromSearchParams(
      new URLSearchParams("sortBy=unknown"),
    );
    expect(parsed.sortBy).toBe("updated");
  });

  it("strips favorites pseudo section", () => {
    const parsed = parseDiagramListQueryFromSearchParams(
      new URLSearchParams(`sectionId=${FAVORITES_SECTION_ID}`),
    );
    expect(parsed.sectionId).toBeUndefined();
  });

  it("detects favorites section query", () => {
    expect(isFavoritesSectionQuery(FAVORITES_SECTION_ID)).toBe(true);
    expect(isFavoritesSectionQuery("real-section")).toBe(false);
  });

  it("parses language filter", () => {
    const parsed = parseDiagramListQueryFromSearchParams(
      new URLSearchParams("language=mermaid"),
    );
    expect(parsed.language).toBe("mermaid");
  });
});
