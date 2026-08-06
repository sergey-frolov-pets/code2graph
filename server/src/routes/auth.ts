import { Hono } from "hono";
import { getRequestUser, type AuthVariables } from "../auth/context.js";
import { requireAuthenticatedUser } from "../auth.js";
import { createAuthToken } from "../auth/token.js";
import { getDb } from "../db.js";
import { ensurePersonalSection } from "../personal-sections.js";
import { authenticateUser } from "../users.js";

export const authRouter = new Hono<{ Variables: AuthVariables }>();

authRouter.post("/login", async (context) => {
  const body = await context.req.json<{
    username?: string;
    password?: string;
  }>();

  const username = body.username?.trim();
  const password = body.password ?? "";

  if (!username || !password) {
    return context.json({ error: "Логин и пароль обязательны" }, 400);
  }

  const database = getDb();
  const user = await authenticateUser(database, username, password);
  if (!user) {
    return context.json({ error: "Неверный логин или пароль" }, 401);
  }

  ensurePersonalSection(database, user);
  const token = createAuthToken(user.id);

  return context.json({
    token,
    user,
  });
});

authRouter.get("/me", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const database = getDb();
  ensurePersonalSection(database, user);

  return context.json({ user });
});
