import { parseDocument } from "htmlparser2";
import type { CodeFileEntry } from "@/services/code-graph/ir/code-project-ir";
import {
  createNoteId,
  createSymbolId,
  type LanguagePlugin,
  type ParsedFileResult,
} from "@/services/code-graph/languages/types";

export const htmlLanguagePlugin: LanguagePlugin = {
  id: "html",
  extensions: [".html", ".htm"],
  parseFile(file: CodeFileEntry): ParsedFileResult {
    const result: ParsedFileResult = {
      symbols: [],
      imports: [],
      calls: [],
      notes: [],
      flows: [],
    };
    const lines = file.content.split("\n");

    const moduleSymbol = {
      id: createSymbolId(),
      fileId: file.id,
      name: file.relativePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "page",
      kind: "module" as const,
      lineStart: 1,
      lineEnd: lines.length,
    };
    result.symbols.push(moduleSymbol);

    lines.forEach((line, index) => {
      const commentMatch = line.match(/<!--([\s\S]*?)-->/);
      if (commentMatch?.[1]?.trim()) {
        result.notes.push({
          id: createNoteId(),
          fileId: file.id,
          text: commentMatch[1].trim(),
          kind: "line",
          line: index + 1,
        });
      }
    });

    const document = parseDocument(file.content, {
      withStartIndices: true,
    });

    function walk(node: Record<string, unknown>, depth = 0): void {
      if (node.type === "tag") {
        const tagName = node.name as string;
        const startIndex = node.startIndex as number | undefined;
        const line = startIndex
          ? file.content.slice(0, startIndex).split("\n").length
          : 1;

        result.symbols.push({
          id: createSymbolId(),
          fileId: file.id,
          name: tagName,
          kind: "htmlElement",
          parentId: depth === 0 ? moduleSymbol.id : undefined,
          lineStart: line,
          lineEnd: line,
          metadata: {
            id: (node.attribs as Record<string, string> | undefined)?.id,
            className: (node.attribs as Record<string, string> | undefined)?.class,
          },
        });
      }

      const children = node.children as Record<string, unknown>[] | undefined;
      children?.forEach((child) => walk(child, depth + 1));
    }

    walk(document as unknown as Record<string, unknown>);

    return {
      symbols: result.symbols,
      imports: result.imports,
      calls: result.calls,
      notes: result.notes,
      flows: result.flows,
    };
  },
};
