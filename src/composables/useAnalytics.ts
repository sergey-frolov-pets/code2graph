import { watch } from "vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { trackEvent as trackRawEvent } from "@/analytics";

/**
 * Router-driven GoatCounter tracking.
 *
 * The app is a hash-routed SPA: `window.location.pathname` is always "/", so
 * the tracker's own onload hit would collapse every visit into a single row.
 *
 * `src/main.ts` already reports the first load and every `hashchange` through
 * `trackPageview()` (see `src/analytics`), which maps hash routes to readable
 * paths via `pagePath()`. This composable is the router-level layer on top of
 * it: it watches the parsed route so programmatic navigation is reported the
 * same way, and it re-exports the event helper the components import.
 */

/**
 * Starts router-driven tracking. Must be called once, after the app is
 * mounted, so the router composable already holds the initial route.
 */
export function useAnalytics(): void {
  const { route } = useAppRouter();

  watch(route, (next) => {
    trackRawEvent(`route-${next.name}`, `Route: ${next.name}`);
  });
}

/** Custom event; shows up under "Events" in the GoatCounter dashboard. */
export function trackEvent(name: string, title?: string): void {
  trackRawEvent(name, title);
}
