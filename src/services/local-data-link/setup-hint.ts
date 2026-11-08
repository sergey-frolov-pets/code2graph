import {
  DATA_LINK_SETUP_HINT_EVENT,
  DATA_LINK_SETUP_HINT_KEY,
} from "@/services/local-data-link/constants";

export function publishDataLinkSetupHint(slug: string): void {
  sessionStorage.setItem(DATA_LINK_SETUP_HINT_KEY, slug);
  window.dispatchEvent(
    new CustomEvent(DATA_LINK_SETUP_HINT_EVENT, { detail: slug }),
  );
}

export function readDataLinkSetupHint(): string {
  return sessionStorage.getItem(DATA_LINK_SETUP_HINT_KEY) ?? "";
}

export function clearDataLinkSetupHint(): void {
  sessionStorage.removeItem(DATA_LINK_SETUP_HINT_KEY);
  window.dispatchEvent(
    new CustomEvent(DATA_LINK_SETUP_HINT_EVENT, { detail: "" }),
  );
}
