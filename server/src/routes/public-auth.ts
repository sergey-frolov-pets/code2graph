import { Hono, type Context } from "hono";
import { createAuthToken } from "../auth/token.js";
import { REGISTRATION_ENABLED } from "../config.js";
import { getDb } from "../db.js";
import {
  buildLoginAttemptKey,
  checkLoginAttempt,
  getClientIp,
  recordLoginFailure,
} from "../login-rate-limit.js";
import { ensurePersonalSection } from "../personal-sections.js";
import { createUser, needsSetup } from "../users.js";

export const publicAuthRouter = new Hono();

function tooManyAttempts(context: Context, retryAfterSeconds: number) {
  context.header("Retry-After", String(retryAfterSeconds));
  return context.json(
    {
      error: "Слишком много попыток. Попробуйте позже",
      retryAfterSeconds,
    },
    429,
  );
}

publicAuthRouter.get("/status", (context) => {
  const database = getDb();
  return context.json({
    needsSetup: needsSetup(database),
    registrationEnabled: REGISTRATION_ENABLED && !needsSetup(database),
  });
});

publicAuthRouter.post("/setup", async (context) => {
  const database = getDb();

  if (!needsSetup(database)) {
    return context.json({ error: "Библиотека уже настроена" }, 409);
  }

  const body = await context.req
    .json<{ username?: string; password?: string }>()
    .catch(() => ({ username: undefined, password: undefined }));

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return context.json({ error: "Логин и пароль обязательны" }, 400);
  }

  const attemptKey = buildLoginAttemptKey(
    getClientIp(context.req.raw.headers),
    `setup:${username}`,
  );
  const attemptState = checkLoginAttempt(attemptKey);
  if (attemptState.blocked) {
    return tooManyAttempts(context, attemptState.retryAfterSeconds);
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
    const afterFailure = recordLoginFailure(attemptKey);
    if (afterFailure.blocked) {
      return tooManyAttempts(context, afterFailure.retryAfterSeconds);
    }

    const message =
      error instanceof Error ? error.message : "Не удалось создать администратора";
    return context.json({ error: message }, 400);
  }
});

publicAuthRouter.post("/register", async (context) => {
  const database = getDb();

  if (needsSetup(database)) {
    return context.json({ error: "Сначала создайте администратора библиотеки" }, 409);
  }

  if (!REGISTRATION_ENABLED) {
    return context.json({ error: "Регистрация отключена администратором" }, 403);
  }

  const body = await context.req
    .json<{ username?: string; password?: string }>()
    .catch(() => ({ username: undefined, password: undefined }));

  const username = body.username?.trim() ?? "";
  const password = body.password ?? "";

  if (!username || !password) {
    return context.json({ error: "Логин и пароль обязательны" }, 400);
  }

  if (password.length < 8) {
    return context.json({ error: "Пароль должен быть не короче 8 символов" }, 400);
  }

  const attemptKey = buildLoginAttemptKey(
    getClientIp(context.req.raw.headers),
    `register:${username}`,
  );
  const attemptState = checkLoginAttempt(attemptKey);
  if (attemptState.blocked) {
    return tooManyAttempts(context, attemptState.retryAfterSeconds);
  }

  try {
    const user = await createUser(database, username, password, "user", false);
    ensurePersonalSection(database, user);
    const token = createAuthToken(user.id);

    return context.json({ token, user }, 201);
  } catch (error) {
    const afterFailure = recordLoginFailure(attemptKey);
    if (afterFailure.blocked) {
      return tooManyAttempts(context, afterFailure.retryAfterSeconds);
    }

    const message =
      error instanceof Error ? error.message : "Не удалось зарегистрироваться";
    return context.json({ error: message }, 400);
  }
});
