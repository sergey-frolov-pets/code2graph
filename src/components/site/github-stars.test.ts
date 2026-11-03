import { describe, expect, it } from "vitest";
import {
  GITHUB_STAR_CACHE_TTL_MS,
  readCachedStarCount,
  writeCachedStarCount,
} from "@/components/site/github-stars";

describe("github star cache", () => {
  it("returns a count stored inside the hour", () => {
    const nowMs = 1_700_000_000_000;
    const raw = writeCachedStarCount(12, nowMs - 1_000);

    expect(readCachedStarCount(raw, nowMs, GITHUB_STAR_CACHE_TTL_MS)).toBe(12);
  });

  it("drops a count older than the cache window", () => {
    const nowMs = 1_700_000_000_000;
    const raw = writeCachedStarCount(12, nowMs - GITHUB_STAR_CACHE_TTL_MS);

    expect(readCachedStarCount(raw, nowMs, GITHUB_STAR_CACHE_TTL_MS)).toBeNull();
  });

  it("ignores a broken cache entry", () => {
    expect(readCachedStarCount("{", 1, GITHUB_STAR_CACHE_TTL_MS)).toBeNull();
    expect(readCachedStarCount(null, 1, GITHUB_STAR_CACHE_TTL_MS)).toBeNull();
  });
});
