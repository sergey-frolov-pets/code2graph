import type Database from "better-sqlite3";
import type { DiagramLanguage } from "../config.js";
import { DIAGRAM_FULL_SELECT } from "./diagrams-list-query.js";
import type { DiagramVisibility } from "../types.js";

export interface DiagramRow {
  id: string;
  section_id: string | null;
  title: string;
  description: string;
  tags: string;
  language: string;
  content_locale?: string;
  source: string;
  file_name: string;
  byte_size: number;
  author_id: string | null;
  owner_id: string | null;
  visibility: string;
  avg_rating: number | null;
  vote_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDiagramRecordInput {
  id: string;
  sectionId: string | null;
  title: string;
  description: string;
  tags: string[];
  language: DiagramLanguage | string;
  contentLocale: string;
  source: string;
  fileName: string;
  byteSize: number;
  authorId: string;
  ownerId: string;
  visibility: DiagramVisibility;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDiagramRecordInput {
  sectionId: string | null;
  title: string;
  description: string;
  tags: string[];
  language: string;
  contentLocale: string;
  source: string;
  fileName: string;
  byteSize: number;
  visibility: DiagramVisibility;
  updatedAt: string;
}

export function findDiagramById(
  database: Database.Database,
  id: string,
): DiagramRow | null {
  const row = database
    .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
    .get(id) as DiagramRow | undefined;

  return row ?? null;
}

export function insertDiagram(
  database: Database.Database,
  input: CreateDiagramRecordInput,
): DiagramRow {
  database
    .prepare(
      `INSERT INTO diagrams (
        id, section_id, title, description, tags, language, content_locale,
        source, file_name, byte_size, author_id, owner_id, visibility,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.id,
      input.sectionId,
      input.title,
      input.description,
      JSON.stringify(input.tags),
      input.language,
      input.contentLocale,
      input.source,
      input.fileName,
      input.byteSize,
      input.authorId,
      input.ownerId,
      input.visibility,
      input.createdAt,
      input.updatedAt,
    );

  return findDiagramById(database, input.id)!;
}

export function updateDiagramRecord(
  database: Database.Database,
  id: string,
  input: UpdateDiagramRecordInput,
): DiagramRow | null {
  const result = database
    .prepare(
      `UPDATE diagrams
       SET section_id = ?, title = ?, description = ?, tags = ?, language = ?,
           content_locale = ?, source = ?, file_name = ?, byte_size = ?,
           visibility = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.sectionId,
      input.title,
      input.description,
      JSON.stringify(input.tags),
      input.language,
      input.contentLocale,
      input.source,
      input.fileName,
      input.byteSize,
      input.visibility,
      input.updatedAt,
      id,
    );

  if (result.changes === 0) {
    return null;
  }

  return findDiagramById(database, id);
}

export function deleteDiagramById(
  database: Database.Database,
  id: string,
): boolean {
  const result = database.prepare("DELETE FROM diagrams WHERE id = ?").run(id);
  return result.changes > 0;
}

export function updateDiagramSource(
  database: Database.Database,
  diagramId: string,
  source: string,
  byteSize: number,
  updatedAt: string,
): DiagramRow | null {
  const result = database
    .prepare(
      `UPDATE diagrams SET source = ?, byte_size = ?, updated_at = ? WHERE id = ?`,
    )
    .run(source, byteSize, updatedAt, diagramId);

  if (result.changes === 0) {
    return null;
  }

  return findDiagramById(database, diagramId);
}
