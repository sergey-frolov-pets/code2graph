import { describe, expect, it } from "vitest";
import {
  diagramDataLinkUrl,
  localDataLinkCanonicalPath,
  parseAppRoute,
  parseRouteFromHash,
  routeHash,
} from "@/router";

describe("app routes", () => {
  it("opens the MCP page from the hash", () => {
    expect(parseRouteFromHash("#/mcp")).toEqual({
      name: "mcp",
      languageId: null,
      diagramSlug: null,
    });
    expect(routeHash("mcp")).toBe("#/mcp");
  });

  it("keeps the landing as the fallback", () => {
    expect(parseRouteFromHash("#/")).toEqual({
      name: "landing",
      languageId: null,
      diagramSlug: null,
    });
  });

  it("does not open a data link from a hash", () => {
    expect(parseRouteFromHash("#/diagram/w")).toEqual({
      name: "landing",
      languageId: null,
      diagramSlug: null,
    });
    expect(parseRouteFromHash("#/local/w")).toEqual({
      name: "landing",
      languageId: null,
      diagramSlug: null,
    });
  });

  it("reads /local/w from the path", () => {
    expect(parseAppRoute({ hash: "", pathname: "/local/w" })).toEqual({
      name: "diagram",
      languageId: null,
      diagramSlug: "w",
    });
    expect(parseAppRoute({ hash: "", pathname: "/local/Water-Fall/" })).toEqual({
      name: "diagram",
      languageId: null,
      diagramSlug: "water-fall",
    });
  });

  it("publishes https://www.code2graph.ru/local/w", () => {
    expect(diagramDataLinkUrl("https://code2graph.ru", "w")).toBe(
      "https://www.code2graph.ru/local/w",
    );
    expect(diagramDataLinkUrl("https://www.code2graph.ru", "w")).toBe(
      "https://www.code2graph.ru/local/w",
    );
    expect(diagramDataLinkUrl("http://localhost:5173", "w")).toBe(
      "http://localhost:5173/local/w",
    );
    expect(
      localDataLinkCanonicalPath({
        hash: "",
        pathname: "/",
        search: "?/local/w",
      }),
    ).toBe("/local/w");
    expect(
      localDataLinkCanonicalPath({
        hash: "#/diagram/w",
        pathname: "/",
        search: "",
      }),
    ).toBeNull();
    expect(
      localDataLinkCanonicalPath({
        hash: "",
        pathname: "/local/w",
        search: "",
      }),
    ).toBeNull();
  });
});
