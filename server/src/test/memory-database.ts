import Database from "better-sqlite3";

export function createMemoryDatabase(): Database.Database {
  const database = new Database(":memory:");
  database.pragma("foreign_keys = ON");

  database.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      blocked INTEGER NOT NULL DEFAULT 0,
      subscription_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE sections (
      id TEXT PRIMARY KEY,
      parent_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      kind TEXT NOT NULL DEFAULT 'shared',
      owner_id TEXT,
      author_id TEXT,
      visibility TEXT NOT NULL DEFAULT 'all',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE diagrams (
      id TEXT PRIMARY KEY,
      section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '[]',
      language TEXT NOT NULL DEFAULT 'plantuml',
      content_locale TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL,
      file_name TEXT NOT NULL,
      byte_size INTEGER NOT NULL,
      author_id TEXT,
      owner_id TEXT,
      visibility TEXT NOT NULL DEFAULT 'all',
      avg_rating REAL,
      vote_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE diagram_versions (
      id TEXT PRIMARY KEY,
      diagram_id TEXT NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      comment TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL,
      author_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      UNIQUE(diagram_id, version_number)
    );
  `);

  return database;
}

export function seedTestUser(
  database: Database.Database,
  id = "user-1",
  username = "tester",
): void {
  const now = "2026-01-01T00:00:00.000Z";
  database
    .prepare(
      `INSERT INTO users (id, username, password_hash, role, blocked, subscription_active, created_at, updated_at)
       VALUES (?, ?, ?, 'user', 0, 1, ?, ?)`,
    )
    .run(id, username, "hash", now, now);
}

export function seedTestSection(
  database: Database.Database,
  id = "section-1",
  ownerId = "user-1",
): void {
  const now = "2026-01-01T00:00:00.000Z";
  database
    .prepare(
      `INSERT INTO sections (id, parent_id, title, sort_order, kind, owner_id, author_id, visibility, created_at, updated_at)
       VALUES (?, NULL, 'Test Section', 0, 'personal', ?, ?, 'personal', ?, ?)`,
    )
    .run(id, ownerId, ownerId, now, now);
}

export interface SeedDiagramInput {
  id?: string;
  sectionId?: string | null;
  title?: string;
  source?: string;
  authorId?: string;
  ownerId?: string;
  visibility?: string;
}

export function seedTestDiagram(
  database: Database.Database,
  input: SeedDiagramInput = {},
): string {
  const now = "2026-01-01T00:00:00.000Z";
  const id = input.id ?? crypto.randomUUID();
  const source = input.source ?? "@startuml\nA -> B\n@enduml";
  const byteSize = Buffer.byteLength(source, "utf8");

  database
    .prepare(
      `INSERT INTO diagrams (
        id, section_id, title, description, tags, language, content_locale,
        source, file_name, byte_size, author_id, owner_id, visibility,
        created_at, updated_at
      ) VALUES (?, ?, ?, '', '[]', 'plantuml', '', ?, 'diagram.puml', ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.sectionId ?? null,
      input.title ?? "Test Diagram",
      source,
      byteSize,
      input.authorId ?? "user-1",
      input.ownerId ?? "user-1",
      input.visibility ?? "personal",
      now,
      now,
    );

  return id;
}
