import type Database from "better-sqlite3";
import {
  BILLING_CLOUD_DIAGRAMS,
  BILLING_CLOUD_SECTIONS,
  BILLING_FREE_DIAGRAMS,
  BILLING_FREE_SECTIONS,
  BILLING_FREE_SHARE_LINKS,
  BILLING_FREE_SHARE_MAX_DAYS,
  BILLING_FREE_VERSIONS,
  BILLING_TOKEN_PACK_MAX_OUTPUT_TOKENS,
  BILLING_TOKEN_PACK_RATE_PER_MINUTE,
} from "./constants.js";
import { userHasAiAccess, userHasCloudAccess } from "./service.js";
import { LLM_MAX_OUTPUT_TOKENS, LLM_RATE_LIMIT_PER_MINUTE } from "../config.js";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface ShareLimitInput {
  expiresAt: string | null;
  permission: string;
}

export function cloudLimits(database: Database.Database, userId: string): {
  diagrams: number;
  sections: number;
  shareLinks: number | null;
  shareMaxDays: number | null;
  versions: number | null;
  permanentShare: boolean;
  downloadShare: boolean;
} {
  if (userHasCloudAccess(database, userId)) {
    return {
      diagrams: BILLING_CLOUD_DIAGRAMS,
      sections: BILLING_CLOUD_SECTIONS,
      shareLinks: null,
      shareMaxDays: null,
      versions: null,
      permanentShare: true,
      downloadShare: true,
    };
  }
  return {
    diagrams: BILLING_FREE_DIAGRAMS,
    sections: BILLING_FREE_SECTIONS,
    shareLinks: BILLING_FREE_SHARE_LINKS,
    shareMaxDays: BILLING_FREE_SHARE_MAX_DAYS,
    versions: BILLING_FREE_VERSIONS,
    permanentShare: false,
    downloadShare: false,
  };
}

export function diagramQuotaError(database: Database.Database, userId: string): string | null {
  const limits = cloudLimits(database, userId);
  const row = database
    .prepare("SELECT COUNT(*) AS count FROM diagrams WHERE owner_id = ?")
    .get(userId) as { count: number };
  if (row.count >= limits.diagrams) {
    return `Лимит облачных диаграмм: ${limits.diagrams}`;
  }
  return null;
}

export function sectionQuotaError(database: Database.Database, userId: string): string | null {
  const limits = cloudLimits(database, userId);
  const row = database
    .prepare(
      `SELECT COUNT(*) AS count FROM sections WHERE owner_id = ? AND kind = 'personal'`,
    )
    .get(userId) as { count: number };
  if (row.count >= limits.sections) {
    return `Лимит разделов: ${limits.sections}`;
  }
  return null;
}

export function shareQuotaError(
  database: Database.Database,
  userId: string,
  input: ShareLimitInput,
): string | null {
  const limits = cloudLimits(database, userId);
  if (!limits.downloadShare && input.permission !== "view") {
    return "Скачивание по ссылке входит в пакет Cloud";
  }
  if (!input.expiresAt) {
    if (!limits.permanentShare) {
      return "Постоянная ссылка входит в пакет Cloud";
    }
  } else if (limits.shareMaxDays !== null) {
    const ttl = new Date(input.expiresAt).getTime() - Date.now();
    if (ttl > limits.shareMaxDays * MS_PER_DAY) {
      return `Срок ссылки не длиннее ${limits.shareMaxDays} дней`;
    }
  }
  if (limits.shareLinks !== null) {
    const row = database
      .prepare(
        `SELECT COUNT(*) AS count FROM share_links
         WHERE created_by = ? AND (expires_at IS NULL OR expires_at > ?)`,
      )
      .get(userId, new Date().toISOString()) as { count: number };
    if (row.count >= limits.shareLinks) {
      return `Лимит активных ссылок: ${limits.shareLinks}`;
    }
  }
  return null;
}

export function versionListLimit(database: Database.Database, ownerId: string | null): number | null {
  if (!ownerId) {
    return null;
  }
  return cloudLimits(database, ownerId).versions;
}

export function llmAccessFor(database: Database.Database, userId: string): {
  subscribed: boolean;
  ratePerMinute: number;
  maxOutputTokens: number;
} {
  const subscribed = userHasAiAccess(database, userId);
  return {
    subscribed,
    ratePerMinute: subscribed ? LLM_RATE_LIMIT_PER_MINUTE : BILLING_TOKEN_PACK_RATE_PER_MINUTE,
    maxOutputTokens: subscribed ? LLM_MAX_OUTPUT_TOKENS : BILLING_TOKEN_PACK_MAX_OUTPUT_TOKENS,
  };
}
