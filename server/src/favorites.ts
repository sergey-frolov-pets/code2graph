import type Database from "better-sqlite3";

export function isDiagramFavorite(
  database: Database.Database,
  userId: string,
  diagramId: string,
): boolean {
  const row = database
    .prepare(
      "SELECT 1 FROM diagram_favorites WHERE user_id = ? AND diagram_id = ?",
    )
    .get(userId, diagramId) as { 1: number } | undefined;

  return Boolean(row);
}

export function listFavoriteDiagramIds(
  database: Database.Database,
  userId: string,
): string[] {
  const rows = database
    .prepare(
      "SELECT diagram_id FROM diagram_favorites WHERE user_id = ? ORDER BY created_at DESC",
    )
    .all(userId) as Array<{ diagram_id: string }>;

  return rows.map((row) => row.diagram_id);
}

export function addDiagramFavorite(
  database: Database.Database,
  userId: string,
  diagramId: string,
): void {
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT OR IGNORE INTO diagram_favorites (user_id, diagram_id, created_at)
       VALUES (?, ?, ?)`,
    )
    .run(userId, diagramId, now);
}

export function removeDiagramFavorite(
  database: Database.Database,
  userId: string,
  diagramId: string,
): void {
  database
    .prepare(
      "DELETE FROM diagram_favorites WHERE user_id = ? AND diagram_id = ?",
    )
    .run(userId, diagramId);
}

export function getFavoriteDiagramIdSet(
  database: Database.Database,
  userId: string,
  diagramIds: string[],
): Set<string> {
  if (diagramIds.length === 0) {
    return new Set();
  }

  const placeholders = diagramIds.map(() => "?").join(", ");
  const rows = database
    .prepare(
      `SELECT diagram_id FROM diagram_favorites
       WHERE user_id = ? AND diagram_id IN (${placeholders})`,
    )
    .all(userId, ...diagramIds) as Array<{ diagram_id: string }>;

  return new Set(rows.map((row) => row.diagram_id));
}
