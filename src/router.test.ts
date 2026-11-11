import { describe, expect, it } from "vitest";
import {
  diagramDataLinkUrl,
  libraryLinkUrl,
  localDataLinkCanonicalPath,
  parseAppRoute,
  parseLibraryLinkPathname,
  parseRouteFromHash,
  routeHash,
} from "@/router";

describe("app routes", () => {
  it("opens the MCP page from the hash", () => {
    expect(parseRouteFromHash("#/mcp")).toEqual({
      name: "mcp",
      languageId: null,
      diagramSlug: null,
      libraryUsername: null,
      libraryLinkSlug: null,
    });
    expect(routeHash("mcp")).toBe("#/mcp");
  });

  it("opens a preview tab from its session hash", () => {
    expect(parseRouteFromHash("#/preview/session-a")).toEqual({
      name: "preview",
      languageId: null,
      diagramSlug: "session-a",
      libraryUsername: null,
      libraryLinkSlug: null,
    });
  });

  it("keeps a preview hash without a session on the landing", () => {
    expect(parseRouteFromHash("#/preview")).toEqual({
      name: "landing",
      languageId: null,
      diagramSlug: null,
      libraryUsername: null,
      libraryLinkSlug: null,
    });
  });

  it("keeps the landing as the fallback", () => {
    expect(parseRouteFromHash("#/")).toEqual({
      name: "landing",
      languageId: null,
      diagramSlug: null,
      libraryUsername: null,
      libraryLinkSlug: null,
    });
  });

  it("does not open a data link from a hash", () => {
    expect(parseRouteFromHash("#/diagram/w")).toEqual({
      name: "landing",
      languageId: null,
      diagramSlug: null,
      libraryUsername: null,
      libraryLinkSlug: null,
    });
    expect(parseRouteFromHash("#/local/w")).toEqual({
      name: "landing",
      languageId: null,
      diagramSlug: null,
      libraryUsername: null,
      libraryLinkSlug: null,
    });
  });

  it("opens the preview tab on top of a local data link", () => {
    expect(
      parseAppRoute({
        hash: "#/preview/session-a",
        pathname: "/local/w",
      }),
    ).toEqual({
      name: "preview",
      languageId: null,
      diagramSlug: "session-a",
      libraryUsername: null,
      libraryLinkSlug: null,
    });
    expect(
      parseAppRoute({
        hash: "#/preview/session-a",
        pathname: "/diagram",
      }).name,
    ).toBe("preview");
    expect(
      parseAppRoute({
        hash: "#/preview/session-a",
        pathname: "/owner/water-fall",
      }).name,
    ).toBe("preview");
    expect(
      parseAppRoute({
        hash: "#/preview/session-a",
        pathname: "/",
        search: "?/local/w",
      }).name,
    ).toBe("preview");
    expect(
      localDataLinkCanonicalPath({
        hash: "#/preview/session-a",
        pathname: "/",
        search: "?/local/w",
      }),
    ).toBeNull();
  });

  it("reads /local/w from the path", () => {
    expect(parseAppRoute({ hash: "", pathname: "/local/w" })).toEqual({
      name: "diagram",
      languageId: null,
      diagramSlug: "w",
      libraryUsername: null,
      libraryLinkSlug: null,
    });
    expect(parseAppRoute({ hash: "", pathname: "/local/Water-Fall/" })).toEqual({
      name: "diagram",
      languageId: null,
      diagramSlug: "water-fall",
      libraryUsername: null,
      libraryLinkSlug: null,
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

  it("reads /diagram and ignores the old hash form", () => {
    expect(parseAppRoute({ hash: "", pathname: "/diagram" })).toEqual({
      name: "clipboard",
      languageId: null,
      diagramSlug: null,
      libraryUsername: null,
      libraryLinkSlug: null,
    });
    expect(parseAppRoute({ hash: "", pathname: "/diagram/" })).toEqual({
      name: "clipboard",
      languageId: null,
      diagramSlug: null,
      libraryUsername: null,
      libraryLinkSlug: null,
    });
    expect(parseAppRoute({ hash: "", pathname: "/diagram/w" })).toEqual({
      name: "landing",
      languageId: null,
      diagramSlug: null,
      libraryUsername: null,
      libraryLinkSlug: null,
    });
    expect(
      localDataLinkCanonicalPath({
        hash: "",
        pathname: "/",
        search: "?/diagram",
      }),
    ).toBe("/diagram");
  });

  it("reads /user/link and an optional library segment", () => {
    expect(parseAppRoute({ hash: "", pathname: "/owner/water-fall" })).toEqual({
      name: "libraryLink",
      languageId: null,
      diagramSlug: null,
      libraryUsername: "owner",
      libraryLinkSlug: "water-fall",
    });
    expect(parseAppRoute({ hash: "", pathname: "/local/w" }).name).toBe("diagram");
    expect(parseAppRoute({ hash: "", pathname: "/api/health" }).name).toBe("landing");
    expect(parseLibraryLinkPathname("/maps/owner/plan", "maps")).toEqual({
      name: "libraryLink",
      languageId: null,
      diagramSlug: null,
      libraryUsername: "owner",
      libraryLinkSlug: "plan",
    });
    expect(parseLibraryLinkPathname("/owner/plan", "maps")).toBeNull();
    expect(libraryLinkUrl("https://code2graph.ru", "Иван", "plan", "")).toBe(
      "https://www.code2graph.ru/%D0%98%D0%B2%D0%B0%D0%BD/plan",
    );
    expect(libraryLinkUrl("https://code2graph.ru", "owner", "plan", "maps")).toBe(
      "https://www.code2graph.ru/maps/owner/plan",
    );
    expect(
      localDataLinkCanonicalPath({
        hash: "",
        pathname: "/",
        search: "?/owner/plan",
      }),
    ).toBe("/owner/plan");
  });
});
