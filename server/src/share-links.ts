import crypto from "node:crypto";
import type Database from "better-sqlite3";
import type { ShareLinkRow, ShareResourceType } from "./types.js";

const SHARE_TOKEN_BYTES = 8;

export function generateShareToken(): string {
  return crypto.randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
}

export function createShareLink(
  database: Database.Database,
  resourceType: ShareResourceType,
  resourceId: string,
  createdBy: string,
  expiresAt: string | null,
): ShareLinkRow {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const token = generateShareToken();

  database
    .prepare(
      `INSERT INTO share_links (
        id, token, resource_type, resource_id, created_by, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, token, resourceType, resourceId, createdBy, expiresAt, now);

  return database
    .prepare(
      `SELECT id, token, resource_type, resource_id, created_by, expires_at, created_at
       FROM share_links WHERE id = ?`,
    )
    .get(id) as ShareLinkRow;
}

export function getShareLinkByToken(
  database: Database.Database,
  token: string,
): ShareLinkRow | null {
  const row = database
    .prepare(
      `SELECT id, token, resource_type, resource_id, created_by, expires_at, created_at
       FROM share_links WHERE token = ?`,
    )
    .get(token) as ShareLinkRow | undefined;

  if (!row) {
    return null;
  }

  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return null;
  }

  return row;
}

export function deleteShareLink(
  database: Database.Database,
  token: string,
): boolean {
  const result = database
    .prepare("DELETE FROM share_links WHERE token = ?")
    .run(token);
  return result.changes > 0;
}

export function listShareLinksForResource(
  database: Database.Database,
  resourceType: ShareResourceType,
  resourceId: string,
): ShareLinkRow[] {
  return database
    .prepare(
      `SELECT id, token, resource_type, resource_id, created_by, expires_at, created_at
       FROM share_links
       WHERE resource_type = ? AND resource_id = ?
       ORDER BY created_at DESC`,
    )
    .all(resourceType, resourceId) as ShareLinkRow[];
}
