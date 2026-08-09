import { describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import {
  canDownloadFromShareLink,
  mapShareLinkDto,
  recordShareDownload,
} from "./share-link-policy.js";
import type { ShareLinkRow } from "./types.js";

function createShareLinkRow(
  overrides: Partial<ShareLinkRow> = {},
): ShareLinkRow {
  return {
    id: "link-1",
    token: "abc123",
    resource_type: "diagram",
    resource_id: "d1",
    created_by: "user-1",
    expires_at: null,
    permission: "download",
    max_downloads: 5,
    download_count: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function createShareDatabase(): Database.Database {
  const database = new Database(":memory:");
  database.exec(`
    CREATE TABLE share_links (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      created_by TEXT NOT NULL,
      expires_at TEXT,
      permission TEXT NOT NULL,
      max_downloads INTEGER,
      download_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
  return database;
}

describe("share-link-policy", () => {
  it("maps share link dto with remaining downloads", () => {
    const dto = mapShareLinkDto(createShareLinkRow({ download_count: 2 }), "/s");
    expect(dto.downloadsRemaining).toBe(3);
    expect(dto.urlPath).toBe("/s?share=abc123");
    expect(dto.permanent).toBe(true);
  });

  it("allows download when under limit", () => {
    expect(canDownloadFromShareLink(createShareLinkRow())).toBe(true);
  });

  it("blocks download when limit reached", () => {
    expect(
      canDownloadFromShareLink(
        createShareLinkRow({ download_count: 5, max_downloads: 5 }),
      ),
    ).toBe(false);
  });

  it("blocks view-only permission", () => {
    expect(
      canDownloadFromShareLink(
        createShareLinkRow({ permission: "view" }),
      ),
    ).toBe(false);
  });

  it("records download and increments counter", () => {
    const database = createShareDatabase();
    database
      .prepare(
        `INSERT INTO share_links (id, token, resource_type, resource_id, created_by,
         expires_at, permission, max_downloads, download_count, created_at)
         VALUES (?, ?, 'diagram', 'd1', 'user-1', NULL, 'download', 2, 0, ?)`,
      )
      .run("link-1", "tok", "2026-01-01T00:00:00.000Z");

    const first = recordShareDownload(database, "tok");
    expect(first?.download_count).toBe(1);

    const second = recordShareDownload(database, "tok");
    expect(second?.download_count).toBe(2);

    expect(recordShareDownload(database, "tok")).toBeNull();
  });
});
