import { requireAuthenticatedUser } from "../../auth.js";
import { canReadDiagram, canWriteDiagram } from "../../authz.js";
import { getDb } from "../../db.js";
import { enrichDiagramForUser } from "../../shared/diagram-mappers.js";
import {
  addDiagramFavorite,
  removeDiagramFavorite,
} from "../../favorites.js";
import { getDiagramAccessContext } from "../../services/diagrams-access.js";
import type { DiagramsRouter } from "./types.js";

export function registerDiagramFavoriteRoutes(router: DiagramsRouter): void {
  router.post("/:id/favorite", (context) => {
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

    addDiagramFavorite(database, user.id, diagramId);
    const diagram = enrichDiagramForUser(database, user, contextRow.row);
    diagram.canWrite = canWriteDiagram(database, user, contextRow.access);

    return context.json(diagram);
  });

  router.delete("/:id/favorite", (context) => {
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

    removeDiagramFavorite(database, user.id, diagramId);
    const diagram = enrichDiagramForUser(database, user, contextRow.row);
    diagram.canWrite = canWriteDiagram(database, user, contextRow.access);

    return context.json(diagram);
  });
}
