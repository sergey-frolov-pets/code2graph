import { ref } from "vue";
import {
  navigateTo,
  parseRouteFromHash,
  type ParsedAppRoute,
} from "@/router";

const currentRoute = ref<ParsedAppRoute>(parseRouteFromHash(window.location.hash));
let listenersBound = false;

function syncRouteFromHash(): void {
  currentRoute.value = parseRouteFromHash(window.location.hash);
}

export function bindAppRouterListeners(): void {
  if (listenersBound) {
    return;
  }
  listenersBound = true;
  window.addEventListener("hashchange", syncRouteFromHash);
  syncRouteFromHash();
}

export function useAppRouter() {
  return {
    route: currentRoute,
    navigateTo,
  };
}
