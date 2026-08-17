import { ref } from "vue";
import {
  navigateTo,
  parseRouteFromHash,
  type AppRouteName,
} from "@/router";

const currentRoute = ref<AppRouteName>(parseRouteFromHash(window.location.hash));
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
