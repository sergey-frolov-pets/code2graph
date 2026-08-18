import { describe, expect, it } from "vitest";
import {
  detectLanguageFromPath,
  isSupportedSourcePath,
  shouldExcludePath,
} from "@/services/code-graph/ingest/exclude-patterns";
import { pythonLanguagePlugin } from "@/services/code-graph/languages/python";
import { resetLanguageParseCounters } from "@/services/code-graph/languages/types";
import { analyzeProject } from "@/services/code-graph/pipeline/analyze-project";
import { generateCodeGraphDiagram } from "@/services/code-graph/pipeline/generate-diagram";

describe("code-graph exclude patterns", () => {
  it("excludes node_modules and venv paths", () => {
    expect(shouldExcludePath("node_modules/lodash/index.js")).toBe(true);
    expect(shouldExcludePath("src/venv/lib/python3.12/site.py")).toBe(true);
    expect(shouldExcludePath("src/app.py")).toBe(false);
  });

  it("detects supported languages", () => {
    expect(detectLanguageFromPath("src/main.py")).toBe("python");
    expect(detectLanguageFromPath("src/App.tsx")).toBe("typescript");
    expect(isSupportedSourcePath("README.md")).toBe(false);
  });
});

describe("python parser", () => {
  it("extracts classes, methods, imports and docstrings", () => {
    resetLanguageParseCounters();
    const source = `"""Module doc"""
import os

class Greeter:
    """Says hello"""

    def hello(self, name: str) -> str:
        return greet(name)
`;

    const parsed = pythonLanguagePlugin.parseFile({
      id: "file-1",
      path: "greeter.py",
      relativePath: "greeter.py",
      language: "python",
      content: source,
    });

    expect(parsed.imports.some((entry) => entry.target === "os")).toBe(true);
    expect(parsed.symbols.some((symbol) => symbol.kind === "class" && symbol.name === "Greeter")).toBe(true);
    expect(parsed.notes.some((note) => note.kind === "docstring")).toBe(true);
    expect(parsed.flows.length).toBeGreaterThan(0);
  });
});

describe("code-graph pipeline", () => {
  it("generates folder and class PlantUML from project", async () => {
    const project = await analyzeProject({
      rootName: "demo",
      sourceKind: "zip",
      files: [
        {
          relativePath: "models/user.py",
          content: "class User:\n    def __init__(self, name: str):\n        self.name = name\n",
        },
      ],
    });

    const folder = generateCodeGraphDiagram({
      project,
      diagramType: "folder",
      selectedFileIds: project.files.map((file) => file.id),
      selectedSymbolIds: [],
    });

    expect(folder.plantUml).toContain("@startuml");
    expect(folder.plantUml).toContain("models");

    const classDiagram = generateCodeGraphDiagram({
      project,
      diagramType: "class",
      selectedFileIds: project.files.map((file) => file.id),
      selectedSymbolIds: [],
    });

    expect(classDiagram.plantUml.toLowerCase()).toContain("user");
  });
});
