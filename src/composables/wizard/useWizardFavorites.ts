import { ref } from "vue";
import type { DiagramExample } from "@/constants/diagram-example-catalog";
import {
  isWizardFavoriteSourceTooLarge,
  moveWizardFavorite,
  parseWizardServerLibraryLink,
  readWizardFavorites,
  removeWizardFavorite,
  removeWizardFavoriteByIdentity,
  upsertWizardFavorite,
  WIZARD_FAVORITE_FALLBACK_TITLE,
  wizardFavoriteIdentity,
  writeWizardFavorites,
  type WizardFavoriteEntry,
  type WizardFavoriteError,
  type WizardFavoriteRef,
} from "@/constants/wizard-favorites";
import { loadDiagramDetailFromCache } from "@/storage/diagram-store";
import { loadWizardServerFavorite } from "@/services/wizard/load-wizard-server-favorite";
import { resolveLibraryDiagramFormat } from "@/utils/diagram-format";

const entries = ref<WizardFavoriteEntry[]>([]);
let loaded = false;

function loadFromStorage(): void {
  entries.value = readWizardFavorites();
  loaded = true;
}

export function reloadWizardFavorites(): void {
  loadFromStorage();
}

function persist(): WizardFavoriteError | null {
  return writeWizardFavorites(entries.value) ? null : "storage";
}

function ensureLoaded(): void {
  if (!loaded) {
    loadFromStorage();
  }
}

export function useWizardFavorites() {
  ensureLoaded();

  function toggleExample(example: DiagramExample, title: string): WizardFavoriteError | null {
    const favoriteRef: WizardFavoriteRef = { kind: "example", exampleId: example.id };
    const identity = wizardFavoriteIdentity(favoriteRef);
    const exists = entries.value.some((entry) => wizardFavoriteIdentity(entry.ref) === identity);

    entries.value = exists
      ? removeWizardFavoriteByIdentity(entries.value, identity)
      : upsertWizardFavorite(entries.value, {
          id: crypto.randomUUID(),
          ref: favoriteRef,
          title: title.trim() || WIZARD_FAVORITE_FALLBACK_TITLE,
          format: example.format,
          source: "",
        });

    return persist();
  }

  function isExampleFavorite(exampleId: string): boolean {
    return entries.value.some(
      (entry) => entry.ref.kind === "example" && entry.ref.exampleId === exampleId,
    );
  }

  function isLocalFavorite(diagramId: string): boolean {
    return entries.value.some(
      (entry) => entry.ref.kind === "local" && entry.ref.diagramId === diagramId,
    );
  }

  async function addLocal(diagramId: string): Promise<WizardFavoriteError | null> {
    const detail = await loadDiagramDetailFromCache(diagramId).catch(() => null);
    if (!detail) {
      return "missing";
    }

    if (isWizardFavoriteSourceTooLarge(detail.source)) {
      return "tooLarge";
    }

    const favoriteRef: WizardFavoriteRef = { kind: "local", diagramId };
    const identity = wizardFavoriteIdentity(favoriteRef);
    const existing = entries.value.find((entry) => wizardFavoriteIdentity(entry.ref) === identity);

    entries.value = upsertWizardFavorite(entries.value, {
      id: existing?.id ?? crypto.randomUUID(),
      ref: favoriteRef,
      title: detail.title.trim() || WIZARD_FAVORITE_FALLBACK_TITLE,
      format: resolveLibraryDiagramFormat(detail.source, detail.fileName, detail.language),
      source: detail.source,
    });

    return persist();
  }

  async function addServerLink(raw: string): Promise<WizardFavoriteError | null> {
    if (!raw.trim()) {
      return "empty";
    }

    const parsed = parseWizardServerLibraryLink(raw);
    if (!parsed) {
      return "invalid";
    }

    const loadedFavorite = await loadWizardServerFavorite(parsed.username, parsed.slug);
    if (!loadedFavorite.ok) {
      return loadedFavorite.reason;
    }

    const favoriteRef: WizardFavoriteRef = {
      kind: "server-link",
      username: parsed.username,
      slug: parsed.slug,
    };
    const identity = wizardFavoriteIdentity(favoriteRef);
    const existing = entries.value.find((entry) => wizardFavoriteIdentity(entry.ref) === identity);

    entries.value = upsertWizardFavorite(entries.value, {
      id: existing?.id ?? crypto.randomUUID(),
      ref: favoriteRef,
      title: loadedFavorite.title,
      format: loadedFavorite.format,
      source: loadedFavorite.source,
    });

    return persist();
  }

  function remove(id: string): WizardFavoriteError | null {
    entries.value = removeWizardFavorite(entries.value, id);
    return persist();
  }

  function removeLocal(diagramId: string): WizardFavoriteError | null {
    entries.value = removeWizardFavoriteByIdentity(
      entries.value,
      wizardFavoriteIdentity({ kind: "local", diagramId }),
    );
    return persist();
  }

  function move(id: string, toIndex: number): WizardFavoriteError | null {
    const next = moveWizardFavorite(entries.value, id, toIndex);
    if (next === entries.value) {
      return null;
    }

    entries.value = next.slice();
    return persist();
  }

  function moveEarlier(id: string): WizardFavoriteError | null {
    const index = entries.value.findIndex((entry) => entry.id === id);
    if (index <= 0) {
      return null;
    }

    return move(id, index - 1);
  }

  function moveLater(id: string): WizardFavoriteError | null {
    const index = entries.value.findIndex((entry) => entry.id === id);
    if (index < 0 || index >= entries.value.length - 1) {
      return null;
    }

    return move(id, index + 1);
  }

  function moveBefore(id: string, targetId: string): WizardFavoriteError | null {
    if (id === targetId) {
      return null;
    }

    const toIndex = entries.value.findIndex((entry) => entry.id === targetId);
    if (toIndex < 0) {
      return null;
    }

    return move(id, toIndex);
  }

  async function refresh(): Promise<void> {
    let changed = false;
    const next: WizardFavoriteEntry[] = [];

    for (const entry of entries.value) {
      const updated = await refreshEntry(entry);
      if (!sameFavoriteSnapshot(entry, updated)) {
        changed = true;
      }
      next.push(sameFavoriteSnapshot(entry, updated) ? entry : updated);
    }

    if (!changed) {
      return;
    }

    entries.value = next;
    persist();
  }

  return {
    entries,
    toggleExample,
    isExampleFavorite,
    isLocalFavorite,
    addLocal,
    addServerLink,
    remove,
    removeLocal,
    moveEarlier,
    moveLater,
    moveBefore,
    refresh,
  };
}

function sameFavoriteSnapshot(
  left: WizardFavoriteEntry,
  right: WizardFavoriteEntry,
): boolean {
  return (
    left.id === right.id &&
    left.title === right.title &&
    left.format === right.format &&
    left.source === right.source
  );
}

async function refreshEntry(entry: WizardFavoriteEntry): Promise<WizardFavoriteEntry> {
  if (entry.ref.kind === "local") {
    const detail = await loadDiagramDetailFromCache(entry.ref.diagramId).catch(() => null);
    if (!detail || isWizardFavoriteSourceTooLarge(detail.source)) {
      return entry;
    }

    return {
      ...entry,
      title: detail.title.trim() || WIZARD_FAVORITE_FALLBACK_TITLE,
      format: resolveLibraryDiagramFormat(detail.source, detail.fileName, detail.language),
      source: detail.source,
    };
  }

  if (entry.ref.kind !== "server-link") {
    return entry;
  }

  const loadedFavorite = await loadWizardServerFavorite(entry.ref.username, entry.ref.slug);
  if (!loadedFavorite.ok) {
    return entry;
  }

  return {
    ...entry,
    title: loadedFavorite.title,
    format: loadedFavorite.format,
    source: loadedFavorite.source,
  };
}
