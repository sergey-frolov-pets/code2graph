import { ref } from "vue";
import {
  localDataLinkCanonicalPath,
  navigateTo,
  parseAppRoute,
  type ParsedAppRoute,
} from "@/router";

function readLocation(): { hash: string; pathname: string; search: string } {
  return {
    hash: window.location.hash,
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

const currentRoute = ref<ParsedAppRoute>(parseAppRoute(readLocation()));
let listenersBound = false;

function syncRouteFromLocation(): void {
  const canonical = localDataLinkCanonicalPath(readLocation());
  if (canonical) {
    window.history.replaceState(null, "", canonical);
  }
  currentRoute.value = parseAppRoute(readLocation());
}

export function bindAppRouterListeners(): void {
  if (listenersBound) {
    return;
  }
  listenersBound = true;
  window.addEventListener("hashchange", syncRouteFromLocation);
  window.addEventListener("popstate", syncRouteFromLocation);
  syncRouteFromLocation();
}

export function useAppRouter() {
  return {
    route: currentRoute,
    navigateTo,
  };
}
