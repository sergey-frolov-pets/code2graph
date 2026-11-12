import { describe, expect, it } from "vitest";
import { formatTokenCount } from "@/utils/format-token-count";

describe("formatTokenCount", () => {
  it("leaves counts below one thousand unchanged", () => {
    expect(formatTokenCount(0)).toBe("0");
    expect(formatTokenCount(1)).toBe("1");
    expect(formatTokenCount(999)).toBe("999");
  });

  it("rounds thousands to the nearest K", () => {
    expect(formatTokenCount(1_000)).toBe("1K");
    expect(formatTokenCount(1_499)).toBe("1K");
    expect(formatTokenCount(1_500)).toBe("2K");
    expect(formatTokenCount(9_872)).toBe("10K");
  });

  it("rounds millions to the nearest M and billions to the nearest B", () => {
    expect(formatTokenCount(1_000_000)).toBe("1M");
    expect(formatTokenCount(1_499_999)).toBe("1M");
    expect(formatTokenCount(1_500_000)).toBe("2M");
    expect(formatTokenCount(12_345_678)).toBe("12M");
    expect(formatTokenCount(1_000_000_000)).toBe("1B");
    expect(formatTokenCount(2_400_000_000)).toBe("2B");
  });

  it("steps up a unit when rounding would print 1000 of the smaller suffix", () => {
    expect(formatTokenCount(999_500)).toBe("1M");
    expect(formatTokenCount(999_500_000)).toBe("1B");
  });

  it("keeps a sign and replaces a non-finite value with zero", () => {
    expect(formatTokenCount(-9_872)).toBe("-10K");
    expect(formatTokenCount(Number.NaN)).toBe("0");
    expect(formatTokenCount(Number.POSITIVE_INFINITY)).toBe("0");
  });
});
