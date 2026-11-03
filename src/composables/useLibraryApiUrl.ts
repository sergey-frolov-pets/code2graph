import { computed } from "vue";
import {
  getLibraryApiUrlRef,
  readRawLibraryApiUrl,
  setLibraryApiBaseUrl,
} from "@/config/library-api";

export {
  getLibraryApiBaseUrl,
  normalizeLibraryApiUrl,
} from "@/config/library-api";

export function useLibraryApiUrl() {
  const libraryApiUrl = getLibraryApiUrlRef();
  const isLocalMode = computed(() => !libraryApiUrl.value);

  function setLibraryApiUrl(value: string): void {
    setLibraryApiBaseUrl(value);
  }

  return {
    libraryApiUrl,
    isLocalMode,
    setLibraryApiUrl,
    readRawLibraryApiUrl,
  };
}
