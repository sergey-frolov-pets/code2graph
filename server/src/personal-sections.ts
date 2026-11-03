import type Database from "better-sqlite3";
import type { SectionRow, UserDto } from "./types.js";

const PERSONAL_SECTION_TITLE_PREFIX = "Мои";

export function ensurePersonalSection(
  database: Database.Database,
  user: UserDto,
): SectionRow {
  const existing = database
    .prepare(
      `SELECT id, parent_id, title, sort_order, kind, owner_id, author_id,
              visibility, created_at, updated_at
       FROM sections
       WHERE kind = 'personal' AND owner_id = ?`,
    )
    .get(user.id) as SectionRow | undefined;

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const title = `${PERSONAL_SECTION_TITLE_PREFIX} (${user.username})`;

  database
    .prepare(
      `INSERT INTO sections (
        id, parent_id, title, sort_order, kind, owner_id, author_id,
        visibility, created_at, updated_at
      ) VALUES (?, NULL, ?, 1000, 'personal', ?, ?, 'personal', ?, ?)`,
    )
    .run(id, title, user.id, user.id, now, now);

  return database
    .prepare(
      `SELECT id, parent_id, title, sort_order, kind, owner_id, author_id,
              visibility, created_at, updated_at
       FROM sections WHERE id = ?`,
    )
    .get(id) as SectionRow;
}

export function getSharedRootSection(database: Database.Database): SectionRow | null {
  const row = database
    .prepare(
      `SELECT id, parent_id, title, sort_order, kind, owner_id, author_id,
              visibility, created_at, updated_at
       FROM sections
       WHERE kind = 'shared' AND parent_id IS NULL
       ORDER BY sort_order ASC
       LIMIT 1`,
    )
    .get() as SectionRow | undefined;

  return row ?? null;
}
