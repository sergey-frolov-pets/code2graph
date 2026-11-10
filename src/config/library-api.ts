import { ref } from "vue";
import { STORAGE_KEY_LIBRARY_API_URL } from "@/constants/diagram-library";
import {
  DEPLOYMENT_CONFIG_FILE,
  isImplicitSameOriginApiUrl,
  normalizeLibraryApiUrl,
  parseDeploymentFile,
  resolveDeployment,
  type ApiConfigSource,
  type DeploymentResolutionInput,
} from "@/config/deployment";
import { readStorageItem, writeStorageItem } from "@/core/safe-storage";

export {
  isImplicitSameOriginApiUrl,
  isSameOriginApiSetting,
  isStaticDeployment,
  normalizeLibraryApiUrl,
} from "@/config/deployment";

export interface LibraryApiResolutionInput {
  storedUrl: string | null;
  deploymentApiUrl?: string | null;
  envUrl: string | undefined;
  pageOrigin: string;
  pageProtocol: string;
}

export function resolveConfiguredLibraryApiUrl(
  input: LibraryApiResolutionInput,
): string {
  return resolveDeployment(toDeploymentInput(input)).apiBaseUrl;
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

function toDeploymentInput(
  input: LibraryApiResolutionInput,
): DeploymentResolutionInput {
  return {
    storedUrl: input.storedUrl,
    deploymentApiUrl: input.deploymentApiUrl ?? null,
    envUrl: input.envUrl,
    pageOrigin: input.pageOrigin,
    pageProtocol: input.pageProtocol,
  };
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

const deploymentApiUrl = ref<string | null>(null);
const deploymentPublicOrigin = ref("");
const libraryApiUrl = ref("");
const apiConfigSource = ref<ApiConfigSource>("none");

function applyResolvedApiUrl(): void {
  const page = readPageLocation();
  const resolved = resolveDeployment({
    storedUrl: readStoredLibraryApiUrl(),
    deploymentApiUrl: deploymentApiUrl.value,
    envUrl: import.meta.env.VITE_API_BASE_URL,
    pageOrigin: page.pageOrigin,
    pageProtocol: page.pageProtocol,
  });
  libraryApiUrl.value = resolved.apiBaseUrl;
  apiConfigSource.value = resolved.source;
}

applyResolvedApiUrl();

export function getLibraryApiBaseUrl(): string {
  return libraryApiUrl.value;
}

export function isLibraryServerConfigured(): boolean {
  return Boolean(libraryApiUrl.value);
}

export function getApiConfigSource(): ApiConfigSource {
  return apiConfigSource.value;
}

export function getApiConfigSourceRef() {
  return apiConfigSource;
}

export function getDeploymentPublicOrigin(): string {
  return deploymentPublicOrigin.value;
}

export function setLibraryApiBaseUrl(value: string): void {
  const trimmed = value.trim();
  if (!trimmed) {
    writeStorageItem(STORAGE_KEY_LIBRARY_API_URL, "");
    applyResolvedApiUrl();
    return;
  }

  const normalized = normalizeLibraryApiUrl(trimmed);
  libraryApiUrl.value = normalized;
  apiConfigSource.value = "manual";
  writeStorageItem(STORAGE_KEY_LIBRARY_API_URL, normalized);
}

export function readRawLibraryApiUrl(): string {
  const saved = readStoredLibraryApiUrl();
  if (saved !== null) {
    const page = readPageLocation();
    if (
      isImplicitSameOriginApiUrl(
        saved,
        import.meta.env.VITE_API_BASE_URL,
        page.pageOrigin,
        page.pageProtocol,
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

export async function loadDeploymentConfig(): Promise<void> {
  if (typeof window === "undefined" || window.location.protocol === "file:") {
    return;
  }

  try {
    const url = new URL(DEPLOYMENT_CONFIG_FILE, document.baseURI || window.location.href);
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return;
    }

    const parsed = parseDeploymentFile(await response.json());
    if (!parsed) {
      return;
    }

    deploymentApiUrl.value = parsed.apiBaseUrl;
    deploymentPublicOrigin.value = parsed.publicOrigin;
    applyResolvedApiUrl();
  } catch {
    // Статический хостинг без файла или file:// остаётся локальным режимом.
  }
}
