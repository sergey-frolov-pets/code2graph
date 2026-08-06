import type Database from "better-sqlite3";
import type { UserDto } from "./types.js";

export interface DiagramVersionRow {
  id: string;
  diagram_id: string;
  version_number: number;
  comment: string;
  source: string;
  author_id: string;
  created_at: string;
}

export function listDiagramVersions(
  database: Database.Database,
  diagramId: string,
): DiagramVersionRow[] {
  return database
    .prepare(
      `SELECT id, diagram_id, version_number, comment, source, author_id, created_at
       FROM diagram_versions
       WHERE diagram_id = ?
       ORDER BY version_number DESC, created_at DESC`,
    )
    .all(diagramId) as DiagramVersionRow[];
}

export function createDiagramVersion(
  database: Database.Database,
  diagramId: string,
  authorId: string,
  source: string,
  comment = "",
): DiagramVersionRow {
  const maxRow = database
    .prepare(
      "SELECT MAX(version_number) AS max_number FROM diagram_versions WHERE diagram_id = ?",
    )
    .get(diagramId) as { max_number: number | null };

  const versionNumber = (maxRow.max_number ?? 0) + 1;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  database
    .prepare(
      `INSERT INTO diagram_versions (
        id, diagram_id, version_number, comment, source, author_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, diagramId, versionNumber, comment.trim(), source, authorId, now);

  return database
    .prepare(
      `SELECT id, diagram_id, version_number, comment, source, author_id, created_at
       FROM diagram_versions WHERE id = ?`,
    )
    .get(id) as DiagramVersionRow;
}

export function getDiagramVersion(
  database: Database.Database,
  diagramId: string,
  versionId: string,
): DiagramVersionRow | null {
  const row = database
    .prepare(
      `SELECT id, diagram_id, version_number, comment, source, author_id, created_at
       FROM diagram_versions WHERE id = ? AND diagram_id = ?`,
    )
    .get(versionId, diagramId) as DiagramVersionRow | undefined;

  return row ?? null;
}

export function deleteDiagramVersion(
  database: Database.Database,
  diagramId: string,
  versionId: string,
): boolean {
  const result = database
    .prepare("DELETE FROM diagram_versions WHERE id = ? AND diagram_id = ?")
    .run(versionId, diagramId);

  return result.changes > 0;
}

export function mapDiagramVersionDto(
  row: DiagramVersionRow,
  authorName?: string | null,
): {
  id: string;
  diagramId: string;
  versionNumber: number;
  comment: string;
  source: string;
  authorId: string;
  authorName?: string | null;
  createdAt: string;
} {
  return {
    id: row.id,
    diagramId: row.diagram_id,
    versionNumber: row.version_number,
    comment: row.comment,
    source: row.source,
    authorId: row.author_id,
    authorName: authorName ?? undefined,
    createdAt: row.created_at,
  };
}

export function snapshotDiagramSourceVersion(
  database: Database.Database,
  diagramId: string,
  authorId: string,
  source: string,
  comment = "",
): DiagramVersionRow | null {
  if (!source.trim()) {
    return null;
  }

  return createDiagramVersion(database, diagramId, authorId, source, comment);
}

export function canManageDiagramVersions(
  user: UserDto,
  diagram: { author_id: string | null },
  canWrite: boolean,
): boolean {
  return canWrite || user.role === "admin" || diagram.author_id === user.id;
}
