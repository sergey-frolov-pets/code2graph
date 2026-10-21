import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { agentRouter } from "./agent.js";

function createApp(): Hono {
  const app = new Hono();
  app.route("/api/agent", agentRouter);
  return app;
}

describe("agent diagram routes", () => {
  it("lists the site languages", async () => {
    const response = await createApp().request("/api/agent/formats");
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      formats: Array<{ format: string }>;
    };
    expect(body.formats.map((item) => item.format)).toContain("structurizr");
    expect(body.formats.map((item) => item.format)).toContain("d2");
  });

  it("scaffolds a D2 diagram from a request", async () => {
    const response = await createApp().request("/api/agent/diagrams/scaffold", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: "d2 sequence for checkout", locale: "en" }),
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { format: string; source: string };
    expect(body.format).toBe("d2");
    expect(body.source).toContain("sequence_diagram");
  });

  it("rejects an unknown format", async () => {
    const response = await createApp().request("/api/agent/diagrams/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request: "hello", format: "dot" }),
    });
    expect(response.status).toBe(400);
  });
});
