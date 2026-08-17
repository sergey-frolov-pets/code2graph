import { ref } from "vue";
import {
  STORAGE_KEY_LIBRARY_API_PASSWORD,
  STORAGE_KEY_LIBRARY_API_USERNAME,
  STORAGE_KEY_LIBRARY_AUTH_TOKEN,
  STORAGE_KEY_REMEMBER_LOGIN,
} from "@/constants/diagram-library";
import {
  readSessionItem,
  readStorageBoolean,
  readStorageItem,
  removeSessionItem,
  removeStorageItem,
  writeSessionItem,
  writeStorageItem,
} from "@/core/safe-storage";

function readRememberLoginPreference(): boolean {
  const saved = readStorageBoolean(STORAGE_KEY_REMEMBER_LOGIN);
  return saved ?? true;
}

function readAuthTokenFromStores(): string {
  const sessionToken = readSessionItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN);
  if (sessionToken) {
    return sessionToken;
  }
  return readStorageItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN) ?? "";
}

function readInitialUsername(): string {
  return readStorageItem(STORAGE_KEY_LIBRARY_API_USERNAME) ?? "";
}

function readInitialPassword(): string {
  return readStorageItem(STORAGE_KEY_LIBRARY_API_PASSWORD) ?? "";
}

const rememberLogin = ref(readRememberLoginPreference());
const libraryApiUsername = ref(readInitialUsername());
const libraryApiPassword = ref(readInitialPassword());
const libraryAuthToken = ref(readAuthTokenFromStores());

export function getRememberLogin(): boolean {
  return rememberLogin.value;
}

export function setRememberLogin(value: boolean): void {
  rememberLogin.value = value;
  writeStorageItem(STORAGE_KEY_REMEMBER_LOGIN, value ? "true" : "false");
}

export function getLibraryApiUsername(): string {
  return libraryApiUsername.value;
}

export function getLibraryApiPassword(): string {
  return libraryApiPassword.value;
}

export function getLibraryAuthToken(): string {
  return libraryAuthToken.value;
}

export function hasLibraryApiCredentials(): boolean {
  return Boolean(
    libraryAuthToken.value ||
      (libraryApiUsername.value && libraryApiPassword.value),
  );
}

export function setLibraryApiUsername(value: string): void {
  const trimmed = value.trim();
  libraryApiUsername.value = trimmed;
  if (rememberLogin.value) {
    writeStorageItem(STORAGE_KEY_LIBRARY_API_USERNAME, trimmed);
  } else {
    removeStorageItem(STORAGE_KEY_LIBRARY_API_USERNAME);
  }
}

export function setLibraryApiPassword(value: string): void {
  libraryApiPassword.value = value;
  if (rememberLogin.value) {
    writeStorageItem(STORAGE_KEY_LIBRARY_API_PASSWORD, value);
  } else {
    removeStorageItem(STORAGE_KEY_LIBRARY_API_PASSWORD);
  }
}

export function setLibraryAuthToken(value: string): void {
  const trimmed = value.trim();
  libraryAuthToken.value = trimmed;

  removeSessionItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN);
  removeStorageItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN);

  if (!trimmed) {
    return;
  }

  if (rememberLogin.value) {
    writeStorageItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN, trimmed);
  } else {
    writeSessionItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN, trimmed);
  }
}

export function clearLibraryApiCredentials(): void {
  libraryApiUsername.value = "";
  libraryApiPassword.value = "";
  libraryAuthToken.value = "";
  removeStorageItem(STORAGE_KEY_LIBRARY_API_USERNAME);
  removeStorageItem(STORAGE_KEY_LIBRARY_API_PASSWORD);
  removeStorageItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN);
  removeSessionItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN);
}

export function buildLibraryAuthHeader(): Record<string, string> {
  if (libraryAuthToken.value) {
    return { Authorization: `Bearer ${libraryAuthToken.value}` };
  }

  if (!libraryApiUsername.value || !libraryApiPassword.value) {
    return {};
  }

  const encoded = btoa(
    `${libraryApiUsername.value}:${libraryApiPassword.value}`,
  );
  return { Authorization: `Basic ${encoded}` };
}

export function getLibraryCredentialsRefs() {
  return { libraryApiUsername, libraryApiPassword, libraryAuthToken };
}
