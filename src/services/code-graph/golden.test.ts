import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { analyzeProject } from "@/services/code-graph/pipeline/analyze-project";
import { generateCodeGraphDiagram } from "@/services/code-graph/pipeline/generate-diagram";

describe("code-graph golden fixtures", () => {
  it("python-class-simple produces stable class diagram", async () => {
    const fixtureRoot = join(process.cwd(), "tests/fixtures/code-graph/python-class-simple");
    const source = readFileSync(join(fixtureRoot, "input/models/user.py"), "utf8");

    const project = await analyzeProject({
      rootName: "python-class-simple",
      sourceKind: "zip",
      files: [{ relativePath: "models/user.py", content: source }],
    });

    const result = generateCodeGraphDiagram({
      project,
      diagramType: "class",
      selectedFileIds: project.files.map((file) => file.id),
      selectedSymbolIds: [],
    });

    expect(result.plantUml).toMatchSnapshot();
    expect(result.plantUml.toLowerCase()).toContain("user");
  });
});
