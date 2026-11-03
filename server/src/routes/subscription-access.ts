import { Hono } from "hono";
import { getDb } from "../db.js";
import { collectSectionSubtree } from "../shared/section-tree.js";
import {
  enrichDiagramForUser,
  mapDiagram,
  mapDiagramListItem,
} from "../shared/diagram-mappers.js";
import {
  getSubscriptionByShareToken,
  mapSubscriptionDto,
  subscriptionIncludesDiagram,
  subscriptionIncludesSection,
} from "../subscriptions.js";
import type { SectionRow } from "../types.js";
import { PERMISSION_RANK } from "../subscriptions.js";
import type { SectionAccessPermission } from "../types.js";

export const subscriptionAccessRouter = new Hono();

function canDownloadFromPermission(permission: SectionAccessPermission): boolean {
  return PERMISSION_RANK[permission] >= PERMISSION_RANK.download;
}

subscriptionAccessRouter.get("/:token", (context) => {
  const token = context.req.param("token");
  const database = getDb();
  const row = getSubscriptionByShareToken(database, token);

  if (!row) {
    return context.json({ error: "Подписка не найдена или ссылка недоступна" }, 404);
  }

  const subscription = mapSubscriptionDto(database, row);
  const primaryTarget =
    subscription.diagrams.length === 1 && subscription.sections.length === 0
      ? { type: "diagram" as const, id: subscription.diagrams[0].diagramId }
      : subscription.sections.length === 1 && subscription.diagrams.length === 0
        ? { type: "section" as const, id: subscription.sections[0].sectionId }
        : null;

  return context.json({
    subscription,
    primaryTarget,
    canDownload: canDownloadFromPermission(subscription.permission),
    readOnly: subscription.permission !== "contribute",
  });
});

subscriptionAccessRouter.get("/:token/diagrams/:id/preview", (context) => {
  const token = context.req.param("token");
  const diagramId = context.req.param("id");
  const database = getDb();
  const row = getSubscriptionByShareToken(database, token);

  if (!row) {
    return context.json({ error: "Подписка не найдена или ссылка недоступна" }, 404);
  }

  if (!subscriptionIncludesDiagram(database, row.id, diagramId)) {
    return context.json({ error: "Диаграмма не входит в подписку" }, 403);
  }

  const diagramRow = database
    .prepare(
      `SELECT id, section_id, title, description, tags, language,
              source, file_name, byte_size, author_id, owner_id, visibility,
              created_at, updated_at
       FROM diagrams WHERE id = ?`,
    )
    .get(diagramId) as Parameters<typeof mapDiagram>[0] | undefined;

  if (!diagramRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  const permission = mapSubscriptionDto(database, row).permission;
  const diagram = mapDiagram(diagramRow);

  return context.json({
    subscription: mapSubscriptionDto(database, row),
    diagram,
    watermarkedPreview: true,
    canDownload: canDownloadFromPermission(permission),
    readOnly: permission !== "contribute",
  });
});

subscriptionAccessRouter.get("/:token/diagrams/:id", (context) => {
  const token = context.req.param("token");
  const diagramId = context.req.param("id");
  const database = getDb();
  const row = getSubscriptionByShareToken(database, token);

  if (!row) {
    return context.json({ error: "Подписка не найдена или ссылка недоступна" }, 404);
  }

  if (!subscriptionIncludesDiagram(database, row.id, diagramId)) {
    return context.json({ error: "Диаграмма не входит в подписку" }, 403);
  }

  const diagramRow = database
    .prepare(
      `SELECT id, section_id, title, description, tags, language,
              source, file_name, byte_size, author_id, owner_id, visibility,
              created_at, updated_at
       FROM diagrams WHERE id = ?`,
    )
    .get(diagramId) as Parameters<typeof mapDiagram>[0] | undefined;

  if (!diagramRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  const permission = mapSubscriptionDto(database, row).permission;
  const diagram = mapDiagram(diagramRow);
  const hideSource = !canDownloadFromPermission(permission);

  return context.json({
    subscription: mapSubscriptionDto(database, row),
    diagram: hideSource ? { ...diagram, source: "" } : diagram,
    watermarkedPreview: hideSource,
    canDownload: canDownloadFromPermission(permission),
    readOnly: permission !== "contribute",
  });
});

subscriptionAccessRouter.get("/:token/sections/:sectionId/diagrams", (context) => {
  const token = context.req.param("token");
  const sectionId = context.req.param("sectionId");
  const database = getDb();
  const row = getSubscriptionByShareToken(database, token);

  if (!row) {
    return context.json({ error: "Подписка не найдена или ссылка недоступна" }, 404);
  }

  if (!subscriptionIncludesSection(database, row.id, sectionId)) {
    return context.json({ error: "Раздел не входит в подписку" }, 403);
  }

  const section = database
    .prepare(
      `SELECT id, parent_id, title, sort_order, kind, owner_id, author_id,
              visibility, created_at, updated_at
       FROM sections WHERE id = ?`,
    )
    .get(sectionId) as SectionRow | undefined;

  if (!section) {
    return context.json({ error: "Раздел не найден" }, 404);
  }

  const allSections = database
    .prepare("SELECT id, parent_id FROM sections")
    .all() as Array<{ id: string; parent_id: string | null }>;

  const subtreeIds = [
    ...collectSectionSubtree(sectionId, allSections.map((entry) => ({
      id: entry.id,
      parentId: entry.parent_id,
    }))),
  ];

  const diagramRows = database
    .prepare(
      `SELECT id, section_id, title, description, tags, language,
              file_name, byte_size, author_id, owner_id, visibility,
              created_at, updated_at
       FROM diagrams
       WHERE section_id IN (${subtreeIds.map(() => "?").join(", ")})
       ORDER BY updated_at DESC`,
    )
    .all(...subtreeIds) as Array<Parameters<typeof mapDiagramListItem>[0]>;

  const subscription = mapSubscriptionDto(database, row);
  const diagrams = diagramRows.map((entry) => mapDiagramListItem(entry));

  return context.json({
    subscription,
    sectionId,
    section: {
      id: section.id,
      parentId: section.parent_id,
      title: section.title,
      sortOrder: section.sort_order,
      kind: section.kind,
      ownerId: section.owner_id,
      authorId: section.author_id,
      visibility: section.visibility,
      createdAt: section.created_at,
      updatedAt: section.updated_at,
    },
    diagrams,
    canDownload: canDownloadFromPermission(subscription.permission),
    readOnly: subscription.permission !== "contribute",
  });
});
