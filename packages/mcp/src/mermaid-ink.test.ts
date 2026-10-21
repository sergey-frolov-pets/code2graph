import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { encodeMermaidInkPath } from "./mermaid-ink.js";

describe("mermaid.ink encoding", () => {
  it("builds a url-safe pako path", () => {
    const encoded = encodeMermaidInkPath("flowchart LR\n  A-->B");
    assert.match(encoded, /^pako:[A-Za-z0-9_-]+$/);
    assert.equal(encoded.includes("+"), false);
    assert.equal(encoded.includes("/"), false);
    assert.equal(encoded.includes("="), false);
  });
});
