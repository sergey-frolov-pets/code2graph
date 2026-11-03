import { requireAuthenticatedUser } from "../../auth.js";
import { canReadDiagram } from "../../authz.js";
import { SHARE_LINK_DEFAULT_TTL_DAYS } from "../../config.js";
import { getDb } from "../../db.js";
import { mapDiagram } from "../../shared/diagram-mappers.js";
import {
  createShareLink,
  listShareLinksForResource,
} from "../../share-links.js";
import { mapShareLinkDto } from "../../share-link-policy.js";
import { DIAGRAM_FULL_SELECT } from "../../services/diagrams-list-query.js";
import { toDiagramAccessRow } from "../../services/diagrams-access.js";
import { isSharePermission } from "../../types.js";
import type { DiagramsRouter } from "./types.js";

/**
 * Share links expire by default (SHARE_LINK_DEFAULT_TTL_DAYS).
 * A permanent link requires an explicit `permanent: true` flag.
 */
export function resolveShareLinkExpiry(
  requestedExpiresAt: string | null | undefined,
  permanent: boolean,
  now = Date.now(),
): string | null {
  if (permanent) {
    return null;
  }

  if (typeof requestedExpiresAt === "string" && requestedExpiresAt.trim()) {
    const parsed = new Date(requestedExpiresAt);
    if (!Number.isNaN(parsed.getTime()) && parsed.getTime() > now) {
      return parsed.toISOString();
    }
  }

  return new Date(
    now + SHARE_LINK_DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function registerDiagramShareRoutes(router: DiagramsRouter): void {
  router.get("/:id/share", (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }

    const id = context.req.param("id");
    const database = getDb();
    const row = database
      .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
      .get(id) as Parameters<typeof mapDiagram>[0] | undefined;

    if (!row) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    if (!canReadDiagram(database, user, toDiagramAccessRow(row))) {
      return context.json({ error: "Недостаточно прав" }, 403);
    }

    const links = listShareLinksForResource(database, "diagram", id).map((link) =>
      mapShareLinkDto(link),
    );

    return context.json({ links });
  });

  router.post("/:id/share", async (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }

    const id = context.req.param("id");
    const body = await context.req.json<{
      expiresAt?: string | null;
      permanent?: boolean;
      permission?: string;
      maxDownloads?: number | null;
    }>();

    const database = getDb();
    const row = database
      .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
      .get(id) as Parameters<typeof mapDiagram>[0] | undefined;

    if (!row) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    if (!canReadDiagram(database, user, toDiagramAccessRow(row))) {
      return context.json({ error: "Недостаточно прав" }, 403);
    }

    const expiresAt = resolveShareLinkExpiry(body.expiresAt, body.permanent === true);

    const permission =
      body.permission && isSharePermission(body.permission)
        ? body.permission
        : "view";

    const link = createShareLink(database, "diagram", id, user.id, {
      expiresAt,
      permission,
      maxDownloads: body.maxDownloads,
    });

    return context.json(
      {
        link: mapShareLinkDto(link),
      },
      201,
    );
  });
}
