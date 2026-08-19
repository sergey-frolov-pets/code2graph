import { describe, expect, it } from "vitest";
import { codeGraphRouter, CODE_GRAPH_PRO_SKU } from "./code-graph.js";

describe("code-graph routes", () => {
  it("returns free/pro limits", async () => {
    const response = await codeGraphRouter.request("/limits", {
      method: "GET",
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { sku: string; free: { maxFiles: number } };
    expect(body.sku).toBe(CODE_GRAPH_PRO_SKU);
    expect(body.free.maxFiles).toBe(1);
  });
});
