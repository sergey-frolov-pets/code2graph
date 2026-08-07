import { Hono } from "hono";
import type { AuthVariables } from "../auth/context.js";
import { requireAuthenticatedUser } from "../auth.js";
import { canAdminSection, getSectionRow, isAdmin } from "../authz.js";
import type { UserDto } from "../types.js";
import { getDb } from "../db.js";
import {
  listSubscriptionGrants,
  mapSubscriptionDto,
  replaceSubscriptionSections,
} from "../subscriptions.js";
import type { SubscriptionSectionDto } from "../types.js";
import { isSectionAccessPermission } from "../types.js";

export const subscriptionsRouter = new Hono<{ Variables: AuthVariables }>();

function canManageSubscription(
  database: ReturnType<typeof getDb>,
  userId: string,
  ownerId: string,
  isUserAdmin: boolean,
): boolean {
  return isUserAdmin || ownerId === userId;
}

function canIncludeSection(
  database: ReturnType<typeof getDb>,
  user: { id: string; role: string },
  sectionId: string,
): boolean {
  const section = getSectionRow(database, sectionId);
  if (!section) {
    return false;
  }

  if (section.kind !== "personal") {
    return isAdmin(user as UserDto);
  }

  return canAdminSection(database, user as UserDto, section);
}

function parseSubscriptionSections(
  database: ReturnType<typeof getDb>,
  user: { id: string; role: string },
  raw: unknown,
): SubscriptionSectionDto[] | null {
  if (!Array.isArray(raw) || raw.length === 0) {
    return null;
  }

  const result: SubscriptionSectionDto[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const sectionId = String((entry as { sectionId?: string }).sectionId ?? "").trim();
    if (!sectionId || !canIncludeSection(database, user, sectionId)) {
      return null;
    }

    result.push({
      sectionId,
      includeDescendants: Boolean(
        (entry as { includeDescendants?: boolean }).includeDescendants,
      ),
    });
  }

  return result;
}

subscriptionsRouter.get("/", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const database = getDb();
  const rows = (
    isAdmin(user)
      ? database
          .prepare(
            `SELECT id, owner_id, title, description, permission, created_at, updated_at
             FROM subscriptions
             ORDER BY title ASC`,
          )
          .all()
      : database
          .prepare(
            `SELECT id, owner_id, title, description, permission, created_at, updated_at
             FROM subscriptions
             WHERE owner_id = ?
             ORDER BY title ASC`,
          )
          .all(user.id)
  ) as Array<{
    id: string;
    owner_id: string;
    title: string;
    description: string;
    permission: string;
    created_at: string;
    updated_at: string;
  }>;

  return context.json({
    subscriptions: rows.map((row) => mapSubscriptionDto(database, row)),
  });
});

subscriptionsRouter.post("/", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const body = await context.req.json<{
    title?: string;
    description?: string;
    permission?: string;
    sections?: unknown;
  }>();

  const title = body.title?.trim() ?? "";
  if (!title) {
    return context.json({ error: "Название подписки обязательно" }, 400);
  }

  const sections = parseSubscriptionSections(getDb(), user, body.sections);
  if (!sections) {
    return context.json({ error: "Выберите хотя бы один раздел" }, 400);
  }

  const permission =
    body.permission && isSectionAccessPermission(body.permission)
      ? body.permission
      : "view";

  const database = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  database
    .prepare(
      `INSERT INTO subscriptions (
        id, owner_id, title, description, permission, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      user.id,
      title,
      body.description?.trim() ?? "",
      permission,
      now,
      now,
    );

  replaceSubscriptionSections(database, id, sections);

  const row = database
    .prepare(
      `SELECT id, owner_id, title, description, permission, created_at, updated_at
       FROM subscriptions WHERE id = ?`,
    )
    .get(id) as {
    id: string;
    owner_id: string;
    title: string;
    description: string;
    permission: string;
    created_at: string;
    updated_at: string;
  };

  return context.json({ subscription: mapSubscriptionDto(database, row) }, 201);
});

subscriptionsRouter.get("/:id", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const database = getDb();
  const row = database
    .prepare(
      `SELECT id, owner_id, title, description, permission, created_at, updated_at
       FROM subscriptions WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string;
        owner_id: string;
        title: string;
        description: string;
        permission: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    return context.json({ error: "Подписка не найдена" }, 404);
  }

  if (!canManageSubscription(database, user.id, row.owner_id, isAdmin(user))) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  return context.json({ subscription: mapSubscriptionDto(database, row) });
});

subscriptionsRouter.put("/:id", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const body = await context.req.json<{
    title?: string;
    description?: string;
    permission?: string;
    sections?: unknown;
  }>();

  const database = getDb();
  const current = database
    .prepare(
      `SELECT id, owner_id, title, description, permission, created_at, updated_at
       FROM subscriptions WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string;
        owner_id: string;
        title: string;
        description: string;
        permission: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!current) {
    return context.json({ error: "Подписка не найдена" }, 404);
  }

  if (!canManageSubscription(database, user.id, current.owner_id, isAdmin(user))) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  const title = body.title?.trim() || current.title;
  const description =
    body.description !== undefined ? body.description.trim() : current.description;
  const permission =
    body.permission && isSectionAccessPermission(body.permission)
      ? body.permission
      : (current.permission as typeof body.permission);

  if (body.sections !== undefined) {
    const sections = parseSubscriptionSections(database, user, body.sections);
    if (!sections) {
      return context.json({ error: "Выберите хотя бы один раздел" }, 400);
    }
    replaceSubscriptionSections(database, id, sections);
  }

  const now = new Date().toISOString();
  database
    .prepare(
      `UPDATE subscriptions
       SET title = ?, description = ?, permission = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(title, description, permission, now, id);

  const row = database
    .prepare(
      `SELECT id, owner_id, title, description, permission, created_at, updated_at
       FROM subscriptions WHERE id = ?`,
    )
    .get(id) as {
    id: string;
    owner_id: string;
    title: string;
    description: string;
    permission: string;
    created_at: string;
    updated_at: string;
  };

  return context.json({ subscription: mapSubscriptionDto(database, row) });
});

subscriptionsRouter.delete("/:id", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const database = getDb();
  const current = database
    .prepare("SELECT owner_id FROM subscriptions WHERE id = ?")
    .get(id) as { owner_id: string } | undefined;

  if (!current) {
    return context.json({ error: "Подписка не найдена" }, 404);
  }

  if (!canManageSubscription(database, user.id, current.owner_id, isAdmin(user))) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  database.prepare("DELETE FROM subscriptions WHERE id = ?").run(id);
  return context.json({ ok: true });
});

subscriptionsRouter.get("/:id/grants", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const database = getDb();
  const current = database
    .prepare("SELECT owner_id FROM subscriptions WHERE id = ?")
    .get(id) as { owner_id: string } | undefined;

  if (!current) {
    return context.json({ error: "Подписка не найдена" }, 404);
  }

  if (!canManageSubscription(database, user.id, current.owner_id, isAdmin(user))) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  return context.json({ grants: listSubscriptionGrants(database, id) });
});

subscriptionsRouter.post("/:id/grants", async (context) => {
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
  const current = database
    .prepare("SELECT owner_id FROM subscriptions WHERE id = ?")
    .get(id) as { owner_id: string } | undefined;

  if (!current) {
    return context.json({ error: "Подписка не найдена" }, 404);
  }

  if (!canManageSubscription(database, user.id, current.owner_id, isAdmin(user))) {
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
      `INSERT INTO user_subscriptions (
        id, subscription_id, user_id, granted_by, expires_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(subscription_id, user_id) DO UPDATE SET
        granted_by = excluded.granted_by,
        expires_at = excluded.expires_at`,
    )
    .run(grantId, id, targetUserId, user.id, expiresAt, now);

  return context.json({ ok: true });
});

subscriptionsRouter.delete("/:id/grants/:userId", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const subscriptionId = context.req.param("id");
  const targetUserId = context.req.param("userId");
  const database = getDb();
  const current = database
    .prepare("SELECT owner_id FROM subscriptions WHERE id = ?")
    .get(subscriptionId) as { owner_id: string } | undefined;

  if (!current) {
    return context.json({ error: "Подписка не найдена" }, 404);
  }

  if (!canManageSubscription(database, user.id, current.owner_id, isAdmin(user))) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  database
    .prepare(
      "DELETE FROM user_subscriptions WHERE subscription_id = ? AND user_id = ?",
    )
    .run(subscriptionId, targetUserId);

  return context.json({ ok: true });
});
