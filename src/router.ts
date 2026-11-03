import { isDiagramFormat, type DiagramFormat } from "@/constants/diagram-format-ids";

export type AppRouteName =
  | "landing"
  | "login"
  | "register"
  | "account"
  | "app"
  | "language"
  | "mcp";

export interface ParsedAppRoute {
  name: AppRouteName;
  languageId: DiagramFormat | null;
}

const ROUTE_HASH: Record<Exclude<AppRouteName, "language">, string> = {
  landing: "#/",
  login: "#/login",
  register: "#/register",
  account: "#/account",
  app: "#/app",
  mcp: "#/mcp",
};

const LANGUAGE_ROUTE = /^lang\/([a-z0-9]+)$/;

export function parseRouteFromHash(hash: string): ParsedAppRoute {
  const normalized = hash.replace(/^#/, "").replace(/^\//, "").trim().toLowerCase();
  const languageMatch = normalized.match(LANGUAGE_ROUTE);

  if (languageMatch && isDiagramFormat(languageMatch[1])) {
    return { name: "language", languageId: languageMatch[1] };
  }

  switch (normalized) {
    case "app":
    case "editor":
      return { name: "app", languageId: null };
    case "login":
      return { name: "login", languageId: null };
    case "register":
      return { name: "register", languageId: null };
    case "account":
    case "cabinet":
      return { name: "account", languageId: null };
    case "mcp":
      return { name: "mcp", languageId: null };
    default:
      return { name: "landing", languageId: null };
  }
}

export function routeHash(route: Exclude<AppRouteName, "language">): string {
  return ROUTE_HASH[route];
}

export function navigateTo(route: AppRouteName, languageId?: DiagramFormat): void {
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
