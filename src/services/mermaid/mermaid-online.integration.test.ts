import { describe, expect, it } from "vitest";
import { MERMAID_ONLINE_SERVER_URL, MERMAID_ONLINE_SVG_PATH } from "@/constants/render-settings";
import { encodeMermaidStateForInk } from "@/utils/mermaid-encode";

describe("mermaid.ink integration", () => {
  it("renders encoded diagram from production encoder", async () => {
    const encoded = await encodeMermaidStateForInk("graph TD\nA-->B");
    const url = new URL(
      `${MERMAID_ONLINE_SERVER_URL}${MERMAID_ONLINE_SVG_PATH}/${encoded}`,
    );

    const response = await fetch(url, { method: "GET" });
    const body = await response.text();

    expect(response.ok).toBe(true);
    expect(body.trim().startsWith("<")).toBe(true);
  });
});
