import { requireAuthenticatedUser } from "../../auth.js";
import { canReadDiagram, canReadSection, getSectionRow } from "../../authz.js";
import { getDb } from "../../db.js";
import {
  enrichDiagramListForUser,
  mapDiagram,
} from "../../shared/diagram-mappers.js";
import {
  buildDiagramListQuery,
  isFavoritesList,
  parseDiagramListQuery,
} from "../../services/diagrams-list-query.js";
import { applyDiagramPermissions } from "../../services/diagrams-access.js";
import type { DiagramVisibility } from "../../types.js";
import type { DiagramsRouter } from "./types.js";

export function registerDiagramListRoutes(router: DiagramsRouter): void {
  router.get("/", (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }

    const database = getDb();
    const url = new URL(context.req.url);
    const listParams = parseDiagramListQuery(url.searchParams);
    const favoritesOnly = isFavoritesList(url.searchParams.get("sectionId")?.trim());

    if (listParams.sectionId) {
      const section = getSectionRow(database, listParams.sectionId);
      if (!section || !canReadSection(database, user, section)) {
        return context.json({ error: "Раздел не найден или недоступен" }, 403);
      }
    }

    const { sql, params } = buildDiagramListQuery(
      {
        database,
        userId: user.id,
        params: listParams,
      },
      favoritesOnly,
    );

    const rows = database.prepare(sql).all(...params) as Array<
      Parameters<typeof mapDiagram>[0]
    >;

    const readable = rows.filter((row) =>
      canReadDiagram(database, user, {
        id: row.id,
        section_id: row.section_id,
        author_id: row.author_id,
        owner_id: row.owner_id,
        visibility: row.visibility as DiagramVisibility,
      }),
    );

    const diagrams = enrichDiagramListForUser(database, user, readable).map(
      (diagram, index) => {
        const enriched = { ...diagram };
        applyDiagramPermissions(database, user, readable[index], enriched);
        return enriched;
      },
    );

    return context.json({
      diagrams,
      total: diagrams.length,
    });
  });
}
