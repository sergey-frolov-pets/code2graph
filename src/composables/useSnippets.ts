import { computed, ref } from "vue";
import { resolveDiagramTypeSlug } from "@/analytics/diagram-type";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import type { LocaleKey, TranslateFn } from "@/locales/types";
import { BUILTIN_SNIPPETS } from "@/constants/builtin-snippets";
import { getLanguageModule } from "@/languages/registry";
import {
  isSnippetLanguageId,
  SNIPPET_CATEGORY_IDS,
  SNIPPET_LANGUAGE_IDS,
  type CustomSnippet,
  type SnippetCategoryId,
  type SnippetLanguageId,
  type SnippetListItem,
} from "@/types/snippets";
import {
  createCustomSnippetId,
  loadCustomSnippets,
  parseSnippetsExportPayload,
  saveCustomSnippets,
  serializeSnippetsToText,
  SNIPPETS_EXPORT_FILE_NAME,
} from "@/storage/snippets";
import { downloadTextFile } from "@/utils/export";
import { trackSave } from "@/analytics";

export type SnippetsImportMode = "merge" | "replace";
export type SnippetLanguageFilter = SnippetLanguageId | null;
export type SnippetCategoryFilter = SnippetCategoryId | "custom" | null;

const DIAGRAM_TYPE_TO_CATEGORY: Record<string, SnippetCategoryId> = {
  sequence: "sequence",
  class: "classes",
  object: "classes",
  component: "components",
  usecase: "components",
  block: "components",
  requirement: "components",
  packet: "components",
  activity: "activity",
  state: "state",
  timing: "state",
  c4_context: "c4",
  c4_container: "c4",
  er: "er",
  gantt: "gantt",
  mindmap: "mindmap",
  wbs: "wbs",
  wireframe: "wireframe",
  flowchart: "flowchart",
  architecture: "architecture",
  deployment: "architecture",
  nwdiag: "architecture",
  archimate: "architecture",
  pie: "charts",
  xychart: "charts",
  gitgraph: "charts",
  timeline: "charts",
  journey: "charts",
  sankey: "charts",
  quadrant: "charts",
  waterfall: "charts",
  bubble: "charts",
  heatmap: "charts",
  orgchart: "flowchart",
  ev: "charts",
  boxplot: "charts",
  treemap: "charts",
  radar: "charts",
  voronoi: "charts",
  clustered: "charts",
  series: "charts",
};

function getItemLanguage(item: SnippetListItem): SnippetLanguageId {
  return item.kind === "builtin" ? item.language : item.snippet.language;
}

function getItemCategory(item: SnippetListItem): SnippetCategoryId | "custom" {
  return item.kind === "builtin" ? item.categoryId : item.snippet.categoryId;
}

function getCategoryLabelKey(
  categoryId: SnippetCategoryId | "custom",
): LocaleKey {
  return `snippets.category.${categoryId}`;
}

export function resolveSnippetLanguageFromFormat(
  format?: DiagramFormat,
): SnippetLanguageId {
  if (format && isSnippetLanguageId(format)) {
    return format;
  }
  return "plantuml";
}

export function resolveSnippetCategoryFromDiagram(
  source: string,
  format: DiagramFormat,
): SnippetCategoryId | null {
  if (!isSnippetLanguageId(format)) {
    return null;
  }

  const trimmed = source.trim();
  if (!trimmed) {
    return null;
  }

  if (format === "structurizr" && /\bdynamic\s+/i.test(trimmed)) {
    return "sequence";
  }

  if (
    format === "structurizr" &&
    (/\bcomponent\s+[\p{L}\p{N}_"]+/iu.test(trimmed) ||
      /=\s*component\b/i.test(trimmed))
  ) {
    return "components";
  }

  const slug = resolveDiagramTypeSlug(trimmed, format);
  if (!slug) {
    return null;
  }

  if (slug === "graph") {
    return format === "plantuml" ? "components" : "flowchart";
  }

  return DIAGRAM_TYPE_TO_CATEGORY[slug] ?? null;
}

export function useSnippets(options?: {
  initialFormat?: DiagramFormat;
  initialSource?: string;
}) {
  const customSnippets = ref<CustomSnippet[]>(loadCustomSnippets());
  const activeLanguage = ref<SnippetLanguageFilter>(null);
  const activeCategory = ref<SnippetCategoryFilter>(null);
  const searchQuery = ref("");

  function persistCustomSnippets(): void {
    saveCustomSnippets(customSnippets.value);
  }

  const allItems = computed<SnippetListItem[]>(() => {
    const builtin: SnippetListItem[] = BUILTIN_SNIPPETS.map((snippet) => ({
      kind: "builtin",
      id: snippet.id,
      language: snippet.language,
      categoryId: snippet.categoryId,
      titleKey: snippet.titleKey,
      descriptionKey: snippet.descriptionKey,
      content: snippet.content,
    }));

    const custom: SnippetListItem[] = customSnippets.value.map((snippet) => ({
      kind: "custom",
      snippet,
    }));

    return [...builtin, ...custom];
  });

  const availableCategoryIds = computed<SnippetCategoryId[]>(() => {
    const present = new Set<SnippetCategoryId>();
    for (const item of allItems.value) {
      if (
        activeLanguage.value !== null &&
        getItemLanguage(item) !== activeLanguage.value
      ) {
        continue;
      }
      const cat = getItemCategory(item);
      if (cat !== "custom") {
        present.add(cat);
      }
    }
    return SNIPPET_CATEGORY_IDS.filter((id) => present.has(id));
  });

  function setActiveLanguage(language: SnippetLanguageFilter): void {
    activeLanguage.value = language;
    if (
      activeCategory.value !== null &&
      activeCategory.value !== "custom" &&
      !availableCategoryIds.value.includes(activeCategory.value)
    ) {
      activeCategory.value = null;
    }
  }

  function toggleLanguageTag(language: SnippetLanguageId): void {
    if (activeLanguage.value === language) {
      setActiveLanguage(null);
      return;
    }
    setActiveLanguage(language);
  }

  function setActiveCategory(category: SnippetCategoryFilter): void {
    activeCategory.value = category;
  }

  function toggleCategoryTag(category: SnippetCategoryId | "custom"): void {
    if (activeCategory.value === category) {
      activeCategory.value = null;
      return;
    }
    activeCategory.value = category;
  }

  function syncWithEditorContext(
    format: DiagramFormat,
    source = "",
  ): void {
    if (!isSnippetLanguageId(format)) {
      activeLanguage.value = null;
      activeCategory.value = null;
      return;
    }

    activeLanguage.value = format;
    const detectedCategory = resolveSnippetCategoryFromDiagram(source, format);
    if (
      detectedCategory &&
      availableCategoryIds.value.includes(detectedCategory)
    ) {
      activeCategory.value = detectedCategory;
    } else {
      activeCategory.value = null;
    }
  }

  if (options?.initialFormat) {
    syncWithEditorContext(options.initialFormat, options.initialSource ?? "");
  }

  function buildSearchHaystack(
    item: SnippetListItem,
    t: TranslateFn,
  ): string {
    const language = getItemLanguage(item);
    const languageLabel = t(getLanguageModule(language).labelKey);
    const categoryId = getItemCategory(item);
    const categoryLabel = t(getCategoryLabelKey(categoryId));

    if (item.kind === "builtin") {
      const title = t(item.titleKey);
      const description = item.descriptionKey ? t(item.descriptionKey) : "";
      return [
        title,
        description,
        item.content,
        language,
        languageLabel,
        categoryId,
        categoryLabel,
      ]
        .join("\n")
        .toLowerCase();
    }

    return [
      item.snippet.title,
      item.snippet.description ?? "",
      item.snippet.content,
      language,
      languageLabel,
      categoryId,
      categoryLabel,
    ]
      .join("\n")
      .toLowerCase();
  }

  function matchesSearch(
    item: SnippetListItem,
    query: string,
    t: TranslateFn,
  ): boolean {
    const tokens = query
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) {
      return true;
    }

    const haystack = buildSearchHaystack(item, t);
    return tokens.every((token) => haystack.includes(token));
  }

  function matchesLanguage(item: SnippetListItem): boolean {
    if (activeLanguage.value === null) {
      return true;
    }
    return getItemLanguage(item) === activeLanguage.value;
  }

  function matchesCategory(item: SnippetListItem): boolean {
    if (activeCategory.value === null) {
      return true;
    }

    if (activeCategory.value === "custom") {
      return item.kind === "custom";
    }

    return getItemCategory(item) === activeCategory.value;
  }

  function filterItems(t: TranslateFn): SnippetListItem[] {
    return allItems.value.filter(
      (item) =>
        matchesLanguage(item) &&
        matchesCategory(item) &&
        matchesSearch(item, searchQuery.value, t),
    );
  }

  function addCustomSnippet(payload: {
    language?: SnippetLanguageId;
    title: string;
    content: string;
    description?: string;
    categoryId?: SnippetCategoryId | "custom";
  }): CustomSnippet {
    const now = new Date().toISOString();
    const resolvedLanguage: SnippetLanguageId =
      payload.language ?? activeLanguage.value ?? "plantuml";

    const snippet: CustomSnippet = {
      id: createCustomSnippetId(),
      language: resolvedLanguage,
      title: payload.title.trim(),
      content: payload.content,
      description: payload.description?.trim() || undefined,
      categoryId: payload.categoryId ?? "custom",
      createdAt: now,
      updatedAt: now,
    };

    customSnippets.value = [...customSnippets.value, snippet];
    persistCustomSnippets();
    return snippet;
  }

  function updateCustomSnippet(
    id: string,
    payload: {
      language?: SnippetLanguageId;
      title: string;
      content: string;
      description?: string;
      categoryId?: SnippetCategoryId | "custom";
    },
  ): CustomSnippet | null {
    const index = customSnippets.value.findIndex((item) => item.id === id);
    if (index < 0) {
      return null;
    }

    const existing = customSnippets.value[index];
    const updated: CustomSnippet = {
      ...existing,
      language: payload.language ?? existing.language,
      title: payload.title.trim(),
      content: payload.content,
      description: payload.description?.trim() || undefined,
      categoryId: payload.categoryId ?? existing.categoryId,
      updatedAt: new Date().toISOString(),
    };

    customSnippets.value = [
      ...customSnippets.value.slice(0, index),
      updated,
      ...customSnippets.value.slice(index + 1),
    ];
    persistCustomSnippets();
    return updated;
  }

  function deleteCustomSnippet(id: string): boolean {
    const next = customSnippets.value.filter((item) => item.id !== id);
    if (next.length === customSnippets.value.length) {
      return false;
    }

    customSnippets.value = next;
    persistCustomSnippets();
    return true;
  }

  function getCustomSnippet(id: string): CustomSnippet | undefined {
    return customSnippets.value.find((item) => item.id === id);
  }

  function exportCustomSnippets(
    filterLanguage?: SnippetLanguageFilter,
  ): number {
    const target = filterLanguage
      ? customSnippets.value.filter((item) => item.language === filterLanguage)
      : customSnippets.value;

    if (target.length === 0) {
      return 0;
    }

    const textPayload = serializeSnippetsToText(target);
    downloadTextFile(
      textPayload,
      SNIPPETS_EXPORT_FILE_NAME,
      "text/plain;charset=utf-8",
    );
    trackSave("snippets-txt", "Save snippets: TXT");
    return target.length;
  }

  function importCustomSnippets(
    raw: string,
    mode: SnippetsImportMode,
  ): { imported: number; skipped: number } {
    const importedSnippets = parseSnippetsExportPayload(raw);

    if (mode === "replace") {
      const seenIds = new Set<string>();
      customSnippets.value = importedSnippets.map((snippet) => {
        const uniqueId = seenIds.has(snippet.id)
          ? createCustomSnippetId()
          : snippet.id;
        seenIds.add(uniqueId);
        return {
          ...snippet,
          id: uniqueId,
          updatedAt: new Date().toISOString(),
        };
      });
      persistCustomSnippets();
      return { imported: importedSnippets.length, skipped: 0 };
    }

    const existingIds = new Set(customSnippets.value.map((item) => item.id));
    const existingFingerprints = new Set(
      customSnippets.value.map(
        (item) => `${item.language}::${item.title.trim()}::${item.content.trim()}`,
      ),
    );
    const toAdd: CustomSnippet[] = [];
    let skipped = 0;

    for (const snippet of importedSnippets) {
      const fingerprint = `${snippet.language}::${snippet.title.trim()}::${snippet.content.trim()}`;
      if (existingIds.has(snippet.id) || existingFingerprints.has(fingerprint)) {
        skipped += 1;
        continue;
      }

      const newId = snippet.id || createCustomSnippetId();
      existingIds.add(newId);
      existingFingerprints.add(fingerprint);
      toAdd.push({
        ...snippet,
        id: newId,
        updatedAt: new Date().toISOString(),
      });
    }

    customSnippets.value = [...customSnippets.value, ...toAdd];
    persistCustomSnippets();
    return { imported: toAdd.length, skipped };
  }

  return {
    SNIPPET_LANGUAGE_IDS,
    SNIPPET_CATEGORY_IDS,
    customSnippets,
    activeLanguage,
    activeCategory,
    availableCategoryIds,
    searchQuery,
    setActiveLanguage,
    toggleLanguageTag,
    setActiveCategory,
    toggleCategoryTag,
    syncWithEditorContext,
    filterItems,
    addCustomSnippet,
    updateCustomSnippet,
    deleteCustomSnippet,
    getCustomSnippet,
    exportCustomSnippets,
    importCustomSnippets,
  };
}
