import { describe, expect, it } from "vitest";
import {
  DEFAULT_GOATCOUNTER_ORIGIN,
  isAnalyticsEnabled,
  resolveGoatCounterCountUrl,
  resolveGoatCounterOrigin,
} from "@/analytics/config";

describe("resolveGoatCounterOrigin", () => {
  it("falls back to the default origin when the variable is unset", () => {
    expect(resolveGoatCounterOrigin(undefined)).toBe(DEFAULT_GOATCOUNTER_ORIGIN);
  });

  it("uses a custom origin for forks and self-hosted instances", () => {
    expect(resolveGoatCounterOrigin("https://stats.example.com")).toBe(
      "https://stats.example.com",
    );
  });

  it("strips trailing slashes so the count URL stays well-formed", () => {
    expect(resolveGoatCounterOrigin("https://stats.example.com/")).toBe(
      "https://stats.example.com",
    );
    expect(resolveGoatCounterOrigin("https://stats.example.com///")).toBe(
      "https://stats.example.com",
    );
  });

  it("disables analytics when the variable is an empty string", () => {
    expect(resolveGoatCounterOrigin("")).toBe("");
    expect(resolveGoatCounterOrigin("   ")).toBe("");
  });
});

describe("resolveGoatCounterCountUrl", () => {
  it("appends the /count path", () => {
    expect(resolveGoatCounterCountUrl("https://stats.example.com")).toBe(
      "https://stats.example.com/count",
    );
  });

  it("returns an empty string when analytics is disabled", () => {
    expect(resolveGoatCounterCountUrl("")).toBe("");
  });
});

describe("isAnalyticsEnabled", () => {
  it("is enabled by default and for custom origins", () => {
    expect(isAnalyticsEnabled(undefined)).toBe(true);
    expect(isAnalyticsEnabled("https://stats.example.com")).toBe(true);
  });

  it("is disabled for an empty variable", () => {
    expect(isAnalyticsEnabled("")).toBe(false);
  });
});
