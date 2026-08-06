import { computed, ref } from "vue";
import {
  STORAGE_KEY_LIBRARY_TARGET,
  type LibraryTarget,
} from "@/constants/diagram-library";
import { getLibraryApiBaseUrl } from "@/config/library-api";
import { readStorageItem, writeStorageItem } from "@/utils/safe-storage";

function readInitialLibraryTarget(): LibraryTarget {
  const saved = readStorageItem(STORAGE_KEY_LIBRARY_TARGET);
  if (saved === "local" || saved === "online") {
    return saved;
  }

  return "local";
}

const libraryTarget = ref<LibraryTarget>(readInitialLibraryTarget());

export function getLibraryTarget(): LibraryTarget {
  return libraryTarget.value;
}

export function getLibraryTargetRef() {
  return libraryTarget;
}

export function canUseOnlineLibrary(): boolean {
  return Boolean(getLibraryApiBaseUrl());
}

export function setLibraryTarget(target: LibraryTarget): void {
  if (target === "online" && !canUseOnlineLibrary()) {
    return;
  }

  libraryTarget.value = target;
  writeStorageItem(STORAGE_KEY_LIBRARY_TARGET, target);
}

export function useLibraryTarget() {
  const canUseOnline = computed(() => canUseOnlineLibrary());

  return {
    libraryTarget,
    canUseOnline,
    setLibraryTarget,
  };
}
