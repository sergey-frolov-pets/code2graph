// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent, trackPageview } from "@/analytics/goatcounter";

describe("goatcounter analytics", () => {
  const count = vi.fn();

  beforeEach(() => {
    count.mockReset();
    window.goatcounter = { count };
  });

  afterEach(() => {
    delete window.goatcounter;
  });

  it("maps the landing hash to the readable landing path", () => {
    trackPageview("#/", "Code2Graph");
    expect(count).toHaveBeenCalledWith({ path: "/landing", title: "Code2Graph" });
  });

  it("sends readable paths for app, mcp and master pages", () => {
    trackPageview("#/app");
    trackPageview("#/mcp");
    trackPageview("#/lang/mermaid");
    expect(count).toHaveBeenNthCalledWith(1, { path: "/app", title: document.title });
    expect(count).toHaveBeenNthCalledWith(2, { path: "/mcp", title: document.title });
    expect(count).toHaveBeenNthCalledWith(3, {
      path: "/master-mermaid",
      title: document.title,
    });
  });

  it("treats an empty hash as the landing page", () => {
    trackPageview("");
    expect(count).toHaveBeenCalledWith({ path: "/landing", title: document.title });
  });

  it("sends custom events with the event flag", () => {
    trackEvent("cta-landing-app", "Open editor");
    expect(count).toHaveBeenCalledWith({
      path: "cta-landing-app",
      title: "Open editor",
      event: true,
    });
  });

  it("stays silent when the tracker is not loaded", () => {
    delete window.goatcounter;
    expect(() => trackPageview("#/app")).not.toThrow();
    expect(() => trackEvent("cta-landing-app")).not.toThrow();
    expect(count).not.toHaveBeenCalled();
  });
});
