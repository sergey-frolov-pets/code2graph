import { describe, expect, it } from "vitest";
import { higherPermission, PERMISSION_RANK } from "./subscriptions.js";

describe("subscriptions", () => {
  it("ranks permissions ascending", () => {
    expect(PERMISSION_RANK.view).toBeLessThan(PERMISSION_RANK.download);
    expect(PERMISSION_RANK.download).toBeLessThan(PERMISSION_RANK.contribute);
  });

  it("picks higher permission", () => {
    expect(higherPermission("view", "download")).toBe("download");
    expect(higherPermission("contribute", "view")).toBe("contribute");
    expect(higherPermission("download", "download")).toBe("download");
  });
});
