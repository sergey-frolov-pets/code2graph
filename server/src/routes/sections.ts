import { Hono } from "hono";
import { getRequestUser, type AuthVariables } from "../auth/context.js";
import { requireAuthenticatedUser } from "../auth.js";
import {
  canAdminSection,
  canCreateChildSection,
  canReadSection,
  canWriteSection,
  defaultVisibilityForSectionKind,
  getSectionRow,
  isAdmin,
} from "../authz.js";
import { getDb } from "../db.js";
import {
  enrichSectionsForUser,
  filterReadableSectionRows,
} from "../shared/diagram-mappers.js";
import { buildTree } from "../shared/section-tree.js";
import {
  createShareLink,
  listShareLinksForResource,
} from "../share-links.js";
import { mapShareLinkDto } from "../share-link-policy.js";
import type { DiagramVisibility, SectionRow } from "../types.js";
import { isDiagramVisibility, isSharePermission } from "../types.js";

export const sectionsRouter = new Hono<{ Variables: AuthVariables }>();

const SECTION_SELECT = `
  SELECT id, parent_id, title, sort_order, kind, owner_id, author_id,
         visibility, created_at, updated_at
  FROM sections
`;

sectionsRouter.get("/", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const database = getDb();
  const rows = database
    .prepare(`${SECTION_SELECT} ORDER BY sort_order ASC, title ASC`)
    .all() as SectionRow[];

  const readable = filterReadableSectionRows(database, user, rows);
  const flat = enrichSectionsForUser(database, user, readable);
  const tree = buildTree(flat);

  return context.json({ sections: tree, flat });
});

sectionsRouter.post("/", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const body = await context.req.json<{
    title?: string;
    parentId?: string | null;
    sortOrder?: number;
    kind?: string;
    visibility?: string;
  }>();

  const title = body.title?.trim();
  if (!title) {
    return context.json({ error: "Название раздела обязательно" }, 400);
  }

  const parentId = body.parentId ?? null;
  const database = getDb();

  if (!canCreateChildSection(database, user, parentId)) {
    return context.json({ error: "Недостаточно прав для создания раздела" }, 403);
  }

  let kind: SectionRow["kind"] = "shared";
  if (parentId) {
    const parent = getSectionRow(database, parentId);
    kind = parent?.kind ?? "shared";
  } else if (body.kind === "personal" && !isAdmin(user)) {
    return context.json({ error: "Личный корневой раздел создаётся автоматически" }, 400);
  } else if (body.kind === "personal") {
    kind = "personal";
  }

  if (kind === "shared" && !isAdmin(user)) {
    return context.json({ error: "Общие разделы может создавать только администратор" }, 403);
  }

  let visibility: DiagramVisibility = defaultVisibilityForSectionKind(kind);
  if (body.visibility && isDiagramVisibility(body.visibility)) {
    visibility = body.visibility;
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const ownerId = kind === "personal" ? user.id : null;

  database
    .prepare(
      `INSERT INTO sections (
        id, parent_id, title, sort_order, kind, owner_id, author_id,
        visibility, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      parentId,
      title,
      body.sortOrder ?? 0,
      kind,
      ownerId,
      user.id,
      visibility,
      now,
      now,
    );

  const row = database
    .prepare(`${SECTION_SELECT} WHERE id = ?`)
    .get(id) as SectionRow;

  return context.json(
    enrichSectionsForUser(database, user, [row])[0],
    201,
  );
});

sectionsRouter.put("/:id", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const body = await context.req.json<{
    title?: string;
    parentId?: string | null;
    sortOrder?: number;
    visibility?: string;
  }>();

  const database = getDb();
  const current = getSectionRow(database, id);
  if (!current) {
    return context.json({ error: "Раздел не найден" }, 404);
  }

  if (!canWriteSection(database, user, current)) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  if (body.parentId === id) {
    return context.json({ error: "Раздел не может быть родителем самого себя" }, 400);
  }

  const nextParentId =
    body.parentId !== undefined ? body.parentId : current.parent_id;

  if (
    nextParentId &&
    nextParentId !== current.parent_id &&
    !canCreateChildSection(database, user, nextParentId)
  ) {
    return context.json({ error: "Недостаточно прав для перемещения раздела" }, 403);
  }

  const now = new Date().toISOString();
  let visibility = current.visibility;
  if (body.visibility && isDiagramVisibility(body.visibility)) {
    visibility = body.visibility;
  }

  database
    .prepare(
      `UPDATE sections
       SET parent_id = ?, title = ?, sort_order = ?, visibility = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      nextParentId,
      body.title?.trim() || current.title,
      body.sortOrder ?? current.sort_order,
      visibility,
      now,
      id,
    );

  const row = database
    .prepare(`${SECTION_SELECT} WHERE id = ?`)
    .get(id) as SectionRow;

  return context.json(enrichSectionsForUser(database, user, [row])[0]);
});

sectionsRouter.delete("/:id", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const database = getDb();
  const current = getSectionRow(database, id);
  if (!current) {
    return context.json({ error: "Раздел не найден" }, 404);
  }

  if (!canAdminSection(database, user, current)) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  if (current.kind === "personal" && current.owner_id === user.id) {
    return context.json({ error: "Личный раздел не может быть удалён" }, 400);
  }

  database.prepare("DELETE FROM sections WHERE id = ?").run(id);
  return context.json({ ok: true });
});

sectionsRouter.get("/:id/access", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const database = getDb();
  const section = getSectionRow(database, id);
  if (!section) {
    return context.json({ error: "Раздел не найден" }, 404);
  }

  if (!canAdminSection(database, user, section)) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  const rows = database
    .prepare(
      `SELECT sa.user_id, sa.expires_at, sa.created_at, u.username
       FROM section_access sa
       JOIN users u ON u.id = sa.user_id
       WHERE sa.section_id = ?
       ORDER BY u.username ASC`,
    )
    .all(id) as Array<{
    user_id: string;
    expires_at: string | null;
    created_at: string;
    username: string;
  }>;

  return context.json({
    access: rows.map((row) => ({
      userId: row.user_id,
      username: row.username,
      expiresAt: row.expires_at,
      permanent: !row.expires_at,
      grantedAt: row.created_at,
    })),
  });
});

sectionsRouter.post("/:id/access", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const body = await context.req.json<{
    userId?: string;
    username?: string;
    expiresAt?: string | null;
    permanent?: boolean;
  }>();

  const database = getDb();
  const section = getSectionRow(database, id);
  if (!section) {
    return context.json({ error: "Раздел не найден" }, 404);
  }

  if (!canAdminSection(database, user, section)) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  let targetUserId = body.userId?.trim();
  if (!targetUserId && body.username?.trim()) {
    const target = database
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(body.username.trim()) as { id: string } | undefined;
    targetUserId = target?.id;
  }

  if (!targetUserId) {
    return context.json({ error: "Пользователь не найден" }, 400);
  }

  const expiresAt =
    body.permanent || body.expiresAt === null
      ? null
      : body.expiresAt ?? null;

  const now = new Date().toISOString();
  const grantId = crypto.randomUUID();

  database
    .prepare(
      `INSERT INTO section_access (id, section_id, user_id, granted_by, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(section_id, user_id) DO UPDATE SET
         granted_by = excluded.granted_by,
         expires_at = excluded.expires_at`,
    )
    .run(grantId, id, targetUserId, user.id, expiresAt, now);

  return context.json({ ok: true });
});

sectionsRouter.delete("/:id/access/:userId", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const sectionId = context.req.param("id");
  const targetUserId = context.req.param("userId");
  const database = getDb();
  const section = getSectionRow(database, sectionId);
  if (!section) {
    return context.json({ error: "Раздел не найден" }, 404);
  }

  if (!canAdminSection(database, user, section)) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  database
    .prepare(
      "DELETE FROM section_access WHERE section_id = ? AND user_id = ?",
    )
    .run(sectionId, targetUserId);

  return context.json({ ok: true });
});

sectionsRouter.get("/:id/share", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const database = getDb();
  const section = getSectionRow(database, id);
  if (!section) {
    return context.json({ error: "Раздел не найден" }, 404);
  }

  if (!canReadSection(database, user, section)) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  const links = listShareLinksForResource(database, "section", id).map((link) =>
    mapShareLinkDto(link),
  );

  return context.json({ links });
});

sectionsRouter.post("/:id/share", async (context) => {
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
  const section = getSectionRow(database, id);
  if (!section) {
    return context.json({ error: "Раздел не найден" }, 404);
  }

  if (!canReadSection(database, user, section)) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  const expiresAt =
    body.permanent || body.expiresAt === null
      ? null
      : body.expiresAt ?? null;

  const permission =
    body.permission && isSharePermission(body.permission)
      ? body.permission
      : "view";

  const link = createShareLink(database, "section", id, user.id, {
    expiresAt,
    permission,
    maxDownloads: body.maxDownloads,
  });

  return context.json({
    link: mapShareLinkDto(link),
  }, 201);
});
