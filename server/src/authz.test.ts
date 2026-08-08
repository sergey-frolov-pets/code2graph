import { describe, expect, it } from "vitest";
import { isAdmin } from "./authz.js";
import { PERMISSION_RANK } from "./subscriptions.js";
import type { UserDto } from "./types.js";

describe("authz", () => {
  it("detects admin role", () => {
    const admin: UserDto = {
      id: "1",
      username: "admin",
      role: "admin",
      blocked: false,
      subscriptionActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const user: UserDto = { ...admin, role: "user" };

    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(user)).toBe(false);
  });

  it("orders permissions by rank", () => {
    expect(PERMISSION_RANK.contribute).toBeGreaterThan(PERMISSION_RANK.download);
    expect(PERMISSION_RANK.download).toBeGreaterThan(PERMISSION_RANK.view);
  });
});
