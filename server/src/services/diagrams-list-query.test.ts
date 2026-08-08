import { describe, expect, it } from "vitest";
import { buildDiagramListQuery, parseDiagramListQuery, isFavoritesList } from "./diagrams-list-query.js";

describe("diagrams-list-query", () => {
  it("parses list query params", () => {
    const params = parseDiagramListQuery(
      new URLSearchParams("q=test&sortBy=rating&minRating=3"),
    );
    expect(params.q).toBe("test");
    expect(params.sortBy).toBe("rating");
    expect(params.minRating).toBe(3);
  });

  it("builds base list sql", () => {
    const { sql, params } = buildDiagramListQuery(
      {
        database: { prepare: () => ({ all: () => [] }) } as never,
        userId: "u1",
        params: { q: "api" },
      },
      false,
    );
    expect(sql).toContain("FROM diagrams");
    expect(sql).toContain("title LIKE ?");
    expect(params).toHaveLength(3);
  });
});
