import { computed, onMounted, ref, type Ref } from "vue";
import type { LayoutEngine } from "@/constants";
import {
  listDiagramExamples,
  type DiagramExample,
} from "@/constants/diagram-example-catalog";
import { diagramExampleTitle } from "@/constants/diagram-example-text";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import type { DiagramListItemDto } from "@/constants/diagram-library";
import type { RenderMode } from "@/constants/render-settings";
import { wizardThumbnailSvg } from "@/constants/wizard-thumbnails";
import {
  type WizardFavoriteCard,
  type WizardFavoriteEntry,
  type WizardFavoriteError,
} from "@/constants/wizard-favorites";
import { useLocale } from "@/composables/useLocale";
import { useWizardFavoritePreviews } from "@/composables/wizard/useWizardFavoritePreviews";
import { useWizardFavorites } from "@/composables/wizard/useWizardFavorites";
import type { LocaleKey } from "@/locales/types";
import { loadDiagramsFromCache } from "@/storage/diagram-store";

export interface WizardLocalFavoriteOption {
  id: string;
  title: string;
  added: boolean;
}

export type OpenedWizardFavorite =
  | { type: "example"; example: DiagramExample }
  | { type: "saved"; source: string; label: string; format: DiagramFormat };

const FAVORITE_ERROR_KEYS = {
  missing: "llm.wizard.gallery.favorite.missing",
  tooLarge: "llm.wizard.gallery.favorite.tooLarge",
  storage: "llm.wizard.gallery.favorite.storage",
  empty: "llm.wizard.gallery.favorite.linkEmpty",
  invalid: "llm.wizard.gallery.favorite.linkInvalid",
  viewOnly: "llm.wizard.gallery.favorite.linkViewOnly",
  fetch: "llm.wizard.gallery.favorite.linkFetch",
  noApi: "llm.wizard.gallery.favorite.linkNoApi",
} as const satisfies Record<WizardFavoriteError, LocaleKey>;

export function useWizardFavoriteGallery(options: {
  layout: Ref<LayoutEngine>;
  renderMode: Ref<RenderMode>;
  diagramDarkMode: Ref<boolean>;
}) {
  const { t, locale } = useLocale();
  const favorites = useWizardFavorites();
  const localOpen = ref(false);
  const localDiagrams = ref<DiagramListItemDto[]>([]);
  const linkDraft = ref("");
  const linkError = ref("");
  const notice = ref("");
  const busy = ref(false);

  const previewItems = computed(() =>
    favorites.entries.value
      .filter((entry) => entry.ref.kind !== "example" && entry.source.trim().length > 0)
      .map((entry) => ({
        id: entry.id,
        source: entry.source,
        format: entry.format,
      })),
  );

  const { previews } = useWizardFavoritePreviews(
    previewItems,
    options.layout,
    options.renderMode,
    options.diagramDarkMode,
  );

  const favoriteCards = computed(() => {
    const examples = new Map(
      listDiagramExamples().map((example) => [example.id, example]),
    );
    return favorites.entries.value.map((entry, index, list) =>
      toCard(entry, index, list.length, examples, previews.value),
    );
  });

  const localOptions = computed<WizardLocalFavoriteOption[]>(() =>
    localDiagrams.value.map((diagram) => ({
      id: diagram.id,
      title: diagram.title,
      added: favorites.isLocalFavorite(diagram.id),
    })),
  );

  function showNotice(error: WizardFavoriteError | null): void {
    notice.value = error ? t(FAVORITE_ERROR_KEYS[error]) : "";
  }

  function toggleExample(example: DiagramExample): void {
    showNotice(favorites.toggleExample(example, diagramExampleTitle(example, t)));
  }

  async function toggleLocalPicker(): Promise<void> {
    localOpen.value = !localOpen.value;
    if (!localOpen.value) {
      return;
    }

    const diagrams = await loadDiagramsFromCache().catch(() => []);
    localDiagrams.value = diagrams
      .slice()
      .sort((left, right) => left.title.localeCompare(right.title, locale.value));
  }

  async function toggleLocal(diagramId: string): Promise<void> {
    if (favorites.isLocalFavorite(diagramId)) {
      showNotice(favorites.removeLocal(diagramId));
      return;
    }

    showNotice(await favorites.addLocal(diagramId));
  }

  async function submitLink(): Promise<void> {
    linkError.value = "";
    busy.value = true;
    const error = await favorites.addServerLink(linkDraft.value);
    busy.value = false;
    if (error) {
      linkError.value = t(FAVORITE_ERROR_KEYS[error]);
      return;
    }

    linkDraft.value = "";
    notice.value = "";
  }

  function removeFavorite(id: string): void {
    showNotice(favorites.remove(id));
  }

  function moveEarlier(id: string): void {
    showNotice(favorites.moveEarlier(id));
  }

  function moveLater(id: string): void {
    showNotice(favorites.moveLater(id));
  }

  function moveBefore(id: string, targetId: string): void {
    showNotice(favorites.moveBefore(id, targetId));
  }

  function openById(id: string): OpenedWizardFavorite | null {
    const entry = favorites.entries.value.find((item) => item.id === id);
    if (!entry) {
      return null;
    }

    const favoriteRef = entry.ref;
    if (favoriteRef.kind === "example") {
      const example = listDiagramExamples().find((item) => item.id === favoriteRef.exampleId);
      return example ? { type: "example", example } : null;
    }

    if (!entry.source.trim()) {
      return null;
    }

    return {
      type: "saved",
      source: entry.source,
      label: entry.title,
      format: entry.format,
    };
  }

  function toCard(
    entry: WizardFavoriteEntry,
    index: number,
    total: number,
    examples: Map<string, DiagramExample>,
    rendered: Record<string, string>,
  ): WizardFavoriteCard {
    const favoriteRef = entry.ref;
    const example = favoriteRef.kind === "example" ? examples.get(favoriteRef.exampleId) ?? null : null;
    const title = example ? diagramExampleTitle(example, t) : entry.title;
    const svg = example
      ? wizardThumbnailSvg(example.format, example.sampleId, locale.value)
      : rendered[entry.id] ?? null;

    return {
      id: entry.id,
      title,
      kind: favoriteRef.kind,
      svg,
      canOpen: example !== null || entry.source.trim().length > 0,
      canMoveEarlier: index > 0,
      canMoveLater: index < total - 1,
    };
  }

  onMounted(() => {
    void favorites.refresh();
  });

  return {
    favoriteCards,
    localOpen,
    localOptions,
    linkDraft,
    linkError,
    notice,
    busy,
    isExampleFavorite: favorites.isExampleFavorite,
    toggleExample,
    toggleLocalPicker,
    toggleLocal,
    submitLink,
    removeFavorite,
    moveEarlier,
    moveLater,
    moveBefore,
    openById,
  };
}
