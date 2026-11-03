import { Hono } from "hono";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const AGENT_TOKEN = "test-agent-token-1234567890";

async function loadAgentRouter(options: {
  token?: string;
  allowPublic?: boolean;
}) {
  vi.resetModules();
  vi.stubEnv("AGENT_API_TOKEN", options.token ?? "");
  vi.stubEnv("AGENT_API_ALLOW_PUBLIC", options.allowPublic ? "true" : "");
  const { agentRouter } = await import("./agent.js");
  const app = new Hono();
  app.route("/api/agent", agentRouter);
  return app;
}

describe("agent diagram routes", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("lists the site languages when a token is configured", async () => {
    const app = await loadAgentRouter({ token: AGENT_TOKEN });
    const response = await app.request("/api/agent/formats", {
      headers: { Authorization: `Bearer ${AGENT_TOKEN}` },
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      formats: Array<{ format: string }>;
    };
    expect(body.formats.map((item) => item.format)).toContain("structurizr");
    expect(body.formats.map((item) => item.format)).toContain("d2");
  });

  it("scaffolds a D2 diagram from a request", async () => {
    const app = await loadAgentRouter({ token: AGENT_TOKEN });
    const response = await app.request("/api/agent/diagrams/scaffold", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AGENT_TOKEN}`,
      },
      body: JSON.stringify({ request: "d2 sequence for checkout", locale: "en" }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { format: string; source: string };
    expect(body.format).toBe("d2");
    expect(body.source).toContain("sequence_diagram");
  });

  it("rejects an unknown format", async () => {
    const app = await loadAgentRouter({ token: AGENT_TOKEN });
    const response = await app.request("/api/agent/diagrams/plan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AGENT_TOKEN}`,
      },
      body: JSON.stringify({ request: "hello", format: "dot" }),
    });
    expect(response.status).toBe(400);
  });

  it("is closed when no token is configured", async () => {
    const app = await loadAgentRouter({});
    const response = await app.request("/api/agent/formats");
    expect(response.status).toBe(401);
  });

  it("requires the token when one is configured", async () => {
    const app = await loadAgentRouter({ token: AGENT_TOKEN });
    const response = await app.request("/api/agent/formats", {
      headers: { Authorization: "Bearer wrong-token" },
    });
    expect(response.status).toBe(401);
  });

  it("opens only with an explicit public opt-in", async () => {
    const app = await loadAgentRouter({ allowPublic: true });
    const response = await app.request("/api/agent/formats");
    expect(response.status).toBe(200);
  });
});
