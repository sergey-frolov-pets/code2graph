/**
 * Human-readable page paths for the GoatCounter "Pages" report.
 *
 * GoatCounter shows the reported `path` verbatim, so raw hash routes
 * ("/", "/app", "/lang/mermaid") are hard to read in the dashboard. Here every
 * route is mapped to a readable path:
 *
 *   #/          -> /landing        (marketing page)
 *   #/app       -> /app            (editor)
 *   #/mcp       -> /mcp            (MCP page)
 *   #/lang/<id> -> /master-mermaid (master page for the diagram language)
 *   #/login     -> /login
 *   #/register  -> /register
 *   #/account   -> /account
 *
 * Unknown routes keep their normalised hash so nothing is silently merged.
 */

/** Readable path for the landing page (the site root). */
export const LANDING_PATH = "/landing";

/** Prefix of the per-language "master" pages: /master-mermaid, /master-plantuml, ... */
export const MASTER_PATH_PREFIX = "/master-";

/** Readable paths for the single-page routes. */
const STATIC_PATHS: Record<string, string> = {
  "": LANDING_PATH,
  "/": LANDING_PATH,
  "/landing": LANDING_PATH,
  "/app": "/app",
  "/editor": "/app",
  "/mcp": "/mcp",
  "/login": "/login",
  "/register": "/register",
  "/account": "/account",
  "/cabinet": "/account",
};

const LANGUAGE_ROUTE = /^\/lang\/([a-z0-9]+)$/;

/**
 * Convert a location hash into a readable GoatCounter path.
 * Never returns an empty string.
 */
export function pagePath(hash: string): string {
  const normalized = hash
    .replace(/^#/, "")
    .trim()
    .toLowerCase();
  const route = normalized.startsWith("/") ? normalized : `/${normalized}`;

  const languageMatch = route.match(LANGUAGE_ROUTE);
  if (languageMatch) {
    return `${MASTER_PATH_PREFIX}${languageMatch[1]}`;
  }

  return STATIC_PATHS[route] ?? route;
}
