import { describe, expect, it } from "vitest";
import { shouldStopAfterDwell } from "@/composables/usePresentationPlayback";

describe("presentation playback", () => {
  it("stops after the last point unless repeat is on", () => {
    expect(shouldStopAfterDwell(false, 2, 3)).toBe(true);
    expect(shouldStopAfterDwell(false, 0, 3)).toBe(false);
    expect(shouldStopAfterDwell(true, 2, 3)).toBe(false);
    expect(shouldStopAfterDwell(false, 0, 1)).toBe(true);
  });
});
