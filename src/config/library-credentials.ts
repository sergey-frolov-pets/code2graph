import { ref } from "vue";
import {
  STORAGE_KEY_LIBRARY_API_PASSWORD,
  STORAGE_KEY_LIBRARY_API_USERNAME,
} from "@/constants/diagram-library";
import {
  readStorageItem,
  removeStorageItem,
  writeStorageItem,
} from "@/utils/safe-storage";

function readInitialUsername(): string {
  return readStorageItem(STORAGE_KEY_LIBRARY_API_USERNAME) ?? "";
}

function readInitialPassword(): string {
  return readStorageItem(STORAGE_KEY_LIBRARY_API_PASSWORD) ?? "";
}

const libraryApiUsername = ref(readInitialUsername());
const libraryApiPassword = ref(readInitialPassword());

export function getLibraryApiUsername(): string {
  return libraryApiUsername.value;
}

export function getLibraryApiPassword(): string {
  return libraryApiPassword.value;
}

export function hasLibraryApiCredentials(): boolean {
  return Boolean(libraryApiUsername.value && libraryApiPassword.value);
}

export function setLibraryApiUsername(value: string): void {
  const trimmed = value.trim();
  libraryApiUsername.value = trimmed;
  writeStorageItem(STORAGE_KEY_LIBRARY_API_USERNAME, trimmed);
}

export function setLibraryApiPassword(value: string): void {
  libraryApiPassword.value = value;
  writeStorageItem(STORAGE_KEY_LIBRARY_API_PASSWORD, value);
}

export function clearLibraryApiCredentials(): void {
  libraryApiUsername.value = "";
  libraryApiPassword.value = "";
  removeStorageItem(STORAGE_KEY_LIBRARY_API_USERNAME);
  removeStorageItem(STORAGE_KEY_LIBRARY_API_PASSWORD);
}

export function buildLibraryAuthHeader(): Record<string, string> {
  if (!hasLibraryApiCredentials()) {
    return {};
  }

  const encoded = btoa(
    `${libraryApiUsername.value}:${libraryApiPassword.value}`,
  );
  return { Authorization: `Basic ${encoded}` };
}

export function getLibraryCredentialsRefs() {
  return { libraryApiUsername, libraryApiPassword };
}
