import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
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
  }),
);

app.get("/api/health", (context) => {
  return context.json({ ok: true, service: "vueplantuml-library-api" });
});

app.route("/api/sections", sectionsRouter);
app.route("/api/diagrams", diagramsRouter);
app.route("/api/llm", llmRouter);

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
