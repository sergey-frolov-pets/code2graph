import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthToken } from "../auth/token.js";
import { libraryAuthMiddleware } from "../auth.js";
import { MAX_LIBRARY_LINK_SNAPSHOT_BYTES } from "../config.js";
import { ensureLibraryLinkSchema } from "../migrations/schema-migrations.js";
import {
  createMemoryDatabase,
  seedTestDiagram,
  seedTestUser,
} from "../test/memory-database.js";
import { diagramsRouter } from "./diagrams/index.js";
import { libraryLinksPublicRouter } from "./library-links-public.js";

const state: { db: ReturnType<typeof createMemoryDatabase> | null } = { db: null };

vi.mock("../db.js", () => ({
  getDb: () => {
    if (!state.db) {
      throw new Error("Test database is not ready");
    }
    return state.db;
  },
}));

const GRAPHML = `<graphml><graph>
  <node id="a"><data key="d0">Start</data></node>
  <node id="b"><data key="d0">End</data></node>
  <edge source="a" target="b"/>
</graph></graphml>`;

const SNAPSHOT = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>`;

function buildApp(): Hono {
  const app = new Hono();
  app.route("/api/library-links", libraryLinksPublicRouter);
  const protectedApi = new Hono();
  protectedApi.use("*", libraryAuthMiddleware);
  protectedApi.route("/diagrams", diagramsRouter);
  app.route("/api", protectedApi);
  return app;
}

function auth(userId: string): HeadersInit {
  return { Authorization: `Bearer ${createAuthToken(userId)}` };
}

describe("library links", () => {
  const app = buildApp();
  let diagramId = "";

  beforeEach(() => {
    const database = createMemoryDatabase();
    ensureLibraryLinkSchema(database);
    seedTestUser(database, "user-1", "owner");
    seedTestUser(database, "user-2", "other");
    seedTestUser(database, "user-3", "Иван");
    diagramId = seedTestDiagram(database, {
      id: "diagram-1",
      ownerId: "user-1",
      authorId: "user-1",
      source: GRAPHML,
    });
    database.prepare("UPDATE diagrams SET language = 'graphml' WHERE id = ?").run(diagramId);
    state.db = database;
  });

  async function createLink(body: Record<string, unknown>, userId = "user-1") {
    return app.request(`/api/diagrams/${diagramId}/library-links`, {
      method: "POST",
      headers: { ...auth(userId), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("keeps several named links and rejects a taken name", async () => {
    const first = await createLink({
      slug: "alpha",
      delivery: "editor",
      dataAccess: "online",
    });
    const second = await createLink({
      slug: "beta",
      delivery: "editor",
      dataAccess: "offline",
    });
    const taken = await createLink({
      slug: "alpha",
      delivery: "editor",
      dataAccess: "online",
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(taken.status).toBe(409);

    const list = await app.request(`/api/diagrams/${diagramId}/library-links`, {
      headers: auth("user-1"),
    });
    const body = (await list.json()) as { links: Array<{ slug: string }> };
    expect(body.links.map((link) => link.slug)).toEqual(["alpha", "beta"]);
  });

  it("rejects view-only together with offline data", async () => {
    const response = await createLink({
      slug: "hidden",
      delivery: "view",
      dataAccess: "offline",
      viewRender: "snapshot",
    });
    expect(response.status).toBe(400);
  });

  it("rejects a snapshot above the size limit", async () => {
    const created = await createLink({
      slug: "poster",
      delivery: "view",
      dataAccess: "online",
      viewRender: "snapshot",
    });
    const link = (await created.json()) as { link: { id: string } };
    const response = await app.request(
      `/api/diagrams/${diagramId}/library-links/${link.link.id}/snapshot`,
      {
        method: "PUT",
        headers: { ...auth("user-1"), "Content-Type": "application/json" },
        body: JSON.stringify({ svg: "x".repeat(MAX_LIBRARY_LINK_SNAPSHOT_BYTES + 1) }),
      },
    );
    expect(response.status).toBe(413);
  });

  it("returns editor source and view svg without source", async () => {
    await createLink({
      slug: "edit-me",
      delivery: "editor",
      dataAccess: "offline",
    });
    const editor = await app.request("/api/library-links/owner/edit-me");
    const editorBody = (await editor.json()) as {
      delivery: string;
      diagram: { source: string };
    };
    expect(editor.status).toBe(200);
    expect(editorBody.delivery).toBe("editor");
    expect(editorBody.diagram.source).toContain("Start");

    const created = await createLink({
      slug: "look",
      delivery: "view",
      dataAccess: "online",
      viewRender: "snapshot",
    });
    const link = (await created.json()) as { link: { id: string } };
    const missing = await app.request("/api/library-links/owner/look");
    expect(missing.status).toBe(409);

    const saved = await app.request(
      `/api/diagrams/${diagramId}/library-links/${link.link.id}/snapshot`,
      {
        method: "PUT",
        headers: { ...auth("user-1"), "Content-Type": "application/json" },
        body: JSON.stringify({ svg: SNAPSHOT }),
      },
    );
    expect(saved.status).toBe(200);

    const view = await app.request("/api/library-links/owner/look");
    const viewBody = (await view.json()) as Record<string, unknown>;
    expect(view.status).toBe(200);
    expect(viewBody).toEqual({ delivery: "view", svg: SNAPSHOT });
    expect(viewBody).not.toHaveProperty("source");
    expect(viewBody).not.toHaveProperty("diagram");
  });

  it("renders a live view on the server without returning source", async () => {
    const created = await createLink({
      slug: "live-one",
      delivery: "view",
      dataAccess: "online",
      viewRender: "live",
    });
    expect(created.status).toBe(201);

    const view = await app.request("/api/library-links/owner/live-one");
    const body = (await view.json()) as Record<string, unknown>;
    expect(view.status).toBe(200);
    expect(String(body.svg)).toContain("Start");
    expect(body).not.toHaveProperty("source");
    expect(String(body.svg)).not.toContain("<graphml");

    state.db
      ?.prepare("UPDATE diagrams SET language = 'plantuml' WHERE id = ?")
      .run(diagramId);
    const refused = await createLink({
      slug: "plant",
      delivery: "view",
      dataAccess: "online",
      viewRender: "live",
    });
    expect(refused.status).toBe(400);
  });

  it("stores anonymized hits and shows them only to the owner", async () => {
    const created = await createLink({
      slug: "stats",
      delivery: "editor",
      dataAccess: "online",
    });
    const link = (await created.json()) as { link: { id: string } };
    const hitHeaders = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 Chrome/120.0",
      "CF-IPCountry": "RU",
      Referer: "https://news.example/path?utm_campaign=spring",
    };
    const first = await app.request("/api/library-links/owner/stats/hit", {
      method: "POST",
      headers: hitHeaders,
      body: JSON.stringify({
        sessionId: "session-aaaaaaaa",
        screenWidth: 1400,
        language: "ru-RU",
      }),
    });
    const repeat = await app.request("/api/library-links/owner/stats/hit", {
      method: "POST",
      headers: hitHeaders,
      body: JSON.stringify({
        sessionId: "session-aaaaaaaa",
        screenWidth: 1400,
        language: "ru-RU",
      }),
    });
    const bot = await app.request("/api/library-links/owner/stats/hit", {
      method: "POST",
      headers: { ...hitHeaders, "User-Agent": "Googlebot/2.1" },
      body: JSON.stringify({ sessionId: "session-bbbbbbbb", screenWidth: 1000 }),
    });
    expect(first.status).toBe(204);
    expect(repeat.status).toBe(204);
    expect(bot.status).toBe(204);

    const columns = state.db
      ?.prepare("PRAGMA table_info(library_link_hits)")
      .all() as Array<{ name: string }>;
    expect(columns?.map((column) => column.name)).not.toContain("ip");
    expect(columns?.map((column) => column.name)).not.toContain("user_agent");

    const stats = await app.request(
      `/api/diagrams/${diagramId}/library-links/${link.link.id}/stats?period=7`,
      { headers: auth("user-1") },
    );
    const statsBody = (await stats.json()) as {
      views: number;
      visitors: number;
      countries: Array<{ key: string }>;
      browsers: Array<{ key: string }>;
      systems: Array<{ key: string }>;
      languages: Array<{ key: string }>;
      sizes: Array<{ key: string }>;
      referrers: Array<{ key: string }>;
      campaigns: Array<{ key: string }>;
    };
    expect(stats.status).toBe(200);
    expect(statsBody.views).toBe(2);
    expect(statsBody.visitors).toBe(1);
    expect(statsBody.countries[0]?.key).toBe("RU");
    expect(statsBody.browsers[0]?.key).toBe("Chrome");
    expect(statsBody.systems[0]?.key).toBe("Other");
    expect(statsBody.languages[0]?.key).toBe("ru");
    expect(statsBody.sizes[0]?.key).toBe("≤1600");
    expect(statsBody.referrers[0]?.key).toBe("news.example");
    expect(statsBody.campaigns[0]?.key).toBe("spring");

    const stranger = await app.request(
      `/api/diagrams/${diagramId}/library-links/${link.link.id}/stats?period=7`,
      { headers: auth("user-2") },
    );
    const anonymous = await app.request(
      `/api/diagrams/${diagramId}/library-links/${link.link.id}/stats?period=7`,
    );
    expect(stranger.status).toBe(403);
    expect(anonymous.status).toBe(401);
  });

  it("opens a unicode username", async () => {
    const owned = seedTestDiagram(state.db!, {
      id: "diagram-ivan",
      ownerId: "user-3",
      authorId: "user-3",
    });
    const created = await app.request(`/api/diagrams/${owned}/library-links`, {
      method: "POST",
      headers: { ...auth("user-3"), "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: "plan",
        delivery: "editor",
        dataAccess: "online",
      }),
    });
    expect(created.status).toBe(201);
    const response = await app.request(
      `/api/library-links/${encodeURIComponent("Иван")}/plan`,
    );
    expect(response.status).toBe(200);
  });
});
