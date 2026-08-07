import { Hono } from "hono";
import { createAuthToken } from "../auth/token.js";
import { getDb } from "../db.js";
import { ensurePersonalSection } from "../personal-sections.js";
import { createUser, needsSetup } from "../users.js";

export const publicAuthRouter = new Hono();

publicAuthRouter.get("/status", (context) => {
  const database = getDb();
  return context.json({ needsSetup: needsSetup(database) });
});

publicAuthRouter.post("/setup", async (context) => {
  const database = getDb();

  if (!needsSetup(database)) {
    return context.json({ error: "Библиотека уже настроена" }, 409);
  }

  const body = await context.req.json<{
    username?: string;
    password?: string;
  }>();

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return context.json({ error: "Логин и пароль обязательны" }, 400);
  }

  try {
    const user = await createUser(database, username, password, "admin", true);
    ensurePersonalSection(database, user);
    const token = createAuthToken(user.id);

    return context.json({
      token,
      user,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось создать администратора";
    return context.json({ error: message }, 400);
  }
});
