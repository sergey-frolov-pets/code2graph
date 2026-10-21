import { ref } from "vue";
import { STORAGE_KEY_LIBRARY_API_URL } from "@/constants/diagram-library";
import { DEPLOYMENT_API_SAME_ORIGIN_ALIASES } from "@/constants/deployment";
import { readStorageItem, writeStorageItem } from "@/core/safe-storage";

export interface LibraryApiResolutionInput {
  storedUrl: string | null;
  envUrl: string | undefined;
  pageOrigin: string;
  pageProtocol: string;
}

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

export function isSameOriginApiSetting(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (DEPLOYMENT_API_SAME_ORIGIN_ALIASES as readonly string[]).includes(
    normalized,
  );
}

function readEnvApiBaseUrl(envUrl: string | undefined): string {
  return envUrl?.trim() ?? "";
}

export function isStaticDeployment(envUrl: string | undefined): boolean {
  return readEnvApiBaseUrl(envUrl) === "";
}

/**
 * На статической сборке адрес того же хоста не считается настроенным сервером.
 * Раньше он подставлялся автоматически и сохранялся в браузере.
 */
export function isImplicitSameOriginApiUrl(
  candidate: string,
  envUrl: string | undefined,
  pageOrigin: string,
  pageProtocol: string,
): boolean {
  if (!isStaticDeployment(envUrl)) {
    return false;
  }

  if (!pageProtocol.startsWith("http") || !pageOrigin.trim() || !candidate.trim()) {
    return false;
  }

  return normalizeLibraryApiUrl(candidate) === normalizeLibraryApiUrl(pageOrigin);
}

export function resolveConfiguredLibraryApiUrl(
  input: LibraryApiResolutionInput,
): string {
  const envUrl = readEnvApiBaseUrl(input.envUrl);
  const sameOriginUrl = input.pageProtocol.startsWith("http")
    ? normalizeLibraryApiUrl(input.pageOrigin)
    : "";

  if (input.storedUrl !== null && input.storedUrl.trim() !== "") {
    if (
      !isImplicitSameOriginApiUrl(
        input.storedUrl,
        envUrl,
        input.pageOrigin,
        input.pageProtocol,
      )
    ) {
      return normalizeLibraryApiUrl(input.storedUrl);
    }
  }

  if (!envUrl) {
    return "";
  }

  if (isSameOriginApiSetting(envUrl)) {
    return sameOriginUrl;
  }

  return normalizeLibraryApiUrl(envUrl);
}

export function resolveActiveProfileApiUrl(
  profileApiUrl: string,
  currentApiUrl: string,
  input: Omit<LibraryApiResolutionInput, "storedUrl">,
): string {
  if (!profileApiUrl.trim()) {
    return currentApiUrl;
  }

  if (
    isImplicitSameOriginApiUrl(
      profileApiUrl,
      input.envUrl,
      input.pageOrigin,
      input.pageProtocol,
    )
  ) {
    return currentApiUrl;
  }

  return normalizeLibraryApiUrl(profileApiUrl);
}

function readPageLocation(): { pageOrigin: string; pageProtocol: string } {
  if (typeof window === "undefined") {
    return { pageOrigin: "", pageProtocol: "" };
  }

  return {
    pageOrigin: window.location.origin,
    pageProtocol: window.location.protocol,
  };
}

function readStoredLibraryApiUrl(): string | null {
  const saved = readStorageItem(STORAGE_KEY_LIBRARY_API_URL);
  if (saved === null || saved.trim() === "") {
    return null;
  }

  return saved;
}

function readInitialLibraryApiUrl(): string {
  const page = readPageLocation();
  return resolveConfiguredLibraryApiUrl({
    storedUrl: readStoredLibraryApiUrl(),
    envUrl: import.meta.env.VITE_API_BASE_URL,
    pageOrigin: page.pageOrigin,
    pageProtocol: page.pageProtocol,
  });
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
    if (
      isImplicitSameOriginApiUrl(
        saved,
        import.meta.env.VITE_API_BASE_URL,
        readPageLocation().pageOrigin,
        readPageLocation().pageProtocol,
      )
    ) {
      return libraryApiUrl.value;
    }

    return saved;
  }

  return libraryApiUrl.value;
}

/** Для composable: реактивная ссылка на URL API библиотеки. */
export function getLibraryApiUrlRef() {
  return libraryApiUrl;
}
