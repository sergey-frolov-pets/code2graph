import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveLlmPage } from "../../../packages/shared/src/llm-pages.js";
import { readLlmPageFile } from "./llm-page-file.js";

describe("mcp syntax pages", () => {
  it("returns the root index without card bodies", () => {
    const page = resolveLlmPage({ request: "" });
    const text = readLlmPageFile(page.path);
    assert.match(text, /PlantUML/);
    assert.equal(text.includes("=40 : Q1"), false);
  });

  it("returns one ext page and does not inline the shared rules", () => {
    const page = resolveLlmPage({ language: "mermaid", request: "waterfall" });
    const text = readLlmPageFile(page.path);
    assert.match(text, /^waterfall/m);
    assert.equal(text.includes("selects the Mermaid Ext type"), false);
    const shared = readLlmPageFile("./shared.md", page.path);
    assert.match(shared, /selects the Mermaid Ext type/);
  });

  it("rejects a path that leaves the catalog", () => {
    const text = readLlmPageFile("../agent-diagram.ts", "index.md");
    assert.match(text, /Unknown page/);
  });
});
