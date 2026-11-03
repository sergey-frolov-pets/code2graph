import { computed } from "vue";
import {
  clearLibraryApiCredentials,
  getLibraryCredentialsRefs,
  hasLibraryApiCredentials,
  setLibraryApiPassword,
  setLibraryApiUsername,
} from "@/config/library-credentials";

export function useLibraryCredentials() {
  const { libraryApiUsername, libraryApiPassword } = getLibraryCredentialsRefs();

  const hasCredentials = computed(() => hasLibraryApiCredentials());

  function setUsername(value: string): void {
    setLibraryApiUsername(value);
  }

  function setPassword(value: string): void {
    setLibraryApiPassword(value);
  }

  function clearCredentials(): void {
    clearLibraryApiCredentials();
  }

  return {
    libraryApiUsername,
    libraryApiPassword,
    hasCredentials,
    setUsername,
    setPassword,
    clearCredentials,
  };
}
