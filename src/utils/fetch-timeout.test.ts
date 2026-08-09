import { describe, expect, it, vi } from "vitest";
import { createFetchTimeoutSignal } from "@/utils/fetch-timeout";

describe("createFetchTimeoutSignal", () => {
  it("uses AbortSignal.timeout when available", () => {
    const timeoutSpy = vi.fn(() => new AbortController().signal);
    vi.stubGlobal("AbortSignal", { timeout: timeoutSpy });

    createFetchTimeoutSignal(1000);

    expect(timeoutSpy).toHaveBeenCalledWith(1000);
    vi.unstubAllGlobals();
  });

  it("falls back to AbortController when timeout is unavailable", () => {
    vi.stubGlobal("AbortSignal", {});

    const signal = createFetchTimeoutSignal(50);

    expect(signal.aborted).toBe(false);
    vi.unstubAllGlobals();
  });
});
