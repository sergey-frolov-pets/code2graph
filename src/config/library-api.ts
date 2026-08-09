import { ref } from "vue";
import { STORAGE_KEY_LIBRARY_API_URL } from "@/constants/diagram-library";
import { readStorageItem, writeStorageItem } from "@/core/safe-storage";

export function normalizeLibraryApiUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  let url = trimmed.replace(/\/+$/, "");
  if (!url.endsWith("/api")) {
    url = `${url}/api`;
  }

  return url;
}

function readStoredLibraryApiUrl(): string | null {
  return readStorageItem(STORAGE_KEY_LIBRARY_API_URL);
}

function readInitialLibraryApiUrl(): string {
  const saved = readStoredLibraryApiUrl();
  if (saved !== null) {
    return normalizeLibraryApiUrl(saved);
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return normalizeLibraryApiUrl(envUrl);
  }

  return "";
}

const libraryApiUrl = ref(readInitialLibraryApiUrl());

export function getLibraryApiBaseUrl(): string {
  return libraryApiUrl.value;
}

export function isLibraryServerConfigured(): boolean {
  return Boolean(libraryApiUrl.value);
}

export function setLibraryApiBaseUrl(value: string): void {
  const normalized = normalizeLibraryApiUrl(value);
  libraryApiUrl.value = normalized;
  writeStorageItem(STORAGE_KEY_LIBRARY_API_URL, normalized);
}

export function readRawLibraryApiUrl(): string {
  const saved = readStoredLibraryApiUrl();
  if (saved !== null) {
    return saved;
  }

  return libraryApiUrl.value;
}

/** Для composable: реактивная ссылка на URL API библиотеки. */
export function getLibraryApiUrlRef() {
  return libraryApiUrl;
}
