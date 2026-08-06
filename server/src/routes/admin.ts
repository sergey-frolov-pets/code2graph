import { Hono } from "hono";
import { getRequestUser, type AuthVariables } from "../auth/context.js";
import { requireAuthenticatedUser } from "../auth.js";
import { isAdmin } from "../authz.js";
import { getDb } from "../db.js";
import {
  listUsers,
  setUserBlocked,
  setUserSubscription,
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
