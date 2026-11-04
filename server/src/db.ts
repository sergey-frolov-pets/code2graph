import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { AUTH_TOKEN_SECRET, DB_PATH } from "./config.js";
import {
  initializeBaseSchema,
  runMigrations,
  seedInitialData,
} from "./migrations/schema-migrations.js";
import type { SectionRow } from "./types.js";

const DEFAULT_DEV_AUTH_SECRET = "code2graph-dev-auth-secret-change-me";

let db: Database.Database | null = null;

function ensureDataDir(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  ensureDataDir();
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  initializeBaseSchema(db);
  runMigrations(db);
  seedInitialData(db);

  if (AUTH_TOKEN_SECRET === DEFAULT_DEV_AUTH_SECRET) {
    console.warn(
      "[library-api] Using default AUTH_TOKEN_SECRET. Set AUTH_TOKEN_SECRET in production.",
    );
  }

  return db;
}

export function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((tag): tag is string => typeof tag === "string");
  } catch {
    return [];
  }
}

export function getUsernameMap(
  database: Database.Database,
  userIds: string[],
): Map<string, string> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return new Map();
  }

  const placeholders = uniqueIds.map(() => "?").join(", ");
  const rows = database
    .prepare(
      `SELECT id, username FROM users WHERE id IN (${placeholders})`,
    )
    .all(...uniqueIds) as Array<{ id: string; username: string }>;

  return new Map(rows.map((row) => [row.id, row.username]));
}

export type { SectionRow };
