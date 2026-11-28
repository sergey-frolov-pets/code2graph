import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { convertTool, lossLabel } from "./convert.js";

const PLANTUML = `@startuml
actor User
User -> Web : open
Web -> Api : GET /items
@enduml`;

const MERMAID = `sequenceDiagram
  User->>Web: open
  Web->>Api: GET /items
`;

const D2 = `User -> Web: open
Web -> Api: GET /items
`;

describe("convertTool", () => {
  it("converts plantuml to mermaid", async () => {
    const result = await convertTool({ source: PLANTUML, from: "plantuml", to: "mermaid" });
    assert.equal(result.ok, true);
    assert.equal(result.blocked, false);
    assert.equal(result.from, "plantuml");
    assert.equal(result.to, "mermaid");
    assert.ok(result.text && result.text.trim().length > 0);
    assert.ok(result.level);
  });

  it("converts mermaid to d2", async () => {
    const result = await convertTool({ source: MERMAID, from: "mermaid", to: "d2" });
    assert.equal(result.ok, true);
    assert.ok(result.text && result.text.includes("->"));
  });

  it("converts d2 to plantuml", async () => {
    const result = await convertTool({ source: D2, from: "d2", to: "plantuml" });
    assert.equal(result.ok, true);
    assert.ok(result.text && result.text.includes("@startuml"));
  });

  it("labels every loss in the requested locale", async () => {
    const ru = await convertTool({ source: PLANTUML, from: "plantuml", to: "mermaid", locale: "ru" });
    const en = await convertTool({ source: PLANTUML, from: "plantuml", to: "mermaid", locale: "en" });

    assert.ok(ru.losses.length > 0, "expected at least one loss");
    for (const loss of ru.losses) {
      assert.ok(loss.label.length > 0);
      assert.ok(!loss.label.startsWith("conversion.loss."));
    }
    sharedIds(ru, en);
  });

  it("rejects formats outside the text subset", async () => {
    const result = await convertTool({ source: PLANTUML, from: "graphml", to: "mermaid" });
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /Supported: plantuml, mermaid, d2/);
    assert.equal(result.text, undefined);
  });

  it("rejects the same source and target", async () => {
    const result = await convertTool({ source: PLANTUML, from: "plantuml", to: "plantuml" });
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /both/);
  });

  it("rejects empty source", async () => {
    const result = await convertTool({ source: "   ", from: "plantuml", to: "mermaid" });
    assert.equal(result.ok, false);
    assert.match(result.error ?? "", /empty/i);
  });

  it("falls back to the raw id for unknown loss labels", () => {
    assert.equal(lossLabel("layout", "ru"), "Автоматическая раскладка вместо исходных координат");
    assert.equal(lossLabel("no-such-loss", "ru"), "no-such-loss");
  });
});

function sharedIds(a: { losses: Array<{ id: string }> }, b: { losses: Array<{ id: string }> }): void {
  assert.deepEqual(
    a.losses.map((loss) => loss.id),
    b.losses.map((loss) => loss.id),
    "locale must not change the set of losses",
  );
}
