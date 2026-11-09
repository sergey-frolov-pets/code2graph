import { isDiagramFormat, type DiagramFormat } from "@/constants/diagram-format-ids";
import { CLIPBOARD_DIAGRAM_PATH } from "@/services/clipboard-diagram/constants";
import { PUBLIC_DATA_LINK_ORIGIN } from "@/services/local-data-link/constants";

export type AppRouteName =
  | "landing"
  | "login"
  | "register"
  | "account"
  | "app"
  | "language"
  | "mcp"
  | "diagram"
  | "clipboard"
  | "preview";

export interface ParsedAppRoute {
  name: AppRouteName;
  languageId: DiagramFormat | null;
  diagramSlug: string | null;
}

const ROUTE_HASH: Record<
  Exclude<AppRouteName, "language" | "diagram" | "clipboard" | "preview">,
  string
> = {
  landing: "#/",
  login: "#/login",
  register: "#/register",
  account: "#/account",
  app: "#/app",
  mcp: "#/mcp",
};

const LANGUAGE_ROUTE = /^lang\/([a-z0-9]+)$/;
const PREVIEW_ROUTE = /^preview\/([a-z0-9-]+)$/;

function routeResult(
  name: AppRouteName,
  languageId: DiagramFormat | null = null,
  diagramSlug: string | null = null,
): ParsedAppRoute {
  return { name, languageId, diagramSlug };
}

const LOCAL_DATA_LINK_PATH = /\/local\/([a-z0-9]+(?:-[a-z0-9]+)*)$/i;

export function parseDiagramPathname(pathname: string): ParsedAppRoute | null {
  const normalized = pathname.replace(/\/+$/, "");
  const match = normalized.match(LOCAL_DATA_LINK_PATH);
  if (!match?.[1]) {
    return null;
  }
  return routeResult("diagram", null, match[1].toLowerCase());
}

export function parseClipboardDiagramPathname(pathname: string): ParsedAppRoute | null {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized.toLowerCase() !== CLIPBOARD_DIAGRAM_PATH) {
    return null;
  }
  return routeResult("clipboard");
}

function parsePagesQueryPath(search: string): ParsedAppRoute | null {
  if (!search.startsWith("?/")) {
    return null;
  }
  const path = search.slice(1).split("&")[0] ?? "";
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return parseDiagramPathname(normalized) ?? parseClipboardDiagramPathname(normalized);
}

export function parseAppRoute(locationLike: {
  hash: string;
  pathname: string;
  search?: string;
}): ParsedAppRoute {
  return (
    parseDiagramPathname(locationLike.pathname) ??
    parseClipboardDiagramPathname(locationLike.pathname) ??
    parsePagesQueryPath(locationLike.search ?? "") ??
    parseRouteFromHash(locationLike.hash)
  );
}

function prettyPathForRoute(route: ParsedAppRoute): string | null {
  if (route.name === "clipboard") {
    return CLIPBOARD_DIAGRAM_PATH;
  }
  if (route.name === "diagram" && route.diagramSlug) {
    return `/local/${route.diagramSlug}`;
  }
  return null;
}

/** Path that should stay in the address bar. Rewrites the GitHub Pages `?/` hop. */
export function localDataLinkCanonicalPath(locationLike: {
  hash: string;
  pathname: string;
  search?: string;
}): string | null {
  const pathname = locationLike.pathname.replace(/\/+$/, "") || "/";
  const search = locationLike.search ?? "";
  const route =
    parseDiagramPathname(pathname) ??
    parseClipboardDiagramPathname(pathname) ??
    parsePagesQueryPath(search);
  const canonical = route ? prettyPathForRoute(route) : null;
  if (!canonical || (pathname === canonical && search === "")) {
    return null;
  }
  return canonical;
}

export function parseRouteFromHash(hash: string): ParsedAppRoute {
  const normalized = hash.replace(/^#/, "").replace(/^\//, "").trim().toLowerCase();
  const languageMatch = normalized.match(LANGUAGE_ROUTE);

  if (languageMatch && isDiagramFormat(languageMatch[1])) {
    return routeResult("language", languageMatch[1]);
  }

  const previewMatch = normalized.match(PREVIEW_ROUTE);
  if (previewMatch?.[1]) {
    return routeResult("preview", null, previewMatch[1]);
  }

  switch (normalized) {
    case "app":
    case "editor":
      return routeResult("app");
    case "login":
      return routeResult("login");
    case "register":
      return routeResult("register");
    case "account":
    case "cabinet":
      return routeResult("account");
    case "mcp":
      return routeResult("mcp");
    default:
      return routeResult("landing");
  }
}

export function routeHash(
  route: Exclude<AppRouteName, "language" | "diagram" | "clipboard" | "preview">,
): string {
  return ROUTE_HASH[route];
}

export function diagramDataLinkUrl(origin: string, slug: string): string {
  const url = new URL(origin);
  if (url.hostname === "code2graph.ru" || url.hostname === "www.code2graph.ru") {
    url.protocol = "https:";
    url.hostname = new URL(PUBLIC_DATA_LINK_ORIGIN).hostname;
  }
  url.pathname = `/local/${slug}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function navigateTo(
  route: Exclude<AppRouteName, "diagram" | "clipboard" | "preview">,
  languageId?: DiagramFormat,
): void {
  const target =
    route === "language" && languageId
      ? `#/lang/${languageId}`
      : route === "language"
        ? ROUTE_HASH.landing
        : ROUTE_HASH[route];

  if (window.location.hash !== target) {
    window.location.hash = target;
  }
}
