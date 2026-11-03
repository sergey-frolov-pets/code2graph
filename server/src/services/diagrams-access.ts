import type Database from "better-sqlite3";
import {
  canDownloadDiagram,
  canWriteDiagram,
} from "../authz.js";
import { getDb } from "../db.js";
import { mapDiagram } from "../shared/diagram-mappers.js";
import { DIAGRAM_FULL_SELECT } from "./diagrams-list-query.js";
import type { DiagramVisibility } from "../types.js";
import type { UserDto } from "../types.js";

export type DiagramRow = Parameters<typeof mapDiagram>[0];

export interface DiagramAccessContext {
  row: DiagramRow;
  access: {
    id: string;
    section_id: string | null;
    author_id: string | null;
    owner_id: string | null;
    visibility: DiagramVisibility;
  };
}

export function toDiagramAccessRow(row: {
  id: string;
  section_id: string | null;
  author_id: string | null;
  owner_id: string | null;
  visibility: string;
}): DiagramAccessContext["access"] {
  return {
    id: row.id,
    section_id: row.section_id,
    author_id: row.author_id,
    owner_id: row.owner_id,
    visibility: row.visibility as DiagramVisibility,
  };
}

export function applyDiagramPermissions(
  database: Database.Database,
  user: UserDto,
  row: Parameters<typeof toDiagramAccessRow>[0],
  diagram: { canWrite?: boolean; canDownload?: boolean },
): void {
  const access = toDiagramAccessRow(row);
  diagram.canWrite = canWriteDiagram(database, user, access);
  diagram.canDownload = canDownloadDiagram(database, user, access);
}

export function getDiagramAccessContext(
  database: Database.Database,
  diagramId: string,
): DiagramAccessContext | null {
  const row = database
    .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
    .get(diagramId) as DiagramRow | undefined;

  if (!row) {
    return null;
  }

  return {
    row,
    access: toDiagramAccessRow(row),
  };
}

export function getDiagramRow(
  diagramId: string,
  database: Database.Database = getDb(),
): DiagramRow | undefined {
  return database
    .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
    .get(diagramId) as DiagramRow | undefined;
}
