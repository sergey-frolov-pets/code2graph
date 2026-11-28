// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/analytics/goatcounter";
import { pageSectionOf } from "@/composables/useAnalytics";
import type { AppRouteName, ParsedAppRoute } from "@/router";

type CountVars = { path?: string; title?: string; event?: boolean };
type GcWindow = { goatcounter?: { count?: (vars: CountVars) => void } };

function installGoatCounter(): ReturnType<typeof vi.fn> {
  const count = vi.fn();
  (window as unknown as GcWindow).goatcounter = { count };
  return count;
}

function route(
  name: AppRouteName,
  extra: Partial<ParsedAppRoute> = {},
): ParsedAppRoute {
  return {
    name,
    languageId: null,
    diagramSlug: null,
    libraryUsername: null,
    libraryLinkSlug: null,
    ...extra,
  };
}

afterEach(() => {
  delete (window as unknown as GcWindow).goatcounter;
});

describe("trackEvent", () => {
  it("forwards the event to the GoatCounter bridge", () => {
    const count = installGoatCounter();

    trackEvent("page/landing", "page/landing");

    expect(count).toHaveBeenCalledWith({
      path: "page/landing",
      title: "page/landing",
      event: true,
    });
  });

  it("does nothing when GoatCounter is not loaded", () => {
    expect(() => trackEvent("page/landing")).not.toThrow();
  });
});

describe("pageSectionOf", () => {
  it("maps the main routes to page sections", () => {
    expect(pageSectionOf(route("landing"))).toBe("landing");
    expect(pageSectionOf(route("app"))).toBe("app");
    expect(pageSectionOf(route("mcp"))).toBe("mcp");
    expect(pageSectionOf(route("account"))).toBe("account");
    expect(pageSectionOf(route("diagram"))).toBe("diagram");
  });

  it("builds a per-language section for language pages", () => {
    expect(pageSectionOf(route("language", { languageId: "mermaid" }))).toBe(
      "master-mermaid",
    );
  });

  it("ignores routes that are not sections", () => {
    expect(pageSectionOf(route("dashboardEmbed"))).toBeNull();
  });
});
