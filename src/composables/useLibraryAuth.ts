import { computed, ref } from "vue";
import type { LibraryUserDto } from "@/constants/diagram-library";
import {
  clearLibraryApiCredentials,
  getLibraryAuthToken,
  setLibraryAuthToken,
} from "@/config/library-credentials";
import {
  fetchLibraryAuthStatus,
  fetchLibraryMe,
  loginLibrary,
  registerLibraryAccount,
  setupLibraryAdmin,
} from "@/utils/diagram-api";

const currentUser = ref<LibraryUserDto | null>(null);
const needsSetup = ref(false);
const registrationEnabled = ref(false);
let refreshPromise: Promise<LibraryUserDto | null> | null = null;

export function useLibraryAuth() {
  const isAdmin = computed(() => currentUser.value?.role === "admin");
  const isAuthenticated = computed(() => Boolean(currentUser.value));

  async function checkLibraryAuthStatus(
    baseUrl?: string,
  ): Promise<{ needsSetup: boolean }> {
    const status = await fetchLibraryAuthStatus(baseUrl);
    needsSetup.value = status.needsSetup;
    registrationEnabled.value = Boolean(status.registrationEnabled);
    if (status.needsSetup) {
      currentUser.value = null;
    }
    return status;
  }

  async function refreshCurrentUser(): Promise<LibraryUserDto | null> {
    if (refreshPromise) {
      return refreshPromise;
    }

    refreshPromise = (async () => {
      if (!getLibraryAuthToken()) {
        currentUser.value = null;
        return null;
      }

      try {
        const response = await fetchLibraryMe();
        currentUser.value = response.user;
        needsSetup.value = false;
        return response.user;
      } catch {
        currentUser.value = null;
        return null;
      }
    })();

    try {
      return await refreshPromise;
    } finally {
      refreshPromise = null;
    }
  }

  async function loginWithCredentials(
    username: string,
    password: string,
  ): Promise<LibraryUserDto> {
    const response = await loginLibrary(username, password);
    setLibraryAuthToken(response.token);
    currentUser.value = response.user;
    needsSetup.value = false;
    return response.user;
  }

  async function setupFirstAdmin(
    username: string,
    password: string,
    baseUrl?: string,
  ): Promise<LibraryUserDto> {
    const response = await setupLibraryAdmin(username, password, baseUrl);
    setLibraryAuthToken(response.token);
    currentUser.value = response.user;
    needsSetup.value = false;
    return response.user;
  }

  function logoutLibraryAuth(): void {
    currentUser.value = null;
    clearLibraryApiCredentials();
  }

  async function registerAccount(
    username: string,
    password: string,
    baseUrl?: string,
  ): Promise<LibraryUserDto> {
    const response = await registerLibraryAccount(username, password, baseUrl);
    setLibraryAuthToken(response.token);
    currentUser.value = response.user;
    needsSetup.value = false;
    return response.user;
  }

  return {
    currentUser,
    needsSetup,
    registrationEnabled,
    isAdmin,
    isAuthenticated,
    checkLibraryAuthStatus,
    refreshCurrentUser,
    loginWithCredentials,
    setupFirstAdmin,
    registerAccount,
    logoutLibraryAuth,
  };
}
