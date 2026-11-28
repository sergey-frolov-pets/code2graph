// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/analytics/goatcounter";

describe("goatcounter analytics", () => {
  const count = vi.fn();

  beforeEach(() => {
    count.mockReset();
    window.goatcounter = { count };
  });

  afterEach(() => {
    delete window.goatcounter;
  });

  it("sends custom events with the event flag", () => {
    trackEvent("visit/app");
    expect(count).toHaveBeenCalledWith({
      path: "visit/app",
      title: "visit/app",
      event: true,
    });
  });

  it("keeps the custom title when one is given", () => {
    trackEvent("page/landing", "Landing");
    expect(count).toHaveBeenCalledWith({
      path: "page/landing",
      title: "Landing",
      event: true,
    });
  });

  it("sends events one by one, without deduplication", () => {
    trackEvent("click/github");
    trackEvent("click/github");
    expect(count).toHaveBeenCalledTimes(2);
  });

  it("stays silent when the tracker is not loaded", () => {
    delete window.goatcounter;
    expect(() => trackEvent("visit/app")).not.toThrow();
    expect(count).not.toHaveBeenCalled();
  });
});
