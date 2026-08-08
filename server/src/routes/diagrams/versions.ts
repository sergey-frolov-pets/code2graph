import { requireAuthenticatedUser } from "../../auth.js";
import { canReadDiagram, canWriteDiagram } from "../../authz.js";
import { getDb, getUsernameMap } from "../../db.js";
import { enrichDiagramForUser } from "../../shared/diagram-mappers.js";
import {
  canManageDiagramVersions,
  createDiagramVersion,
  deleteDiagramVersion,
  getDiagramVersion,
  listDiagramVersions,
  mapDiagramVersionDto,
  snapshotDiagramSourceVersion,
} from "../../diagram-versions.js";
import { getDiagramAccessContext } from "../../services/diagrams-access.js";
import type { DiagramsRouter } from "./types.js";

export function registerDiagramVersionRoutes(router: DiagramsRouter): void {
  router.get("/:id/versions", (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }

    const diagramId = context.req.param("id");
    const database = getDb();
    const contextRow = getDiagramAccessContext(database, diagramId);

    if (!contextRow) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    if (!canReadDiagram(database, user, contextRow.access)) {
      return context.json({ error: "Диаграмма недоступна" }, 403);
    }

    const rows = listDiagramVersions(database, diagramId);
    const usernameMap = getUsernameMap(
      database,
      rows.map((row) => row.author_id),
    );

    return context.json({
      versions: rows.map((row) =>
        mapDiagramVersionDto(row, usernameMap.get(row.author_id)),
      ),
    });
  });

  router.post("/:id/versions", async (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }

    const diagramId = context.req.param("id");
    const body = await context.req.json<{ source?: string; comment?: string }>();
    const database = getDb();
    const contextRow = getDiagramAccessContext(database, diagramId);

    if (!contextRow) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    const canWrite = canWriteDiagram(database, user, contextRow.access);
    if (
      !canManageDiagramVersions(user, {
        author_id: contextRow.row.author_id,
      }, canWrite)
    ) {
      return context.json({ error: "Недостаточно прав" }, 403);
    }

    const source = body.source?.trim() || contextRow.row.source;
    if (!source) {
      return context.json({ error: "Исходный код обязателен" }, 400);
    }

    const version = createDiagramVersion(
      database,
      diagramId,
      user.id,
      source,
      body.comment ?? "",
    );

    return context.json(
      {
        version: mapDiagramVersionDto(version, user.username),
      },
      201,
    );
  });

  router.delete("/:id/versions/:versionId", (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }

    const diagramId = context.req.param("id");
    const versionId = context.req.param("versionId");
    const database = getDb();
    const contextRow = getDiagramAccessContext(database, diagramId);

    if (!contextRow) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    const canWrite = canWriteDiagram(database, user, contextRow.access);
    if (
      !canManageDiagramVersions(user, {
        author_id: contextRow.row.author_id,
      }, canWrite)
    ) {
      return context.json({ error: "Недостаточно прав" }, 403);
    }

    const deleted = deleteDiagramVersion(database, diagramId, versionId);
    if (!deleted) {
      return context.json({ error: "Версия не найдена" }, 404);
    }

    return context.json({ ok: true });
  });

  router.post("/:id/versions/:versionId/restore", async (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }

    const diagramId = context.req.param("id");
    const versionId = context.req.param("versionId");
    const database = getDb();
    const contextRow = getDiagramAccessContext(database, diagramId);

    if (!contextRow) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    if (!canWriteDiagram(database, user, contextRow.access)) {
      return context.json({ error: "Недостаточно прав" }, 403);
    }

    const version = getDiagramVersion(database, diagramId, versionId);
    if (!version) {
      return context.json({ error: "Версия не найдена" }, 404);
    }

    snapshotDiagramSourceVersion(
      database,
      diagramId,
      user.id,
      contextRow.row.source,
      `Before restore v${version.version_number}`,
    );

    const byteSize = Buffer.byteLength(version.source, "utf8");
    const now = new Date().toISOString();

    database
      .prepare(
        `UPDATE diagrams
       SET source = ?, byte_size = ?, updated_at = ?
       WHERE id = ?`,
      )
      .run(version.source, byteSize, now, diagramId);

    const refreshed = getDiagramAccessContext(database, diagramId);
    if (!refreshed) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    const diagram = enrichDiagramForUser(database, user, refreshed.row);
    diagram.canWrite = true;

    return context.json(diagram);
  });
}
