import { Hono } from "hono";
import {
  generateDiagramScaffold,
  isAgentDiagramLanguage,
  isAgentDiagramType,
  listDiagramFormats,
  planDiagram,
  type AgentDiagramDirection,
  type AgentDiagramLocale,
} from "../../../packages/shared/src/agent-diagram.js";
import { AGENT_API_TOKEN } from "../config.js";

export const agentRouter = new Hono();

function isAuthorized(header: string | undefined): boolean {
  if (!AGENT_API_TOKEN) {
    return true;
  }

  return header === `Bearer ${AGENT_API_TOKEN}`;
}

function readLocale(value: unknown): AgentDiagramLocale | undefined {
  return value === "ru" || value === "en" ? value : undefined;
}

function readDirection(value: unknown): AgentDiagramDirection | undefined {
  return value === "TB" || value === "LR" ? value : undefined;
}

agentRouter.use("*", async (context, next) => {
  if (!isAuthorized(context.req.header("Authorization"))) {
    return context.json({ error: "unauthorized" }, 401);
  }

  await next();
});

agentRouter.get("/formats", (context) => {
  return context.json({ formats: listDiagramFormats() });
});

agentRouter.post("/diagrams/plan", async (context) => {
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return context.json({ error: "invalid_json" }, 400);
  }

  const request = "request" in body && typeof body.request === "string"
    ? body.request
    : "";
  const format = "format" in body && typeof body.format === "string"
    ? body.format
    : undefined;
  const diagramType =
    "diagramType" in body && typeof body.diagramType === "string"
      ? body.diagramType
      : undefined;

  if (format && !isAgentDiagramLanguage(format)) {
    return context.json({ error: "unknown_format" }, 400);
  }

  if (diagramType && !isAgentDiagramType(diagramType)) {
    return context.json({ error: "unknown_diagram_type" }, 400);
  }

  return context.json(
    planDiagram({
      request,
      format,
      diagramType,
    }),
  );
});

agentRouter.post("/diagrams/scaffold", async (context) => {
  const body = await context.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return context.json({ error: "invalid_json" }, 400);
  }

  const request = "request" in body && typeof body.request === "string"
    ? body.request
    : "";
  const format = "format" in body && typeof body.format === "string"
    ? body.format
    : undefined;
  const diagramType =
    "diagramType" in body && typeof body.diagramType === "string"
      ? body.diagramType
      : undefined;
  const count = "count" in body && typeof body.count === "number"
    ? body.count
    : undefined;

  if (format && !isAgentDiagramLanguage(format)) {
    return context.json({ error: "unknown_format" }, 400);
  }

  if (diagramType && !isAgentDiagramType(diagramType)) {
    return context.json({ error: "unknown_diagram_type" }, 400);
  }

  const result = generateDiagramScaffold({
    request,
    format,
    diagramType,
    locale: readLocale("locale" in body ? body.locale : undefined),
    direction: readDirection("direction" in body ? body.direction : undefined),
    count,
  });

  return context.json({
    ...result.plan,
    source: result.scaffold.source,
    fileName: result.scaffold.fileName,
    warnings: result.scaffold.warnings,
  });
});
