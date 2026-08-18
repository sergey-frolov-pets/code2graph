import type { CodeFileEntry } from "@/services/code-graph/ir/code-project-ir";
import {
  buildSimpleFlowGraph,
  createEdgeId,
  createNoteId,
  createSymbolId,
  extractDocstring,
  extractLineComments,
  type LanguagePlugin,
  type ParsedFileResult,
} from "@/services/code-graph/languages/types";

const CLASS_PATTERN = /^class\s+([A-Za-z_]\w*)(?:\(([^)]*)\))?\s*:/;
const FUNCTION_PATTERN = /^(\s*)def\s+([A-Za-z_]\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/;
const IMPORT_PATTERN = /^(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/;
const CALL_PATTERN = /\b([A-Za-z_]\w+)\s*\(/g;

function parseInheritance(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  return raw
    .split(",")
    .map((part) => part.trim().split(".")?.pop() ?? part.trim())
    .filter(Boolean);
}

function extractFunctionBody(lines: string[], startIndex: number, indent: string): string[] {
  const body: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === "") {
      body.push(line);
      continue;
    }

    if (!line.startsWith(`${indent}  `) && !line.startsWith("\t")) {
      break;
    }

    body.push(line.trim());
  }

  return body;
}

export const pythonLanguagePlugin: LanguagePlugin = {
  id: "python",
  extensions: [".py"],
  parseFile(file: CodeFileEntry): ParsedFileResult {
    const result: ParsedFileResult = {
      symbols: [],
      imports: [],
      calls: [],
      notes: extractLineComments(file.content, file.id),
      flows: [],
    };
    const lines = file.content.split("\n");

    const moduleSymbol = {
      id: createSymbolId(),
      fileId: file.id,
      name: file.relativePath.split("/").pop()?.replace(/\.py$/, "") ?? "module",
      kind: "module" as const,
      lineStart: 1,
      lineEnd: lines.length,
    };
    result.symbols.push(moduleSymbol);

    lines.forEach((line, index) => {
      const importMatch = line.match(IMPORT_PATTERN);
      if (importMatch) {
        result.imports.push({
          id: createEdgeId("import"),
          sourceFileId: file.id,
          target: importMatch[1] ?? importMatch[2] ?? "",
          line: index + 1,
        });
      }

      const classMatch = line.match(CLASS_PATTERN);
      if (classMatch) {
        const classSymbol = {
          id: createSymbolId(),
          fileId: file.id,
          name: classMatch[1],
          kind: "class" as const,
          parentId: moduleSymbol.id,
          lineStart: index + 1,
          lineEnd: index + 1,
          extends: parseInheritance(classMatch[2]),
          members: [] as string[],
          metadata: { childSymbolIds: [] as string[] },
        };

        const docstring = extractDocstring(lines, index + 1);
        if (docstring) {
          result.notes.push({
            id: createNoteId(),
            fileId: file.id,
            symbolId: classSymbol.id,
            text: docstring,
            kind: "docstring",
            line: index + 2,
          });
        }

        result.symbols.push(classSymbol);
        return;
      }

      const functionMatch = line.match(FUNCTION_PATTERN);
      if (functionMatch) {
        const indent = functionMatch[1] ?? "";
        const parentClass = [...result.symbols]
          .reverse()
          .find((symbol) => symbol.kind === "class" && symbol.fileId === file.id);

        const fnSymbol = {
          id: createSymbolId(),
          fileId: file.id,
          name: functionMatch[2],
          kind: (parentClass ? "method" : "function") as "method" | "function",
          parentId: parentClass?.id ?? moduleSymbol.id,
          lineStart: index + 1,
          lineEnd: index + 1,
          members: functionMatch[3]
            ?.split(",")
            .map((part) => part.trim().split(":")[0]?.split("=")[0]?.trim())
            .filter(Boolean),
        };

        const docstring = extractDocstring(lines, index + 1);
        if (docstring) {
          result.notes.push({
            id: createNoteId(),
            fileId: file.id,
            symbolId: fnSymbol.id,
            text: docstring,
            kind: "docstring",
            line: index + 2,
          });
        }

        if (parentClass) {
          parentClass.members?.push(fnSymbol.name);
          const childIds = parentClass.metadata?.childSymbolIds as string[];
          childIds.push(fnSymbol.id);
        }

        const body = extractFunctionBody(lines, index, indent);
        fnSymbol.lineEnd = index + body.length + 1;
        result.flows.push(buildSimpleFlowGraph(fnSymbol, body));

        for (const callMatch of body.join("\n").matchAll(CALL_PATTERN)) {
          result.calls.push({
            id: createEdgeId("call"),
            sourceSymbolId: fnSymbol.id,
            targetName: callMatch[1],
            line: fnSymbol.lineStart,
          });
        }

        result.symbols.push(fnSymbol);
      }
    });

    return result;
  },
};
