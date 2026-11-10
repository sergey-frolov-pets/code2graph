import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthToken } from "../auth/token.js";
import {
  createMemoryDatabase,
  seedTestUser,
} from "../test/memory-database.js";

const state: { db: ReturnType<typeof createMemoryDatabase> | null } = { db: null };

vi.mock("../db.js", () => ({
  getDb: () => {
    if (!state.db) {
      throw new Error("Test database is not ready");
    }
    return state.db;
  },
}));

import { shareRouter } from "./share.js";

function buildApp(): Hono {
  const app = new Hono();
  app.route("/api/share", shareRouter);
  return app;
}

function auth(userId: string): HeadersInit {
  return { Authorization: `Bearer ${createAuthToken(userId)}` };
}

const SNAPSHOT = {
  kind: "ai-chat-session",
  version: 1,
  title: "Оплата заказа",
  diagramFormat: "plantuml",
  source: "@startuml\nA -> B\n@enduml",
  messages: [{ role: "user", content: "Нарисуй оплату", createdAt: "2026-01-01T00:00:00.000Z" }],
  sharedAt: "2026-01-01T00:00:00.000Z",
};

describe("ai-chat share links", () => {
  const app = buildApp();

  beforeEach(() => {
    const database = createMemoryDatabase();
    database.exec(`
      CREATE TABLE share_links (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        created_by TEXT NOT NULL,
        expires_at TEXT,
        permission TEXT NOT NULL DEFAULT 'view',
        max_downloads INTEGER,
        download_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL
      );
      CREATE TABLE ai_chat_shares (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        diagram_format TEXT NOT NULL DEFAULT '',
        snapshot TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);
    seedTestUser(database, "user-1", "owner");
    seedTestUser(database, "user-2", "other");
    state.db = database;
  });

  it("requires auth to create a snapshot link", async () => {
    const response = await app.request("/api/share/ai-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "x", snapshot: SNAPSHOT }),
    });
    expect(response.status).toBe(401);
  });

  it("creates, reads publicly, and revokes only by the owner", async () => {
    const created = await app.request("/api/share/ai-chat", {
      method: "POST",
      headers: { ...auth("user-1"), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: SNAPSHOT.title,
        diagramFormat: SNAPSHOT.diagramFormat,
        snapshot: SNAPSHOT,
      }),
    });
    expect(created.status).toBe(201);
    const createdBody = (await created.json()) as { link: { token: string } };
    const token = createdBody.link.token;
    expect(token).toBeTruthy();

    const read = await app.request(`/api/share/${token}`);
    expect(read.status).toBe(200);
    const readBody = (await read.json()) as {
      resourceType: string;
      chat: { title: string };
    };
    expect(readBody.resourceType).toBe("ai-chat");
    expect(readBody.chat.title).toBe("Оплата заказа");

    const foreignRevoke = await app.request(`/api/share/${token}`, {
      method: "DELETE",
      headers: auth("user-2"),
    });
    expect(foreignRevoke.status).toBe(403);

    const revoked = await app.request(`/api/share/${token}`, {
      method: "DELETE",
      headers: auth("user-1"),
    });
    expect(revoked.status).toBe(200);

    const afterRevoke = await app.request(`/api/share/${token}`);
    expect(afterRevoke.status).toBe(404);
  });
});
