import { Hono } from "hono";
import type { AuthVariables } from "../auth/context.js";
import { requireAuthenticatedUser } from "../auth.js";
import { canAdminSection, getSectionRow, isAdmin } from "../authz.js";
import type { UserDto } from "../types.js";
import { getDb } from "../db.js";
import {
  allowsLinkDistribution,
  allowsUserDistribution,
  ensureSubscriptionShareToken,
  listGrantedSubscriptions,
  listSubscriptionGrants,
  mapSubscriptionDto,
  replaceSubscriptionDiagrams,
  replaceSubscriptionSections,
} from "../subscriptions.js";
import type {
  SubscriptionDiagramDto,
  SubscriptionSectionDto,
} from "../types.js";
import {
  isSectionAccessPermission,
  isSubscriptionDistributionMode,
} from "../types.js";

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

function canIncludeDiagram(
  database: ReturnType<typeof getDb>,
  user: { id: string; role: string },
  diagramId: string,
): boolean {
  const row = database
    .prepare("SELECT section_id, owner_id, author_id FROM diagrams WHERE id = ?")
    .get(diagramId) as
    | { section_id: string | null; owner_id: string | null; author_id: string | null }
    | undefined;

  if (!row) {
    return false;
  }

  if (row.owner_id === user.id || row.author_id === user.id) {
    return true;
  }

  if (!row.section_id) {
    return false;
  }

  return canIncludeSection(database, user, row.section_id);
}

function parseSubscriptionSections(
  database: ReturnType<typeof getDb>,
  user: { id: string; role: string },
  raw: unknown,
): SubscriptionSectionDto[] | null {
  if (!Array.isArray(raw)) {
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

function parseSubscriptionDiagrams(
  database: ReturnType<typeof getDb>,
  user: { id: string; role: string },
  raw: unknown,
): SubscriptionDiagramDto[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const result: SubscriptionDiagramDto[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const diagramId = String((entry as { diagramId?: string }).diagramId ?? "").trim();
    if (!diagramId || !canIncludeDiagram(database, user, diagramId)) {
      return null;
    }

    result.push({ diagramId });
  }

  return result;
}

function hasSubscriptionTargets(
  sections: SubscriptionSectionDto[],
  diagrams: SubscriptionDiagramDto[],
): boolean {
  return sections.length > 0 || diagrams.length > 0;
}

function selectSubscriptionRow(database: ReturnType<typeof getDb>, id: string) {
  return database
    .prepare(
      `SELECT id, owner_id, title, description, permission, distribution_mode,
              share_token, created_at, updated_at
       FROM subscriptions WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string;
        owner_id: string;
        title: string;
        description: string;
        permission: string;
        distribution_mode: string;
        share_token: string | null;
        created_at: string;
        updated_at: string;
      }
    | undefined;
}

function userHasActiveGrant(
  database: ReturnType<typeof getDb>,
  subscriptionId: string,
  userId: string,
): boolean {
  const row = database
    .prepare(
      `SELECT expires_at FROM user_subscriptions
       WHERE subscription_id = ? AND user_id = ?`,
    )
    .get(subscriptionId, userId) as { expires_at: string | null } | undefined;

  if (!row) {
    return false;
  }

  if (!row.expires_at) {
    return true;
  }

  return new Date(row.expires_at).getTime() > Date.now();
}

subscriptionsRouter.get("/mine", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const database = getDb();
  return context.json({
    subscriptions: listGrantedSubscriptions(database, user.id),
  });
});

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
            `SELECT id, owner_id, title, description, permission, distribution_mode,
                    share_token, created_at, updated_at
             FROM subscriptions
             ORDER BY title ASC`,
          )
          .all()
      : database
          .prepare(
            `SELECT id, owner_id, title, description, permission, distribution_mode,
                    share_token, created_at, updated_at
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
    distribution_mode: string;
    share_token: string | null;
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
    distributionMode?: string;
    sections?: unknown;
    diagrams?: unknown;
  }>();

  const title = body.title?.trim() ?? "";
  if (!title) {
    return context.json({ error: "Название подписки обязательно" }, 400);
  }

  const sections = parseSubscriptionSections(getDb(), user, body.sections ?? []) ?? [];
  const diagrams = parseSubscriptionDiagrams(getDb(), user, body.diagrams ?? []) ?? [];
  if (!hasSubscriptionTargets(sections, diagrams)) {
    return context.json({ error: "Выберите хотя бы один раздел или диаграмму" }, 400);
  }

  const permission =
    body.permission && isSectionAccessPermission(body.permission)
      ? body.permission
      : "view";
  const distributionMode =
    body.distributionMode && isSubscriptionDistributionMode(body.distributionMode)
      ? body.distributionMode
      : "users";

  const database = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  database
    .prepare(
      `INSERT INTO subscriptions (
        id, owner_id, title, description, permission, distribution_mode, share_token,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    )
    .run(
      id,
      user.id,
      title,
      body.description?.trim() ?? "",
      permission,
      distributionMode,
      now,
      now,
    );

  replaceSubscriptionSections(database, id, sections);
  replaceSubscriptionDiagrams(database, id, diagrams);

  if (allowsLinkDistribution(distributionMode)) {
    ensureSubscriptionShareToken(database, id);
  }

  const row = selectSubscriptionRow(database, id);
  if (!row) {
    return context.json({ error: "Подписка не найдена" }, 500);
  }

  return context.json({ subscription: mapSubscriptionDto(database, row) }, 201);
});

subscriptionsRouter.get("/:id", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const database = getDb();
  const row = selectSubscriptionRow(database, id);

  if (!row) {
    return context.json({ error: "Подписка не найдена" }, 404);
  }

  const canRead =
    canManageSubscription(database, user.id, row.owner_id, isAdmin(user)) ||
    userHasActiveGrant(database, id, user.id);

  if (!canRead) {
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
    distributionMode?: string;
    sections?: unknown;
    diagrams?: unknown;
  }>();

  const database = getDb();
  const current = selectSubscriptionRow(database, id);

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
      : current.permission;
  const distributionMode =
    body.distributionMode && isSubscriptionDistributionMode(body.distributionMode)
      ? body.distributionMode
      : current.distribution_mode;

  let sections = mapSubscriptionDto(database, current).sections;
  let diagrams = mapSubscriptionDto(database, current).diagrams;

  if (body.sections !== undefined) {
    const parsed = parseSubscriptionSections(database, user, body.sections);
    if (!parsed) {
      return context.json({ error: "Некорректный список разделов" }, 400);
    }
    sections = parsed;
  }

  if (body.diagrams !== undefined) {
    const parsed = parseSubscriptionDiagrams(database, user, body.diagrams);
    if (!parsed) {
      return context.json({ error: "Некорректный список диаграмм" }, 400);
    }
    diagrams = parsed;
  }

  if (!hasSubscriptionTargets(sections, diagrams)) {
    return context.json({ error: "Выберите хотя бы один раздел или диаграмму" }, 400);
  }

  const now = new Date().toISOString();
  database
    .prepare(
      `UPDATE subscriptions
       SET title = ?, description = ?, permission = ?, distribution_mode = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(title, description, permission, distributionMode, now, id);

  replaceSubscriptionSections(database, id, sections);
  replaceSubscriptionDiagrams(database, id, diagrams);

  if (allowsLinkDistribution(distributionMode)) {
    ensureSubscriptionShareToken(database, id);
  } else {
    database
      .prepare("UPDATE subscriptions SET share_token = NULL WHERE id = ?")
      .run(id);
  }

  const row = selectSubscriptionRow(database, id);
  if (!row) {
    return context.json({ error: "Подписка не найдена" }, 500);
  }

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
    usernames?: string[];
    expiresAt?: string | null;
    permanent?: boolean;
  }>();

  const database = getDb();
  const current = selectSubscriptionRow(database, id);

  if (!current) {
    return context.json({ error: "Подписка не найдена" }, 404);
  }

  if (!canManageSubscription(database, user.id, current.owner_id, isAdmin(user))) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  if (!allowsUserDistribution(current.distribution_mode)) {
    return context.json({ error: "Подписка не поддерживает выдачу пользователям" }, 400);
  }

  const requestedUsernames = [
    ...(body.usernames ?? []),
    ...(body.username?.trim() ? [body.username.trim()] : []),
  ]
    .map((entry) => entry.trim())
    .filter(Boolean);

  const targetUserIds: string[] = [];
  if (body.userId?.trim()) {
    targetUserIds.push(body.userId.trim());
  }

  for (const username of requestedUsernames) {
    const target = database
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username) as { id: string } | undefined;
    if (!target) {
      return context.json({ error: `Пользователь не найден: ${username}` }, 400);
    }
    targetUserIds.push(target.id);
  }

  const uniqueTargetUserIds = [...new Set(targetUserIds)];
  if (uniqueTargetUserIds.length === 0) {
    return context.json({ error: "Укажите хотя бы одного пользователя" }, 400);
  }

  const expiresAt =
    body.permanent || body.expiresAt === null
      ? null
      : body.expiresAt ?? null;

  const now = new Date().toISOString();
  const insert = database.prepare(
    `INSERT INTO user_subscriptions (
      id, subscription_id, user_id, granted_by, expires_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(subscription_id, user_id) DO UPDATE SET
      granted_by = excluded.granted_by,
      expires_at = excluded.expires_at`,
  );

  for (const targetUserId of uniqueTargetUserIds) {
    insert.run(crypto.randomUUID(), id, targetUserId, user.id, expiresAt, now);
  }

  return context.json({
    ok: true,
    grants: listSubscriptionGrants(database, id),
  });
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
