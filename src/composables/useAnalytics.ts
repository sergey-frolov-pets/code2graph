import { watch } from "vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { reportPage, type PageSection } from "@/analytics";
import type { ParsedAppRoute } from "@/router";

/**
 * Router-driven GoatCounter tracking.
 *
 * The app is a hash-routed SPA: `window.location.pathname` is always "/", so
 * raw pageviews would collapse every visit into a single row. Instead this
 * composable maps the parsed route to a section and reports `page/<раздел>`
 * once per app opening (see `reportPage` in `@/analytics/usage`).
 */

/** Route name → section of the `page/*` counter. */
const SECTION_BY_ROUTE: Record<ParsedAppRoute["name"], PageSection | null> = {
  landing: "landing",
  login: "login",
  register: "register",
  account: "account",
  app: "app",
  language: null, // /master-<язык> — строится из languageId ниже
  mcp: "mcp",
  diagram: "diagram",
  clipboard: "clipboard",
  sample: "sample",
  preview: "preview",
  aiChatShare: null,
  libraryLink: "library",
  dashboardEmbed: null,
};

/** Section for a parsed route, or null when the route is not a section. */
export function pageSectionOf(route: ParsedAppRoute): PageSection | null {
  if (route.name === "language") {
    return route.languageId ? (`master-${route.languageId}` as PageSection) : null;
  }
  return SECTION_BY_ROUTE[route.name] ?? null;
}

/**
 * Starts router-driven tracking. Must be called once, after the app is
 * mounted, so the router composable already holds the initial route.
 */
export function useAnalytics(): void {
  const { route } = useAppRouter();

  watch(
    route,
    (next) => {
      const section = pageSectionOf(next);
      if (section) reportPage(section);
    },
    { immediate: true },
  );
}
