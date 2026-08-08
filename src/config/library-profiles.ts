import { ref } from "vue";
import {
  STORAGE_KEY_ACTIVE_LIBRARY_PROFILE_ID,
  STORAGE_KEY_LIBRARY_API_PASSWORD,
  STORAGE_KEY_LIBRARY_API_URL,
  STORAGE_KEY_LIBRARY_API_USERNAME,
  STORAGE_KEY_LIBRARY_AUTH_TOKEN,
  STORAGE_KEY_LIBRARY_PROFILE_SECRETS,
  STORAGE_KEY_LIBRARY_PROFILES,
} from "@/constants/diagram-library";
import {
  normalizeLibraryApiUrl,
  setLibraryApiBaseUrl,
} from "@/config/library-api";
import {
  clearLibraryApiCredentials,
  getLibraryCredentialsRefs,
  setLibraryApiUsername,
} from "@/config/library-credentials";
import {
  readStorageItem,
  readStorageJson,
  writeStorageItem,
  writeStorageJson,
} from "@/utils/safe-storage";

export interface LibraryProfile {
  id: string;
  name: string;
  apiUrl: string;
  username: string;
}

interface LibraryProfileSecrets {
  password?: string;
  authToken?: string;
}

const DEFAULT_PROFILE_ID = "default";

const libraryProfiles = ref<LibraryProfile[]>(readInitialProfiles());
const activeProfileId = ref(readActiveProfileId());

function readSecretsMap(): Record<string, LibraryProfileSecrets> {
  return (
    readStorageJson(STORAGE_KEY_LIBRARY_PROFILE_SECRETS, (value) => {
      if (!value || typeof value !== "object") {
        return {};
      }
      return value as Record<string, LibraryProfileSecrets>;
    }) ?? {}
  );
}

function writeSecretsMap(map: Record<string, LibraryProfileSecrets>): void {
  writeStorageJson(STORAGE_KEY_LIBRARY_PROFILE_SECRETS, map);
}

function migrateLegacyLibrarySettings(): LibraryProfile[] {
  const savedProfiles =
    readStorageJson(STORAGE_KEY_LIBRARY_PROFILES, (value) => {
      if (!Array.isArray(value)) {
        return null;
      }
      return value as LibraryProfile[];
    }) ?? [];
  if (savedProfiles.length > 0) {
    return savedProfiles;
  }

  const legacyUrl = readStorageItem(STORAGE_KEY_LIBRARY_API_URL) ?? "";
  const legacyUsername = readStorageItem(STORAGE_KEY_LIBRARY_API_USERNAME) ?? "";
  const legacyPassword = readStorageItem(STORAGE_KEY_LIBRARY_API_PASSWORD) ?? "";
  const legacyToken = readStorageItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN) ?? "";

  if (!legacyUrl && !legacyUsername) {
    return [];
  }

  const profile: LibraryProfile = {
    id: DEFAULT_PROFILE_ID,
    name: legacyUrl || "Библиотека",
    apiUrl: normalizeLibraryApiUrl(legacyUrl),
    username: legacyUsername,
  };

  const secrets: Record<string, LibraryProfileSecrets> = {};
  if (legacyPassword || legacyToken) {
    secrets[profile.id] = {
      password: legacyPassword || undefined,
      authToken: legacyToken || undefined,
    };
    writeSecretsMap(secrets);
  }

  writeStorageJson(STORAGE_KEY_LIBRARY_PROFILES, [profile]);
  writeStorageItem(STORAGE_KEY_ACTIVE_LIBRARY_PROFILE_ID, profile.id);
  return [profile];
}

function readInitialProfiles(): LibraryProfile[] {
  return migrateLegacyLibrarySettings();
}

function readActiveProfileId(): string {
  return (
    readStorageItem(STORAGE_KEY_ACTIVE_LIBRARY_PROFILE_ID) ??
    libraryProfiles.value[0]?.id ??
    DEFAULT_PROFILE_ID
  );
}

function applyActiveProfile(): void {
  const profile =
    libraryProfiles.value.find((entry) => entry.id === activeProfileId.value) ??
    libraryProfiles.value[0];

  if (!profile) {
    setLibraryApiBaseUrl("");
    clearLibraryApiCredentials();
    return;
  }

  setLibraryApiBaseUrl(profile.apiUrl);
  setLibraryApiUsername(profile.username);

  const secrets = readSecretsMap()[profile.id];
  const { libraryApiPassword, libraryAuthToken } = getLibraryCredentialsRefs();
  libraryApiPassword.value = secrets?.password ?? "";
  libraryAuthToken.value = secrets?.authToken ?? "";
}

applyActiveProfile();

function persistProfiles(): void {
  writeStorageJson(STORAGE_KEY_LIBRARY_PROFILES, libraryProfiles.value);
  writeStorageItem(STORAGE_KEY_ACTIVE_LIBRARY_PROFILE_ID, activeProfileId.value);
}

function persistActiveSecrets(): void {
  const secrets = readSecretsMap();
  const { libraryApiPassword, libraryAuthToken } = getLibraryCredentialsRefs();
  secrets[activeProfileId.value] = {
    password: libraryApiPassword.value || undefined,
    authToken: libraryAuthToken.value || undefined,
  };
  writeSecretsMap(secrets);
}

export function getLibraryProfilesRef() {
  return libraryProfiles;
}

export function getActiveLibraryProfileIdRef() {
  return activeProfileId;
}

export function getActiveLibraryProfile(): LibraryProfile | null {
  return (
    libraryProfiles.value.find((entry) => entry.id === activeProfileId.value) ??
    libraryProfiles.value[0] ??
    null
  );
}

export function setActiveLibraryProfile(profileId: string): void {
  if (!libraryProfiles.value.some((entry) => entry.id === profileId)) {
    return;
  }

  persistActiveSecrets();
  activeProfileId.value = profileId;
  persistProfiles();
  applyActiveProfile();
}

export function addLibraryProfile(input: {
  name: string;
  apiUrl: string;
  username?: string;
}): LibraryProfile {
  const profile: LibraryProfile = {
    id: crypto.randomUUID(),
    name: input.name.trim() || input.apiUrl.trim() || "Библиотека",
    apiUrl: normalizeLibraryApiUrl(input.apiUrl),
    username: input.username?.trim() ?? "",
  };

  libraryProfiles.value = [...libraryProfiles.value, profile];
  persistProfiles();
  return profile;
}

export function updateLibraryProfile(
  profileId: string,
  patch: Partial<Pick<LibraryProfile, "name" | "apiUrl" | "username">>,
): void {
  libraryProfiles.value = libraryProfiles.value.map((entry) =>
    entry.id === profileId
      ? {
          ...entry,
          ...patch,
          name: patch.name?.trim() ?? entry.name,
          apiUrl: patch.apiUrl
            ? normalizeLibraryApiUrl(patch.apiUrl)
            : entry.apiUrl,
          username:
            patch.username !== undefined ? patch.username.trim() : entry.username,
        }
      : entry,
  );
  persistProfiles();

  if (profileId === activeProfileId.value) {
    applyActiveProfile();
  }
}

export function removeLibraryProfile(profileId: string): void {
  if (libraryProfiles.value.length <= 1) {
    return;
  }

  libraryProfiles.value = libraryProfiles.value.filter(
    (entry) => entry.id !== profileId,
  );

  const secrets = readSecretsMap();
  delete secrets[profileId];
  writeSecretsMap(secrets);

  if (activeProfileId.value === profileId) {
    activeProfileId.value = libraryProfiles.value[0]?.id ?? DEFAULT_PROFILE_ID;
  }

  persistProfiles();
  applyActiveProfile();
}

export function saveActiveProfileCredentials(): void {
  const profile = getActiveLibraryProfile();
  if (!profile) {
    return;
  }

  const { libraryApiUsername } = getLibraryCredentialsRefs();
  updateLibraryProfile(profile.id, { username: libraryApiUsername.value });
  persistActiveSecrets();
}
