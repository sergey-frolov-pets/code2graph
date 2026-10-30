import { describe, expect, it } from "vitest";
import { resolveShareLinkExpiry } from "./routes/diagrams/share.js";
import { SHARE_LINK_DEFAULT_TTL_DAYS } from "./config.js";

const DAY_MS = 24 * 60 * 60 * 1000;

describe("resolveShareLinkExpiry", () => {
  const now = Date.UTC(2026, 0, 1);

  it("defaults to a limited lifetime when nothing is requested", () => {
    const expiresAt = resolveShareLinkExpiry(undefined, false, now);

    expect(expiresAt).toBe(
      new Date(now + SHARE_LINK_DEFAULT_TTL_DAYS * DAY_MS).toISOString(),
    );
  });

  it("keeps an explicit future date", () => {
    const requested = new Date(now + 3 * DAY_MS).toISOString();

    expect(resolveShareLinkExpiry(requested, false, now)).toBe(requested);
  });

  it("ignores a past date and falls back to the default", () => {
    const requested = new Date(now - DAY_MS).toISOString();

    expect(resolveShareLinkExpiry(requested, false, now)).toBe(
      new Date(now + SHARE_LINK_DEFAULT_TTL_DAYS * DAY_MS).toISOString(),
    );
  });

  it("creates a permanent link only with an explicit flag", () => {
    expect(resolveShareLinkExpiry(undefined, true, now)).toBeNull();
  });
});
