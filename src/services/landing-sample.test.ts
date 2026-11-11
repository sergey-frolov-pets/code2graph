import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LANDING_SAMPLE_STORAGE_KEY,
  consumeLandingSample,
  writeLandingSample,
} from "@/services/landing-sample";

const sessionStore = new Map<string, string>();

vi.stubGlobal("sessionStorage", {
  getItem: (key: string) => sessionStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    sessionStore.set(key, value);
  },
  removeItem: (key: string) => {
    sessionStore.delete(key);
  },
});

describe("landing sample handoff", () => {
  beforeEach(() => {
    sessionStore.clear();
  });

  it("round-trips a gallery diagram exactly once", () => {
    const sample = {
      format: "mermaid" as const,
      source: "flowchart TD\n  A --> B",
      label: "Mermaid · Flowchart",
    };
    expect(writeLandingSample(sample)).toBe(true);
    expect(consumeLandingSample()).toEqual(sample);
    expect(consumeLandingSample()).toBeNull();
  });

  it("rejects a sample with an unknown format", () => {
    sessionStore.set(
      LANDING_SAMPLE_STORAGE_KEY,
      JSON.stringify({ format: "bogus", source: "x", label: "x" }),
    );
    expect(consumeLandingSample()).toBeNull();
  });

  it("rejects malformed JSON", () => {
    sessionStore.set(LANDING_SAMPLE_STORAGE_KEY, "{not json");
    expect(consumeLandingSample()).toBeNull();
  });
});
