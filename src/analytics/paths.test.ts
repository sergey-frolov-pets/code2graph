import { describe, expect, it } from "vitest";
import { LANDING_PATH, MASTER_PATH_PREFIX, pagePath } from "@/analytics/paths";

describe("pagePath", () => {
  it("maps the root hash to the readable landing path", () => {
    expect(pagePath("")).toBe(LANDING_PATH);
    expect(pagePath("#")).toBe(LANDING_PATH);
    expect(pagePath("#/")).toBe(LANDING_PATH);
    expect(pagePath("/")).toBe(LANDING_PATH);
  });

  it("keeps the readable names of the main pages", () => {
    expect(pagePath("#/app")).toBe("/app");
    expect(pagePath("#/editor")).toBe("/app");
    expect(pagePath("#/mcp")).toBe("/mcp");
    expect(pagePath("#/login")).toBe("/login");
    expect(pagePath("#/register")).toBe("/register");
    expect(pagePath("#/account")).toBe("/account");
    expect(pagePath("#/cabinet")).toBe("/account");
  });

  it("turns language routes into master pages", () => {
    expect(pagePath("#/lang/mermaid")).toBe(`${MASTER_PATH_PREFIX}mermaid`);
    expect(pagePath("#/lang/plantuml")).toBe("/master-plantuml");
  });

  it("is case-insensitive and tolerates a missing slash", () => {
    expect(pagePath("#/APP")).toBe("/app");
    expect(pagePath("#app")).toBe("/app");
    expect(pagePath("#/Lang/Mermaid")).toBe("/master-mermaid");
  });

  it("keeps unknown routes instead of merging them", () => {
    expect(pagePath("#/unknown")).toBe("/unknown");
  });
});
