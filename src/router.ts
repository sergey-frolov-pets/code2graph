import { getDeploymentPublicOrigin } from "@/config/library-api";
import { isDiagramFormat, type DiagramFormat } from "@/constants/diagram-format-ids";
import { CLIPBOARD_DIAGRAM_PATH } from "@/services/clipboard-diagram/constants";
import {
  DATA_LINK_SLUG_PATTERN,
  PUBLIC_DATA_LINK_ORIGIN,
} from "@/services/local-data-link/constants";

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
  | "preview"
  | "aiChatShare"
  | "libraryLink";

export interface ParsedAppRoute {
  name: AppRouteName;
  languageId: DiagramFormat | null;
  diagramSlug: string | null;
  libraryUsername: string | null;
  libraryLinkSlug: string | null;
}

/** First path segments that are never a library username. */
export const LIBRARY_LINK_RESERVED_SEGMENTS = new Set([
  "local",
  "diagram",
  "api",
  "assets",
  "icons",
  "fonts",
  "vendor",
]);

const LIBRARY_USERNAME_MAX_LENGTH = 80;

const ROUTE_HASH: Record<
  Exclude<
    AppRouteName,
    "language" | "diagram" | "clipboard" | "preview" | "libraryLink" | "aiChatShare"
  >,
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
  libraryUsername: string | null = null,
  libraryLinkSlug: string | null = null,
): ParsedAppRoute {
  return { name, languageId, diagramSlug, libraryUsername, libraryLinkSlug };
}

export function readPublicLibrarySlug(
  raw: string | undefined = import.meta.env?.VITE_LIBRARY_PUBLIC_SLUG,
): string {
  return raw?.trim().toLowerCase() ?? "";
}

function decodePathSegment(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded.length > 0 ? decoded : null;
  } catch {
    return null;
  }
}

export function parseLibraryLinkPathname(
  pathname: string,
  publicSlug = readPublicLibrarySlug(),
): ParsedAppRoute | null {
  const parts = (pathname.replace(/\/+$/, "") || "/")
    .split("/")
    .filter((part) => part.length > 0);
  const librarySlug = publicSlug.trim().toLowerCase();
  let usernamePart: string | undefined;
  let linkPart: string | undefined;

  if (librarySlug) {
    if (parts.length !== 3 || parts[0]?.toLowerCase() !== librarySlug) {
      return null;
    }
    usernamePart = parts[1];
    linkPart = parts[2];
  } else {
    if (parts.length !== 2) {
      return null;
    }
    if (LIBRARY_LINK_RESERVED_SEGMENTS.has(parts[0]?.toLowerCase() ?? "")) {
      return null;
    }
    usernamePart = parts[0];
    linkPart = parts[1];
  }

  const username = usernamePart ? decodePathSegment(usernamePart) : null;
  const link = linkPart ? decodePathSegment(linkPart) : null;
  if (!username || !link || username.length > LIBRARY_USERNAME_MAX_LENGTH) {
    return null;
  }
  if (username === "." || username === "..") {
    return null;
  }
  const linkSlug = link.toLowerCase();
  if (!DATA_LINK_SLUG_PATTERN.test(linkSlug)) {
    return null;
  }

  return routeResult("libraryLink", null, null, username, linkSlug);
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
  return (
    parseDiagramPathname(normalized) ??
    parseClipboardDiagramPathname(normalized) ??
    parseLibraryLinkPathname(normalized)
  );
}

export function parseAppRoute(locationLike: {
  hash: string;
  pathname: string;
  search?: string;
}): ParsedAppRoute {
  const fromHash = parseRouteFromHash(locationLike.hash);
  // Вкладка превью сохраняет путь редактора (`/local/…`, `/diagram`,
  // библиотечная ссылка) и кладёт сессию в хеш. Иначе вторая вкладка
  // снова открывает редактор и не видит правки кода.
  if (fromHash.name === "preview") {
    return fromHash;
  }

  return (
    parseDiagramPathname(locationLike.pathname) ??
    parseClipboardDiagramPathname(locationLike.pathname) ??
    parseLibraryLinkPathname(locationLike.pathname) ??
    parsePagesQueryPath(locationLike.search ?? "") ??
    fromHash
  );
}

function prettyPathForRoute(route: ParsedAppRoute): string | null {
  if (route.name === "clipboard") {
    return CLIPBOARD_DIAGRAM_PATH;
  }
  if (route.name === "diagram" && route.diagramSlug) {
    return `/local/${route.diagramSlug}`;
  }
  if (route.name === "libraryLink" && route.libraryUsername && route.libraryLinkSlug) {
    const username = encodeURIComponent(route.libraryUsername);
    const librarySlug = readPublicLibrarySlug();
    return librarySlug
      ? `/${librarySlug}/${username}/${route.libraryLinkSlug}`
      : `/${username}/${route.libraryLinkSlug}`;
  }
  return null;
}

/** Path that should stay in the address bar. Rewrites the GitHub Pages `?/` hop. */
export function localDataLinkCanonicalPath(locationLike: {
  hash: string;
  pathname: string;
  search?: string;
}): string | null {
  // Красивый путь `/local/…` нельзя подставлять вместо `#/preview/<id>`:
  // `replaceState` без хеша снимает сессию и снова открывает редактор.
  if (parseRouteFromHash(locationLike.hash).name === "preview") {
    return null;
  }

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
    case "share-chat":
      return routeResult("aiChatShare");
    default:
      return routeResult("landing");
  }
}

const CANONICAL_PUBLIC_HOSTS = new Set(["code2graph.ru", "www.code2graph.ru"]);

function publishedOrigin(origin: string): string {
  const configured = getDeploymentPublicOrigin().trim();
  let page: URL;
  try {
    page = new URL(origin);
  } catch {
    return origin;
  }

  if (configured) {
    try {
      const target = new URL(configured);
      if (
        page.hostname === target.hostname ||
        CANONICAL_PUBLIC_HOSTS.has(page.hostname)
      ) {
        return target.origin;
      }
    } catch {
      // Ignore a malformed publicOrigin and keep the page origin.
    }
  }

  if (CANONICAL_PUBLIC_HOSTS.has(page.hostname)) {
    return new URL(PUBLIC_DATA_LINK_ORIGIN).origin;
  }

  return origin;
}

export function routeHash(
  route: Exclude<
    AppRouteName,
    "language" | "diagram" | "clipboard" | "preview" | "libraryLink" | "aiChatShare"
  >,
): string {
  return ROUTE_HASH[route];
}

/** Hash of a public language page, for example `#/lang/mermaid`. */
export function languagePageHash(languageId: DiagramFormat): string {
  return `#/lang/${languageId}`;
}

export function libraryLinkUrl(
  origin: string,
  username: string,
  slug: string,
  publicSlug = readPublicLibrarySlug(),
): string {
  const url = new URL(publishedOrigin(origin));
  const user = encodeURIComponent(username);
  const librarySlug = publicSlug.trim().toLowerCase();
  url.pathname = librarySlug
    ? `/${librarySlug}/${user}/${slug}`
    : `/${user}/${slug}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function diagramDataLinkUrl(origin: string, slug: string): string {
  const url = new URL(publishedOrigin(origin));
  url.pathname = `/local/${slug}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function navigateTo(
  route: Exclude<
    AppRouteName,
    "diagram" | "clipboard" | "preview" | "libraryLink" | "aiChatShare"
  >,
  languageId?: DiagramFormat,
): void {
  const target =
    route === "language" && languageId
      ? languagePageHash(languageId)
      : route === "language"
        ? ROUTE_HASH.landing
        : ROUTE_HASH[route];

  if (window.location.hash !== target) {
    window.location.hash = target;
  }
}
