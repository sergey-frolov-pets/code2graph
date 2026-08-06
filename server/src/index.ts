import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { libraryAuthMiddleware } from "./auth.js";
import { SERVER_PORT } from "./config.js";
import { getDb } from "./db.js";
import { diagramsRouter, sectionsRouter } from "./routes/library.js";
import { llmRouter } from "./routes/llm.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

const protectedApi = new Hono();
protectedApi.use("*", libraryAuthMiddleware);

protectedApi.get("/health", (context) => {
  return context.json({ ok: true, service: "vueplantuml-library-api" });
});

protectedApi.route("/sections", sectionsRouter);
protectedApi.route("/diagrams", diagramsRouter);
protectedApi.route("/llm", llmRouter);

app.route("/api", protectedApi);

getDb();

serve(
  {
    fetch: app.fetch,
    port: SERVER_PORT,
  },
  (info) => {
    console.log(`Library API listening on http://localhost:${info.port}`);
  },
);
