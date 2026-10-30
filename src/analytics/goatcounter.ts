/**
 * GoatCounter analytics bridge.
 *
 * The tracker script (count.js) is loaded from index.html. It defines
 * `window.goatcounter` asynchronously, so every call here must tolerate the
 * object being absent (blocked by an ad blocker, offline, local dev, tests).
 *
 * SPA caveat: GoatCounter counts a pageview on load only. Because this app is a
 * hash-routed SPA, every route change must be reported explicitly, otherwise
 * all visits collapse into "/".
 */

import { pagePath } from "./paths";

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
 * Report a pageview for the given hash route.
 * The hash is mapped to a readable path (see ./paths): "#/lang/mermaid"
 * becomes "/master-mermaid", "#/" becomes "/landing".
 */
export function trackPageview(hash: string, title?: string): void {
  const api = getApi();
  if (!api?.count) {
    return;
  }

  api.count({
    path: pagePath(hash),
    title: title ?? document.title,
  });
}

/**
 * Report a custom event (clicks on CTAs, language cards, etc.).
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
