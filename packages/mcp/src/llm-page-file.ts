import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveLlmPagePath } from "../../../packages/shared/src/llm-pages.js";

const pagesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../src/services/llm/guides/pages",
);

/** Read one catalog page from the repo. Relative links are not followed. */
export function readLlmPageFile(pagePath: string, from?: string): string {
  const safe = resolveLlmPagePath(pagePath, from);
  if (!safe) {
    return "Unknown page. Call list_capabilities to see the index.";
  }
  return readFileSync(join(pagesDir, safe), "utf8").trim();
}
