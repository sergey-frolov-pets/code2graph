/**
 * GoatCounter endpoint resolution.
 *
 * The tracker origin is configurable so forks and local builds do not send
 * visits to the upstream project's own counter:
 *
 *   VITE_GOATCOUNTER_URL=https://stats.example.com  → https://stats.example.com/count
 *   VITE_GOATCOUNTER_URL=                          → analytics disabled
 *   (unset)                                        → DEFAULT_GOATCOUNTER_ORIGIN
 *
 * `index.html` reads the same variable through Vite's `%VAR%` HTML replacement,
 * so the script tag and this module can never disagree.
 */

/** Origin used when the build does not define VITE_GOATCOUNTER_URL. */
export const DEFAULT_GOATCOUNTER_ORIGIN = "https://stats.code2graph.ru";

/**
 * Resolve the GoatCounter origin for the current build.
 * Returns an empty string when analytics is explicitly disabled.
 */
export function resolveGoatCounterOrigin(
  raw: string | undefined = import.meta.env?.VITE_GOATCOUNTER_URL,
): string {
  if (raw === undefined) {
    return DEFAULT_GOATCOUNTER_ORIGIN;
  }

  const trimmed = raw.trim();
  if (trimmed === "") {
    return "";
  }

  // Trailing slashes would produce "https://host//count".
  return trimmed.replace(/\/+$/, "");
}

/** Full URL of the GoatCounter count endpoint, or "" when disabled. */
export function resolveGoatCounterCountUrl(
  raw?: string,
): string {
  const origin = resolveGoatCounterOrigin(raw);
  return origin === "" ? "" : `${origin}/count`;
}

/** Whether analytics should load at all for this build. */
export function isAnalyticsEnabled(raw?: string): boolean {
  return resolveGoatCounterOrigin(raw) !== "";
}
