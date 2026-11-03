import { Hono } from "hono";
import { getRequestUser, type AuthVariables } from "../auth/context.js";
import { requireAuthenticatedUser } from "../auth.js";
import { isAdmin } from "../authz.js";
import { getDb } from "../db.js";
import type { UserRole } from "../types.js";
import {
  createUser,
  deleteUser,
  listUsers,
  setUserBlocked,
  setUserSubscription,
  updateUser,
} from "../users.js";

export const adminRouter = new Hono<{ Variables: AuthVariables }>();

adminRouter.use("*", async (context, next) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  if (!isAdmin(user)) {
    return context.json({ error: "Admin access required" }, 403);
  }

  await next();
});

adminRouter.get("/users", (context) => {
  const database = getDb();
  return context.json({ users: listUsers(database) });
});

adminRouter.post("/users", async (context) => {
  const body = await context.req.json<{
    username?: string;
    password?: string;
    role?: UserRole;
    subscriptionActive?: boolean;
  }>();

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return context.json({ error: "Логин и пароль обязательны" }, 400);
  }

  const role = body.role === "admin" ? "admin" : "user";
  const database = getDb();

  try {
    const user = await createUser(
      database,
      username,
      password,
      role,
      Boolean(body.subscriptionActive),
    );
    return context.json({ user }, 201);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось создать пользователя";
    return context.json({ error: message }, 400);
  }
});

adminRouter.put("/users/:id", async (context) => {
  const userId = context.req.param("id");
  const body = await context.req.json<{
    username?: string;
    password?: string;
    role?: UserRole;
    blocked?: boolean;
    subscriptionActive?: boolean;
  }>();
  const database = getDb();
  const currentUser = getRequestUser(context)!;

  if (userId === currentUser.id && body.blocked) {
    return context.json({ error: "Cannot block yourself" }, 400);
  }

  if (userId === currentUser.id && body.role && body.role !== "admin") {
    return context.json({ error: "Cannot remove your own admin role" }, 400);
  }

  try {
    const updated = await updateUser(database, userId, body);
    if (!updated) {
      return context.json({ error: "User not found" }, 404);
    }
    return context.json({ user: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось обновить пользователя";
    return context.json({ error: message }, 400);
  }
});

adminRouter.delete("/users/:id", (context) => {
  const userId = context.req.param("id");
  const database = getDb();
  const currentUser = getRequestUser(context)!;

  if (userId === currentUser.id) {
    return context.json({ error: "Cannot delete yourself" }, 400);
  }

  const result = deleteUser(database, userId);
  if (result.error) {
    return context.json({ error: result.error }, 400);
  }
  if (!result.deleted) {
    return context.json({ error: "User not found" }, 404);
  }

  return context.json({ ok: true });
});

adminRouter.put("/users/:id/block", async (context) => {
  const userId = context.req.param("id");
  const body = await context.req.json<{ blocked?: boolean }>();
  const database = getDb();
  const currentUser = getRequestUser(context)!;

  if (userId === currentUser.id && body.blocked) {
    return context.json({ error: "Cannot block yourself" }, 400);
  }

  const updated = setUserBlocked(database, userId, Boolean(body.blocked));
  if (!updated) {
    return context.json({ error: "User not found" }, 404);
  }

  return context.json({ user: updated });
});

adminRouter.put("/users/:id/subscription", async (context) => {
  const userId = context.req.param("id");
  const body = await context.req.json<{ subscriptionActive?: boolean }>();
  const database = getDb();
  const updated = setUserSubscription(
    database,
    userId,
    Boolean(body.subscriptionActive),
  );

  if (!updated) {
    return context.json({ error: "User not found" }, 404);
  }

  return context.json({ user: updated });
});
