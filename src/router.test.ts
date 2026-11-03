import { describe, expect, it } from "vitest";
import { parseRouteFromHash, routeHash } from "@/router";

describe("app routes", () => {
  it("opens the MCP page from the hash", () => {
    expect(parseRouteFromHash("#/mcp")).toEqual({
      name: "mcp",
      languageId: null,
    });
    expect(routeHash("mcp")).toBe("#/mcp");
  });

  it("keeps the landing as the fallback", () => {
    expect(parseRouteFromHash("#/")).toEqual({
      name: "landing",
      languageId: null,
    });
  });
});
