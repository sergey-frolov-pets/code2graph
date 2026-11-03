import type Database from "better-sqlite3";
import {
  createDiagramVersion,
  deleteDiagramVersion,
  getDiagramVersion,
  listDiagramVersions,
  snapshotDiagramSourceVersion,
  type DiagramVersionRow,
} from "../diagram-versions.js";
import { findDiagramById, updateDiagramSource } from "./diagrams-service.js";

export {
  createDiagramVersion,
  deleteDiagramVersion,
  getDiagramVersion,
  listDiagramVersions,
  snapshotDiagramSourceVersion,
  type DiagramVersionRow,
};

export function restoreDiagramVersion(
  database: Database.Database,
  diagramId: string,
  versionId: string,
  userId: string,
): { diagram: NonNullable<ReturnType<typeof findDiagramById>>; version: DiagramVersionRow } | null {
  const diagram = findDiagramById(database, diagramId);
  if (!diagram) {
    return null;
  }

  const version = getDiagramVersion(database, diagramId, versionId);
  if (!version) {
    return null;
  }

  snapshotDiagramSourceVersion(
    database,
    diagramId,
    userId,
    diagram.source,
    `Before restore v${version.version_number}`,
  );

  const byteSize = Buffer.byteLength(version.source, "utf8");
  const now = new Date().toISOString();
  const updated = updateDiagramSource(database, diagramId, version.source, byteSize, now);

  if (!updated) {
    return null;
  }

  return { diagram: updated, version };
}
