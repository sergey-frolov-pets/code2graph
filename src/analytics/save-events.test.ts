// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { trackSave } from "@/analytics/goatcounter";

describe("trackSave", () => {
  const count = vi.fn();

  beforeEach(() => {
    count.mockReset();
    window.goatcounter = { count };
  });

  afterEach(() => {
    delete window.goatcounter;
  });

  it("prefixes the kind with save- and flags the hit as an event", () => {
    trackSave("image-png");
    expect(count).toHaveBeenCalledWith({
      path: "save-image-png",
      title: "save-image-png",
      event: true,
    });
  });

  it("keeps a custom title when given", () => {
    trackSave("diagram-mermaid", "Save diagram: mermaid");
    expect(count).toHaveBeenCalledWith({
      path: "save-diagram-mermaid",
      title: "Save diagram: mermaid",
      event: true,
    });
  });

  it("stays silent when the tracker is not loaded", () => {
    delete window.goatcounter;
    expect(() => trackSave("image-svg")).not.toThrow();
    expect(count).not.toHaveBeenCalled();
  });
});
