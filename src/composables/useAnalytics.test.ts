// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "@/composables/useAnalytics";

type CountVars = { path?: string; title?: string; event?: boolean };
type GcWindow = { goatcounter?: { count?: (vars: CountVars) => void } };

function installGoatCounter(): ReturnType<typeof vi.fn> {
  const count = vi.fn();
  (window as unknown as GcWindow).goatcounter = { count };
  return count;
}

afterEach(() => {
  delete (window as unknown as GcWindow).goatcounter;
});

describe("trackEvent", () => {
  it("forwards the event to the GoatCounter bridge", () => {
    const count = installGoatCounter();

    trackEvent("wizard-open", "Wizard: new diagram");

    expect(count).toHaveBeenCalledWith({
      path: "wizard-open",
      title: "Wizard: new diagram",
      event: true,
    });
  });

  it("does nothing when GoatCounter is not loaded", () => {
    expect(() => trackEvent("wizard-open")).not.toThrow();
  });
});
