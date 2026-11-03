import crypto from "node:crypto";
import type Database from "better-sqlite3";
import { DEFAULT_SHARE_MAX_DOWNLOADS } from "./types.js";
import type { ShareLinkRow, ShareResourceType, SharePermission } from "./types.js";

const SHARE_TOKEN_BYTES = 8;

export function generateShareToken(): string {
  return crypto.randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
}

export interface CreateShareLinkInput {
  expiresAt: string | null;
  permission?: SharePermission;
  maxDownloads?: number | null;
}

export function createShareLink(
  database: Database.Database,
  resourceType: ShareResourceType,
  resourceId: string,
  createdBy: string,
  input: CreateShareLinkInput,
): ShareLinkRow {
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const token = generateShareToken();
  const permission = input.permission ?? "view";
  const maxDownloads =
    permission === "download"
      ? input.maxDownloads ?? DEFAULT_SHARE_MAX_DOWNLOADS
      : null;

  database
    .prepare(
      `INSERT INTO share_links (
        id, token, resource_type, resource_id, created_by, expires_at,
        permission, max_downloads, download_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    )
    .run(
      id,
      token,
      resourceType,
      resourceId,
      createdBy,
      input.expiresAt,
      permission,
      maxDownloads,
      now,
    );

  return database
    .prepare(
      `SELECT id, token, resource_type, resource_id, created_by, expires_at,
              permission, max_downloads, download_count, created_at
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
      `SELECT id, token, resource_type, resource_id, created_by, expires_at,
              permission, max_downloads, download_count, created_at
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
      `SELECT id, token, resource_type, resource_id, created_by, expires_at,
              permission, max_downloads, download_count, created_at
       FROM share_links
       WHERE resource_type = ? AND resource_id = ?
       ORDER BY created_at DESC`,
    )
    .all(resourceType, resourceId) as ShareLinkRow[];
}
