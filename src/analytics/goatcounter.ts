/**
 * GoatCounter analytics bridge.
 *
 * The tracker script (count.js) is loaded from index.html. It defines
 * `window.goatcounter` asynchronously, so every call here must tolerate the
 * object being absent (blocked by an ad blocker, offline, dev, tests).
 *
 * Only custom events are reported: `trackEvent(name)` stores one fact under
 * "Events". Raw pageviews are not sent — section views go through
 * `reportPage()` in ./usage, so the dashboard has one `page/*` counter instead
 * of two overlapping ones.
 *
 * Everything else (visits, sections, clicks, open, surface, …) is built on top
 * of `trackEvent` in ./usage, which keeps the "one event — one fact" rule.
 */

export interface GoatCounterCountOptions {
  path: string;
  title?: string;
  event?: boolean;
  referrer?: string;
}

export interface GoatCounterApi {
  count?: (options: GoatCounterCountOptions) => void;
  no_onload?: boolean;
  allow_local?: boolean;
}

declare global {
  interface Window {
    goatcounter?: GoatCounterApi;
  }
}

function getApi(): GoatCounterApi | null {
  if (typeof window === "undefined") {
    return null;
  }
  const api = window.goatcounter;
  return api && typeof api.count === "function" ? api : null;
}

/**
 * Report a custom event (clicks, visits, sections, open, surface, …).
 * Events are stored separately from pageviews in GoatCounter.
 */
export function trackEvent(name: string, title?: string): void {
  const api = getApi();
  if (!api?.count) {
    return;
  }

  api.count({
    path: name,
    title: title ?? name,
    event: true,
  });
}
