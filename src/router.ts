import { isDiagramFormat, type DiagramFormat } from "@/constants/diagram-format-ids";
import { DIAGRAM_DATA_LINK_ROUTE } from "@/services/local-data-link/constants";

export type AppRouteName =
  | "landing"
  | "login"
  | "register"
  | "account"
  | "app"
  | "language"
  | "mcp"
  | "diagram";

export interface ParsedAppRoute {
  name: AppRouteName;
  languageId: DiagramFormat | null;
  diagramSlug: string | null;
}

const ROUTE_HASH: Record<Exclude<AppRouteName, "language" | "diagram">, string> = {
  landing: "#/",
  login: "#/login",
  register: "#/register",
  account: "#/account",
  app: "#/app",
  mcp: "#/mcp",
};

const LANGUAGE_ROUTE = /^lang\/([a-z0-9]+)$/;

function routeResult(
  name: AppRouteName,
  languageId: DiagramFormat | null = null,
  diagramSlug: string | null = null,
): ParsedAppRoute {
  return { name, languageId, diagramSlug };
}

export function parseRouteFromHash(hash: string): ParsedAppRoute {
  const normalized = hash.replace(/^#/, "").replace(/^\//, "").trim().toLowerCase();
  const languageMatch = normalized.match(LANGUAGE_ROUTE);

  if (languageMatch && isDiagramFormat(languageMatch[1])) {
    return routeResult("language", languageMatch[1]);
  }

  const diagramMatch = normalized.match(DIAGRAM_DATA_LINK_ROUTE);
  if (diagramMatch?.[1]) {
    return routeResult("diagram", null, diagramMatch[1]);
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
  route: Exclude<AppRouteName, "language" | "diagram">,
): string {
  return ROUTE_HASH[route];
}

export function diagramDataLinkHash(slug: string): string {
  return `#/diagram/${slug}`;
}

export function navigateTo(
  route: Exclude<AppRouteName, "diagram">,
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
