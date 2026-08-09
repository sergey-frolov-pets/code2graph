// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMermaidInkReachable,
  probeMermaidInkConnectivity,
  resetMermaidInkConnectivity,
} from "@/services/mermaid/mermaid-online";

describe("probeMermaidInkConnectivity", () => {
  afterEach(() => {
    resetMermaidInkConnectivity();
    vi.unstubAllGlobals();
  });

  it("marks ink unreachable when browser is offline", async () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      get: () => false,
    });

    const reachable = await probeMermaidInkConnectivity();

    expect(reachable).toBe(false);
    expect(getMermaidInkReachable()).toBe(false);
  });

  it("marks ink reachable when probe returns svg", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => "<svg></svg>",
      })),
    );

    const reachable = await probeMermaidInkConnectivity();

    expect(reachable).toBe(true);
    expect(getMermaidInkReachable()).toBe(true);
  });
});
