import type Database from "better-sqlite3";
import type { ShareLinkRow, SharePermission } from "./types.js";

export interface CreateShareLinkOptions {
  expiresAt: string | null;
  permission?: SharePermission;
  maxDownloads?: number | null;
}

export function mapShareLinkDto(
  link: ShareLinkRow,
  basePath = "",
): {
  token: string;
  resourceType: ShareLinkRow["resource_type"];
  resourceId: string;
  expiresAt: string | null;
  permanent: boolean;
  permission: SharePermission;
  maxDownloads: number | null;
  downloadCount: number;
  downloadsRemaining: number | null;
  createdAt: string;
  urlPath: string;
} {
  const downloadsRemaining =
    link.max_downloads === null
      ? null
      : Math.max(0, link.max_downloads - link.download_count);

  return {
    token: link.token,
    resourceType: link.resource_type,
    resourceId: link.resource_id,
    expiresAt: link.expires_at,
    permanent: !link.expires_at,
    permission: link.permission,
    maxDownloads: link.max_downloads,
    downloadCount: link.download_count,
    downloadsRemaining,
    createdAt: link.created_at,
    urlPath: `${basePath}?share=${link.token}`,
  };
}

export function canDownloadFromShareLink(link: ShareLinkRow): boolean {
  if (link.permission !== "download") {
    return false;
  }

  if (link.max_downloads === null) {
    return true;
  }

  return link.download_count < link.max_downloads;
}

export function recordShareDownload(
  database: Database.Database,
  token: string,
): ShareLinkRow | null {
  const link = database
    .prepare(
      `SELECT id, token, resource_type, resource_id, created_by, expires_at,
              permission, max_downloads, download_count, created_at
       FROM share_links WHERE token = ?`,
    )
    .get(token) as ShareLinkRow | undefined;

  if (!link) {
    return null;
  }

  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
    return null;
  }

  if (!canDownloadFromShareLink(link)) {
    return null;
  }

  database
    .prepare(
      "UPDATE share_links SET download_count = download_count + 1 WHERE token = ?",
    )
    .run(token);

  return database
    .prepare(
      `SELECT id, token, resource_type, resource_id, created_by, expires_at,
              permission, max_downloads, download_count, created_at
       FROM share_links WHERE token = ?`,
    )
    .get(token) as ShareLinkRow;
}
