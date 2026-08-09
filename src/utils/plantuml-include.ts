import { LocalizedAppError } from "@/utils/localized-app-error";

const INCLUDE_LINE_PATTERN =
  /^\s*!include(?:_once|url)?(?:\s+many)?\s+(.+?)\s*$/m;

const STDLIB_INCLUDE_PATTERN = /^<([^>]+)>$/;

export const PLANTUML_LIB_C4_BASE = "./plantuml-lib/C4/";

export const PLANTUML_LIB_ARCHIMATE_BASE = "./plantuml-lib/archimate/";

export const ARCHIMATE_INCLUDE_PATH = `${PLANTUML_LIB_ARCHIMATE_BASE}Archimate.puml`;

export const C4_INCLUDE_PATHS = {
  context: `${PLANTUML_LIB_C4_BASE}C4_Context.puml`,
  container: `${PLANTUML_LIB_C4_BASE}C4_Container.puml`,
  component: `${PLANTUML_LIB_C4_BASE}C4_Component.puml`,
  deployment: `${PLANTUML_LIB_C4_BASE}C4_Deployment.puml`,
  dynamic: `${PLANTUML_LIB_C4_BASE}C4_Dynamic.puml`,
  sequence: `${PLANTUML_LIB_C4_BASE}C4_Sequence.puml`,
} as const;

const includeCache = new Map<string, string>();

function stripIncludeQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function mapStdlibIncludePath(includePath: string): string {
  const stdlibMatch = STDLIB_INCLUDE_PATTERN.exec(includePath);
  if (!stdlibMatch) {
    return includePath;
  }

  const relativePath = stdlibMatch[1];
  const withExtension = relativePath.endsWith(".puml")
    ? relativePath
    : `${relativePath}.puml`;

  return `./plantuml-lib/${withExtension}`;
}

function resolveIncludeUrl(includePath: string, parentUrl?: string): string {
  const mappedPath = mapStdlibIncludePath(includePath);

  if (/^https?:\/\//i.test(mappedPath)) {
    return mappedPath;
  }

  const baseUrl = parentUrl ?? window.location.href;

  if (mappedPath.startsWith("./") || mappedPath.startsWith("../")) {
    return new URL(mappedPath, baseUrl).href;
  }

  return new URL(`./${mappedPath}`, baseUrl).href;
}

async function fetchIncludeContent(url: string): Promise<string> {
  const cached = includeCache.get(url);
  if (cached !== undefined) {
    return cached;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new LocalizedAppError("include.fetchFailed", { path: url });
  }

  const content = await response.text();
  includeCache.set(url, content);
  return content;
}

async function resolveIncludesInSource(
  source: string,
  parentUrl?: string,
  includedUrls: Set<string> = new Set(),
): Promise<string> {
  const lines = source.split(/\r\n|\r|\n/);
  const resolvedLines: string[] = [];

  for (const line of lines) {
    const match = INCLUDE_LINE_PATTERN.exec(line);
    if (!match) {
      resolvedLines.push(line);
      continue;
    }

    const includePath = stripIncludeQuotes(match[1]);
    const includeUrl = resolveIncludeUrl(includePath, parentUrl);
    const isOnce = /!include_once/.test(line);

    if (isOnce && includedUrls.has(includeUrl)) {
      continue;
    }

    includedUrls.add(includeUrl);
    const includedSource = await fetchIncludeContent(includeUrl);
    const nested = await resolveIncludesInSource(
      includedSource,
      includeUrl,
      includedUrls,
    );
    resolvedLines.push(nested);
  }

  return resolvedLines.join("\n");
}

export async function resolvePlantUmlIncludes(source: string): Promise<string> {
  if (!INCLUDE_LINE_PATTERN.test(source)) {
    return source;
  }

  return resolveIncludesInSource(source);
}

export function clearPlantUmlIncludeCache(): void {
  includeCache.clear();
}
