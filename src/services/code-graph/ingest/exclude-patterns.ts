import {
  CODE_GRAPH_DEFAULT_EXCLUDE_DIRS,
  CODE_GRAPH_DEFAULT_EXCLUDE_FILES,
  CODE_GRAPH_SUPPORTED_EXTENSIONS,
} from "@/constants/code-graph";

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

export function shouldExcludePath(relativePath: string): boolean {
  const normalized = normalizePath(relativePath);
  const segments = normalized.split("/");
  const fileName = segments[segments.length - 1] ?? normalized;

  if ((CODE_GRAPH_DEFAULT_EXCLUDE_FILES as readonly string[]).includes(fileName)) {
    return true;
  }

  if (segments.some((segment) =>
    CODE_GRAPH_DEFAULT_EXCLUDE_DIRS.includes(
      segment as (typeof CODE_GRAPH_DEFAULT_EXCLUDE_DIRS)[number],
    ),
  )) {
    return true;
  }

  if (fileName.endsWith(".min.js") || fileName.endsWith(".min.css")) {
    return true;
  }

  return false;
}

export function isSupportedSourcePath(relativePath: string): boolean {
  const normalized = normalizePath(relativePath).toLowerCase();
  return CODE_GRAPH_SUPPORTED_EXTENSIONS.some((ext) =>
    normalized.endsWith(ext),
  );
}

export function detectLanguageFromPath(relativePath: string): string | null {
  const lower = normalizePath(relativePath).toLowerCase();
  if (lower.endsWith(".py")) return "python";
  if (lower.endsWith(".tsx")) return "typescript";
  if (lower.endsWith(".ts")) return "typescript";
  if (lower.endsWith(".jsx")) return "javascript";
  if (lower.endsWith(".js")) return "javascript";
  if (lower.endsWith(".html") || lower.endsWith(".htm")) return "html";
  return null;
}
