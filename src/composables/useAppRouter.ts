import { ref } from "vue";
import {
  EXPLICIT_LANDING_STORAGE_KEY,
  isEditorEntry,
  LAST_ENTRY_STORAGE_KEY,
  localDataLinkCanonicalPath,
  navigateTo,
  parseAppRoute,
  routeHash,
  shouldRestoreEditor,
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

function readStorageItem(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function syncRouteFromLocation(): void {
  const canonical = localDataLinkCanonicalPath(readLocation());
  if (canonical) {
    window.history.replaceState(null, "", canonical);
  }

  const location = readLocation();
  const route = parseAppRoute(location);
  if (
    shouldRestoreEditor({
      routeName: route.name,
      hash: location.hash,
      lastEntry: readStorageItem(localStorage, LAST_ENTRY_STORAGE_KEY),
      explicitLanding:
        readStorageItem(sessionStorage, EXPLICIT_LANDING_STORAGE_KEY) === "1",
    })
  ) {
    const target = routeHash("app");
    if (window.location.hash !== target) {
      window.location.hash = target;
      return;
    }
  }

  currentRoute.value = route;
  if (isEditorEntry(route.name)) {
    try {
      localStorage.setItem(LAST_ENTRY_STORAGE_KEY, "app");
    } catch {
      // Хранилище может быть закрыто. Маршрут от этого не зависит.
    }
  }
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
