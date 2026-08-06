import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import {
  AUTH_TOKEN_SECRET,
  DB_PATH,
  LIBRARY_AUTH_PASSWORD,
  LIBRARY_AUTH_USERNAME,
  SHARED_SECTION_TITLE,
  isLibraryAuthEnabled,
} from "./config.js";
import { hashPassword } from "./auth/password.js";
import type { SectionRow } from "./types.js";

let db: Database.Database | null = null;
let bootstrapPromise: Promise<void> | null = null;

async function ensureBootstrapped(database: Database.Database): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapAdminUser(database);
  }
  await bootstrapPromise;
}

function ensureDataDir(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function columnExists(
  database: Database.Database,
  table: string,
  column: string,
): boolean {
  const columns = database
    .prepare(`PRAGMA table_info(${table})`)
    .all() as Array<{ name: string }>;
  return columns.some((entry) => entry.name === column);
}

function runMigrations(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      blocked INTEGER NOT NULL DEFAULT 0,
      subscription_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS section_access (
      id TEXT PRIMARY KEY,
      section_id TEXT NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      granted_by TEXT NOT NULL REFERENCES users(id),
      expires_at TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(section_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS share_links (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      created_by TEXT NOT NULL REFERENCES users(id),
      expires_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_section_access_section ON section_access(section_id);
    CREATE INDEX IF NOT EXISTS idx_section_access_user ON section_access(user_id);
    CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
    CREATE INDEX IF NOT EXISTS idx_share_links_resource ON share_links(resource_type, resource_id);
  `);

  if (!columnExists(database, "sections", "kind")) {
    database.exec(`
      ALTER TABLE sections ADD COLUMN kind TEXT NOT NULL DEFAULT 'shared';
      ALTER TABLE sections ADD COLUMN owner_id TEXT;
      ALTER TABLE sections ADD COLUMN author_id TEXT;
      ALTER TABLE sections ADD COLUMN visibility TEXT NOT NULL DEFAULT 'all';
    `);
  }

  if (!columnExists(database, "diagrams", "author_id")) {
    database.exec(`
      ALTER TABLE diagrams ADD COLUMN author_id TEXT;
      ALTER TABLE diagrams ADD COLUMN owner_id TEXT;
      ALTER TABLE diagrams ADD COLUMN visibility TEXT NOT NULL DEFAULT 'all';
    `);
  }

  if (!columnExists(database, "share_links", "permission")) {
    database.exec(`
      ALTER TABLE share_links ADD COLUMN permission TEXT NOT NULL DEFAULT 'view';
      ALTER TABLE share_links ADD COLUMN max_downloads INTEGER;
      ALTER TABLE share_links ADD COLUMN download_count INTEGER NOT NULL DEFAULT 0;
    `);
  }

  if (!columnExists(database, "diagrams", "avg_rating")) {
    database.exec(`
      ALTER TABLE diagrams ADD COLUMN avg_rating REAL;
      ALTER TABLE diagrams ADD COLUMN vote_count INTEGER NOT NULL DEFAULT 0;
    `);
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS diagram_favorites (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      diagram_id TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, diagram_id)
    );

    CREATE TABLE IF NOT EXISTS diagram_ratings (
      id TEXT PRIMARY KEY,
      diagram_id TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL DEFAULT '',
      comment_status TEXT NOT NULL DEFAULT 'none',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(diagram_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_diagram_favorites_user ON diagram_favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_diagram_ratings_diagram ON diagram_ratings(diagram_id);
  `);

  database
    .prepare("UPDATE sections SET kind = 'shared' WHERE kind IS NULL OR kind = ''")
    .run();
  database
    .prepare(
      "UPDATE sections SET visibility = 'all' WHERE visibility IS NULL OR visibility = ''",
    )
    .run();
  database
    .prepare(
      "UPDATE diagrams SET visibility = 'all' WHERE visibility IS NULL OR visibility = ''",
    )
    .run();

  const versionRow = database
    .prepare("SELECT version FROM schema_version LIMIT 1")
    .get() as { version: number } | undefined;

  if (!versionRow) {
    database.prepare("INSERT INTO schema_version (version) VALUES (1)").run();
  }
}

async function bootstrapAdminUser(database: Database.Database): Promise<void> {
  const count = database
    .prepare("SELECT COUNT(*) AS count FROM users")
    .get() as { count: number };

  if (count.count > 0) {
    return;
  }

  if (!isLibraryAuthEnabled()) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword("admin");
    database
      .prepare(
        `INSERT INTO users (
          id, username, password_hash, role, blocked, subscription_active,
          created_at, updated_at
        ) VALUES (?, 'admin', ?, 'admin', 0, 1, ?, ?)`,
      )
      .run(id, passwordHash, now, now);
    console.warn(
      "[library-api] Created default admin user (username: admin, password: admin). Change immediately.",
    );
    return;
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(LIBRARY_AUTH_PASSWORD!);
  database
    .prepare(
      `INSERT INTO users (
        id, username, password_hash, role, blocked, subscription_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, 'admin', 0, 1, ?, ?)`,
    )
    .run(id, LIBRARY_AUTH_USERNAME!, passwordHash, now, now);
}

function seedInitialData(database: Database.Database): void {
  const sectionCount = database
    .prepare("SELECT COUNT(*) AS count FROM sections")
    .get() as { count: number };

  if (sectionCount.count > 0) {
    return;
  }

  const now = new Date().toISOString();
  const rootId = crypto.randomUUID();
  const examplesId = crypto.randomUUID();

  database
    .prepare(
      `INSERT INTO sections (
        id, parent_id, title, sort_order, kind, owner_id, author_id,
        visibility, created_at, updated_at
      ) VALUES (?, NULL, ?, 0, 'shared', NULL, NULL, 'all', ?, ?)`,
    )
    .run(rootId, SHARED_SECTION_TITLE, now, now);

  database
    .prepare(
      `INSERT INTO sections (
        id, parent_id, title, sort_order, kind, owner_id, author_id,
        visibility, created_at, updated_at
      ) VALUES (?, ?, ?, 0, 'shared', NULL, NULL, 'all', ?, ?)`,
    )
    .run(examplesId, rootId, "Примеры", now, now);

  const sampleSource = `@startuml
title Пример из библиотеки

class User
class Order
User --> Order
@enduml`;

  database
    .prepare(
      `INSERT INTO diagrams (
        id, section_id, title, description, tags, language,
        source, file_name, byte_size, author_id, owner_id, visibility,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'all', ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      examplesId,
      "Классы — пример",
      "Простая диаграмма классов для демонстрации библиотеки",
      JSON.stringify(["пример", "классы"]),
      "plantuml",
      sampleSource,
      "example-classes.puml",
      Buffer.byteLength(sampleSource, "utf8"),
      now,
      now,
    );
}

export function getDb(): Database.Database {
  if (db) {
    return db;
  }

  ensureDataDir();
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      parent_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS diagrams (
      id TEXT PRIMARY KEY,
      section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      language TEXT NOT NULL DEFAULT 'plantuml',
      source TEXT NOT NULL,
      file_name TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sections_parent ON sections(parent_id);
    CREATE INDEX IF NOT EXISTS idx_diagrams_section ON diagrams(section_id);
    CREATE INDEX IF NOT EXISTS idx_diagrams_title ON diagrams(title);
  `);

  runMigrations(db);
  seedInitialData(db);

  bootstrapPromise = bootstrapAdminUser(db);

  if (AUTH_TOKEN_SECRET === "vueplantuml-dev-auth-secret-change-me") {
    console.warn(
      "[library-api] Using default AUTH_TOKEN_SECRET. Set AUTH_TOKEN_SECRET in production.",
    );
  }

  return db;
}

export async function ensureDbBootstrapped(): Promise<void> {
  const database = getDb();
  await ensureBootstrapped(database);
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
