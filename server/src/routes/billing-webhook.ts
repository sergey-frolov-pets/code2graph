import { Hono } from "hono";
import { LAVA_WEBHOOK_KEY } from "../config.js";
import { getDb } from "../db.js";
import { applyLavaNotice, secretsMatch } from "../billing/service.js";

export const lavaWebhookRouter = new Hono();

lavaWebhookRouter.post("/webhook", async (context) => {
  const provided = context.req.header("X-Api-Key") ?? "";
  if (!LAVA_WEBHOOK_KEY || !secretsMatch(provided, LAVA_WEBHOOK_KEY)) {
    return context.json({ error: "unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await context.req.json();
  } catch {
    return context.json({ ok: true, ignored: true });
  }

  const database = getDb();
  const result = database.transaction(() => applyLavaNotice(database, body))();
  return context.json({ ok: true, result });
});
