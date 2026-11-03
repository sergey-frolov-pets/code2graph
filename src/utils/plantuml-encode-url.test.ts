import { describe, expect, it } from "vitest";
import { encodePlantUmlSource } from "@/utils/plantuml-encode";

describe("plantuml online URL safety", () => {
  it("does not place unescaped ? in the encoded path segment", async () => {
    let questionMarkCount = 0;

    for (let index = 0; index < 500; index += 1) {
      const lines = Array.from(
        { length: index % 40 },
        (_, lineIndex) => `Actor${lineIndex} -> Actor${lineIndex + 1}: msg${index}`,
      );
      const source = ["@startuml", ...lines, "@enduml"].join("\n");
      const encoded = await encodePlantUmlSource(source);

      if (encoded.includes("?")) {
        questionMarkCount += 1;
      }
    }

    expect(questionMarkCount).toBe(0);
  });

  it("renders encoded diagrams through plantuml.com", async () => {
    const source = "@startuml\nAlice -> Bob: hello\n@enduml";
    const encoded = await encodePlantUmlSource(source);
    const url = `https://www.plantuml.com/plantuml/svg/~1${encoded}`;
    const response = await fetch(url);

    expect(response.ok).toBe(true);
    const body = await response.text();
    expect(body.trim().startsWith("<")).toBe(true);
  });
});
