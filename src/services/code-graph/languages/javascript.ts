import { parse } from "@babel/parser";
import type { CodeFileEntry } from "@/services/code-graph/ir/code-project-ir";
import {
  buildSimpleFlowGraph,
  createEdgeId,
  createSymbolId,
  extractLineComments,
  type LanguagePlugin,
  type ParsedFileResult,
} from "@/services/code-graph/languages/types";

function parseWithBabel(source: string, isTypeScript: boolean) {
  return parse(source, {
    sourceType: "module",
    plugins: isTypeScript
      ? ["typescript", "jsx", "decorators-legacy", "classProperties"]
      : ["jsx"],
    errorRecovery: true,
    allowReturnOutsideFunction: true,
  });
}

function walkAst(
  node: Record<string, unknown>,
  file: CodeFileEntry,
  result: ParsedFileResult,
  moduleId: string,
  parentClassId?: string,
): void {
  const type = node.type as string | undefined;
  if (!type) {
    return;
  }

  const loc = node.loc as { start?: { line?: number }; end?: { line?: number } } | undefined;
  const startLine = loc?.start?.line ?? 1;
  const endLine = loc?.end?.line ?? startLine;

  if (type === "ImportDeclaration" || type === "Import") {
    const sourceValue = (node.source as { value?: string } | undefined)?.value;
    if (sourceValue) {
      result.imports.push({
        id: createEdgeId("import"),
        sourceFileId: file.id,
        target: sourceValue,
        line: startLine,
      });
    }
  }

  if (type === "ClassDeclaration" || type === "ClassExpression") {
    const idNode = node.id as { name?: string } | null;
    const classSymbol = {
      id: createSymbolId(),
      fileId: file.id,
      name: idNode?.name ?? "AnonymousClass",
      kind: "class" as const,
      parentId: moduleId,
      lineStart: startLine,
      lineEnd: endLine,
      extends: [] as string[],
      implements: [] as string[],
      members: [] as string[],
      metadata: { childSymbolIds: [] as string[] },
    };

    const superClass = node.superClass as { name?: string } | undefined;
    if (superClass?.name) {
      classSymbol.extends.push(superClass.name);
    }

    result.symbols.push(classSymbol);

    for (const key of Object.keys(node)) {
      const value = node[key];
      if (value && typeof value === "object") {
        if (Array.isArray(value)) {
          value.forEach((child) => {
            if (child && typeof child === "object") {
              walkAst(child as Record<string, unknown>, file, result, moduleId, classSymbol.id);
            }
          });
        } else {
          walkAst(value as Record<string, unknown>, file, result, moduleId, classSymbol.id);
        }
      }
    }
    return;
  }

  if (
    type === "FunctionDeclaration" ||
    type === "FunctionExpression" ||
    type === "ArrowFunctionExpression"
  ) {
    const idNode = node.id as { name?: string } | null;
    const keyNode = node.key as { name?: string } | undefined;
    const fnName = idNode?.name ?? keyNode?.name ?? "anonymous";

    const fnSymbol = {
      id: createSymbolId(),
      fileId: file.id,
      name: fnName,
      kind: (parentClassId ? "method" : "function") as "method" | "function",
      parentId: parentClassId ?? moduleId,
      lineStart: startLine,
      lineEnd: endLine,
    };

    if (parentClassId) {
      const parent = result.symbols.find((symbol) => symbol.id === parentClassId);
      parent?.members?.push(fnName);
      const childIds = parent?.metadata?.childSymbolIds as string[] | undefined;
      childIds?.push(fnSymbol.id);
    }

    result.symbols.push(fnSymbol);
    result.flows.push(
      buildSimpleFlowGraph(fnSymbol, [`function ${fnName}()`]),
    );
  }

  if (type === "CallExpression") {
    const callee = node.callee as { name?: string; property?: { name?: string } };
    const targetName = callee?.name ?? callee?.property?.name;
    if (targetName) {
      const lastFn = [...result.symbols]
        .reverse()
        .find((symbol) => symbol.kind === "function" || symbol.kind === "method");
      if (lastFn) {
        result.calls.push({
          id: createEdgeId("call"),
          sourceSymbolId: lastFn.id,
          targetName,
          line: startLine,
        });
      }
    }
  }

  for (const key of Object.keys(node)) {
    const value = node[key];
    if (!value || typeof value !== "object") {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((child) => {
        if (child && typeof child === "object") {
          walkAst(child as Record<string, unknown>, file, result, moduleId, parentClassId);
        }
      });
    } else {
      walkAst(value as Record<string, unknown>, file, result, moduleId, parentClassId);
    }
  }
}

function createJsTsPlugin(isTypeScript: boolean): LanguagePlugin {
  return {
    id: isTypeScript ? "typescript" : "javascript",
    extensions: isTypeScript ? [".ts", ".tsx"] : [".js", ".jsx"],
    parseFile(file: CodeFileEntry): ParsedFileResult {
      const result: ParsedFileResult = {
        symbols: [],
        imports: [],
        calls: [],
        notes: extractLineComments(file.content, file.id),
        flows: [],
      };

      const moduleSymbol = {
        id: createSymbolId(),
        fileId: file.id,
        name: file.relativePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "module",
        kind: "module" as const,
        lineStart: 1,
        lineEnd: file.content.split("\n").length,
      };
      result.symbols.push(moduleSymbol);

      try {
        const ast = parseWithBabel(file.content, isTypeScript);
        walkAst(
          ast.program as unknown as Record<string, unknown>,
          file,
          result,
          moduleSymbol.id,
        );
      } catch {
        return result;
      }

      return result;
    },
  };
}

export const javascriptLanguagePlugin = createJsTsPlugin(false);
export const typescriptLanguagePlugin = createJsTsPlugin(true);
