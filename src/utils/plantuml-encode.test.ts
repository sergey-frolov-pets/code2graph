import { describe, expect, it } from "vitest";
import { encodePlantUmlSource } from "@/utils/plantuml-encode";

describe("encodePlantUmlSource", () => {
  it("encodes a simple diagram for plantuml.com", async () => {
    const source = "@startuml\nAlice -> Bob: hello\n@enduml";
    const encoded = await encodePlantUmlSource(source);

    expect(encoded).toBe("U9npA2v9B2efpStXSip9J4vLqBLJSCfFibB8ICt9oUToICrBAStD0G3mjmoW");
  });
});
