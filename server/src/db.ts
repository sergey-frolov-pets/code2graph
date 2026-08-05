import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { DB_PATH } from "./config.js";

let db: Database.Database | null = null;

function ensureDataDir(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
      `INSERT INTO sections (id, parent_id, title, sort_order, created_at, updated_at)
       VALUES (?, NULL, ?, 0, ?, ?)`,
    )
    .run(rootId, "Общие", now, now);

  database
    .prepare(
      `INSERT INTO sections (id, parent_id, title, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
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
        source, file_name, byte_size, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

  seedInitialData(db);
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