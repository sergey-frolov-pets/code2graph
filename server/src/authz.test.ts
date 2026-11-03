import { describe, expect, it } from "vitest";
import {
  canReadDiagram,
  canSeeVisibility,
  canWriteDiagram,
  defaultVisibilityForSectionKind,
  isAdmin,
} from "./authz.js";
import { PERMISSION_RANK } from "./subscriptions.js";
import { createMemoryDatabase, seedTestDiagram, seedTestSection, seedTestUser } from "./test/memory-database.js";
import type { UserDto } from "./types.js";

function makeUser(overrides: Partial<UserDto> = {}): UserDto {
  return {
    id: "user-1",
    username: "tester",
    role: "user",
    blocked: false,
    subscriptionActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("authz", () => {
  it("detects admin role", () => {
    const admin = makeUser({ role: "admin" });
    const user = makeUser({ role: "user" });

    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(user)).toBe(false);
  });

  it("orders permissions by rank", () => {
    expect(PERMISSION_RANK.contribute).toBeGreaterThan(PERMISSION_RANK.download);
    expect(PERMISSION_RANK.download).toBeGreaterThan(PERMISSION_RANK.view);
  });

  it("allows owner to read personal diagram", () => {
    const database = createMemoryDatabase();
    seedTestUser(database);
    const diagramId = seedTestDiagram(database, { visibility: "personal" });
    const row = database
      .prepare("SELECT * FROM diagrams WHERE id = ?")
      .get(diagramId) as {
      id: string;
      section_id: string | null;
      author_id: string | null;
      owner_id: string | null;
      visibility: "personal";
    };

    expect(
      canReadDiagram(database, makeUser(), {
        id: row.id,
        section_id: row.section_id,
        author_id: row.author_id,
        owner_id: row.owner_id,
        visibility: row.visibility,
      }),
    ).toBe(true);
  });

  it("denies other user personal diagram", () => {
    const database = createMemoryDatabase();
    seedTestUser(database, "owner", "owner");
    seedTestUser(database, "other", "other");
    const diagramId = seedTestDiagram(database, {
      authorId: "owner",
      ownerId: "owner",
      visibility: "personal",
    });
    const row = database
      .prepare("SELECT * FROM diagrams WHERE id = ?")
      .get(diagramId) as {
      id: string;
      section_id: string | null;
      author_id: string | null;
      owner_id: string | null;
      visibility: "personal";
    };

    expect(
      canReadDiagram(database, makeUser({ id: "other" }), {
        id: row.id,
        section_id: row.section_id,
        author_id: row.author_id,
        owner_id: row.owner_id,
        visibility: row.visibility,
      }),
    ).toBe(false);
  });

  it("allows author to write own diagram", () => {
    const database = createMemoryDatabase();
    seedTestUser(database);
    seedTestSection(database);
    const diagramId = seedTestDiagram(database, {
      sectionId: "section-1",
      visibility: "personal",
    });
    const row = database
      .prepare("SELECT * FROM diagrams WHERE id = ?")
      .get(diagramId) as {
      id: string;
      section_id: string | null;
      author_id: string | null;
      owner_id: string | null;
      visibility: "personal";
    };

    expect(
      canWriteDiagram(database, makeUser(), {
        id: row.id,
        section_id: row.section_id,
        author_id: row.author_id,
        owner_id: row.owner_id,
        visibility: row.visibility,
      }),
    ).toBe(true);
  });

  it("evaluates visibility for all diagrams", () => {
    const user = makeUser();
    expect(canSeeVisibility(user, "all", "other", undefined, null)).toBe(true);
    expect(canSeeVisibility(user, "personal", "other", undefined, null)).toBe(
      false,
    );
    expect(canSeeVisibility(user, "personal", user.id, undefined, null)).toBe(
      true,
    );
  });

  it("defaults visibility by section kind", () => {
    expect(defaultVisibilityForSectionKind("personal")).toBe("personal");
    expect(defaultVisibilityForSectionKind("shared")).toBe("all");
  });
});
