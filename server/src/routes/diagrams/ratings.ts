import { requireAuthenticatedUser } from "../../auth.js";
import { canReadDiagram, canWriteDiagram } from "../../authz.js";
import { getDb } from "../../db.js";
import { enrichDiagramForUser } from "../../shared/diagram-mappers.js";
import {
  canModerateRatingComment,
  canEditOrDeleteRating,
  deleteDiagramRating,
  listApprovedRatingComments,
  listPendingRatingCommentsForAuthor,
  moderateDiagramRatingComment,
  updateDiagramRatingByModerator,
  upsertOwnDiagramRatingComment,
  upsertOwnDiagramStars,
} from "../../ratings.js";
import { getDiagramAccessContext } from "../../services/diagrams-access.js";
import type { DiagramsRouter } from "./types.js";

export function registerDiagramRatingRoutes(router: DiagramsRouter): void {
  router.get("/:id/ratings", (context) => {
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

    const approved = listApprovedRatingComments(database, contextRow.row.id);
    const pending = canModerateRatingComment(
      contextRow.row.author_id,
      user,
    )
      ? listPendingRatingCommentsForAuthor(database, contextRow.row.id)
      : [];

    return context.json({ approved, pending });
  });

  router.post("/:id/ratings/stars", async (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }

    const diagramId = context.req.param("id");
    const body = await context.req.json<{ rating?: number }>();
    const rating = Number(body.rating);

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return context.json({ error: "Оценка должна быть от 1 до 5" }, 400);
    }

    const database = getDb();
    const contextRow = getDiagramAccessContext(database, diagramId);

    if (!contextRow) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    if (!canReadDiagram(database, user, contextRow.access)) {
      return context.json({ error: "Диаграмма недоступна" }, 403);
    }

    upsertOwnDiagramStars(database, diagramId, user.id, rating);
    const refreshed = getDiagramAccessContext(database, diagramId);
    if (!refreshed) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    const diagram = enrichDiagramForUser(database, user, refreshed.row);
    diagram.canWrite = canWriteDiagram(database, user, refreshed.access);

    return context.json(diagram);
  });

  router.post("/:id/ratings/comment", async (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }

    const diagramId = context.req.param("id");
    const body = await context.req.json<{ comment?: string }>();

    const database = getDb();
    const contextRow = getDiagramAccessContext(database, diagramId);

    if (!contextRow) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    if (!canReadDiagram(database, user, contextRow.access)) {
      return context.json({ error: "Диаграмма недоступна" }, 403);
    }

    try {
      upsertOwnDiagramRatingComment(
        database,
        diagramId,
        user.id,
        body.comment ?? "",
      );
    } catch (error) {
      return context.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Сначала выберите оценку",
        },
        400,
      );
    }

    const refreshed = getDiagramAccessContext(database, diagramId);
    if (!refreshed) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    const diagram = enrichDiagramForUser(database, user, refreshed.row);
    diagram.canWrite = canWriteDiagram(database, user, refreshed.access);

    return context.json(diagram);
  });

  router.put("/:id/ratings/:ratingUserId", async (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }

    const diagramId = context.req.param("id");
    const ratingUserId = context.req.param("ratingUserId");
    const body = await context.req.json<{
      rating?: number;
      comment?: string;
      commentStatus?: string;
    }>();

    const database = getDb();
    const contextRow = getDiagramAccessContext(database, diagramId);

    if (!contextRow) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    if (!canEditOrDeleteRating(ratingUserId, user)) {
      return context.json(
        { error: "Изменение оценки доступно автору оценки или админу" },
        403,
      );
    }

    const rating = body.rating;
    if (
      rating !== undefined &&
      (!Number.isInteger(rating) || rating < 1 || rating > 5)
    ) {
      return context.json({ error: "Оценка должна быть от 1 до 5" }, 400);
    }

    const updated = updateDiagramRatingByModerator(
      database,
      diagramId,
      ratingUserId,
      user.id,
      {
        rating,
        comment: body.comment,
        commentStatus:
          body.commentStatus === "approved" ||
          body.commentStatus === "rejected" ||
          body.commentStatus === "pending" ||
          body.commentStatus === "none"
            ? body.commentStatus
            : undefined,
      },
    );

    if (!updated) {
      return context.json({ error: "Оценка не найдена" }, 404);
    }

    return context.json({ ok: true });
  });

  router.delete("/:id/ratings/:ratingUserId", (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }

    const diagramId = context.req.param("id");
    const ratingUserId = context.req.param("ratingUserId");
    const database = getDb();
    const contextRow = getDiagramAccessContext(database, diagramId);

    if (!contextRow) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    if (!canEditOrDeleteRating(ratingUserId, user)) {
      return context.json(
        { error: "Удаление оценки доступно автору оценки или админу" },
        403,
      );
    }

    const deleted = deleteDiagramRating(
      database,
      diagramId,
      ratingUserId,
      user.id,
    );

    if (!deleted) {
      return context.json({ error: "Оценка не найдена" }, 404);
    }

    return context.json({ ok: true });
  });

  router.put("/:id/ratings/:ratingUserId/moderate", async (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }

    const diagramId = context.req.param("id");
    const ratingUserId = context.req.param("ratingUserId");
    const body = await context.req.json<{ status?: string }>();
    const status = body.status;

    if (status !== "approved" && status !== "rejected") {
      return context.json({ error: "Некорректный статус модерации" }, 400);
    }

    const database = getDb();
    const contextRow = getDiagramAccessContext(database, diagramId);

    if (!contextRow) {
      return context.json({ error: "Диаграмма не найдена" }, 404);
    }

    const isAuthor =
      canModerateRatingComment(contextRow.row.author_id, user);

    if (!isAuthor) {
      return context.json({ error: "Модерация доступна автору диаграммы" }, 403);
    }

    const updated = moderateDiagramRatingComment(
      database,
      diagramId,
      ratingUserId,
      user.id,
      status,
    );

    if (!updated) {
      return context.json({ error: "Комментарий не найден" }, 404);
    }

    return context.json({ ok: true });
  });
}
