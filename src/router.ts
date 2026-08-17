export type AppRouteName = "landing" | "login" | "register" | "account" | "app";

const ROUTE_HASH: Record<AppRouteName, string> = {
  landing: "#/",
  login: "#/login",
  register: "#/register",
  account: "#/account",
  app: "#/app",
};

export function parseRouteFromHash(hash: string): AppRouteName {
  const normalized = hash.replace(/^#/, "").replace(/^\//, "").trim().toLowerCase();

  switch (normalized) {
    case "app":
    case "editor":
      return "app";
    case "login":
      return "login";
    case "register":
      return "register";
    case "account":
    case "cabinet":
      return "account";
    default:
      return "landing";
  }
}

export function routeHash(route: AppRouteName): string {
  return ROUTE_HASH[route];
}

export function navigateTo(route: AppRouteName): void {
  const target = routeHash(route);
  if (window.location.hash !== target) {
    window.location.hash = target;
  }
}
