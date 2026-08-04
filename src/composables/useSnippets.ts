import { computed, ref } from "vue";
import { BUILTIN_SNIPPETS } from "@/constants/builtin-snippets";
import {
  SNIPPET_CATEGORY_IDS,
  type CustomSnippet,
  type SnippetCategoryId,
  type SnippetListItem,
} from "@/types/snippets";
import {
  createCustomSnippetId,
  loadCustomSnippets,
  saveCustomSnippets,
} from "@/utils/snippet-store";

export function useSnippets() {
  const customSnippets = ref<CustomSnippet[]>(loadCustomSnippets());
  const activeCategory = ref<SnippetCategoryId | "all" | "custom">("all");
  const searchQuery = ref("");

  function persistCustomSnippets(): void {
    saveCustomSnippets(customSnippets.value);
  }

  const allItems = computed<SnippetListItem[]>(() => {
    const builtin: SnippetListItem[] = BUILTIN_SNIPPETS.map((snippet) => ({
      kind: "builtin",
      id: snippet.id,
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

  function matchesSearch(
    item: SnippetListItem,
    query: string,
    t: (key: string) => string,
  ): boolean {
    if (!query.trim()) {
      return true;
    }

    const normalized = query.trim().toLowerCase();

    if (item.kind === "builtin") {
      const title = t(item.titleKey).toLowerCase();
      const description = item.descriptionKey
        ? t(item.descriptionKey).toLowerCase()
        : "";
      return (
        title.includes(normalized) ||
        description.includes(normalized) ||
        item.content.toLowerCase().includes(normalized)
      );
    }

    const title = item.snippet.title.toLowerCase();
    const description = (item.snippet.description ?? "").toLowerCase();
    return (
      title.includes(normalized) ||
      description.includes(normalized) ||
      item.snippet.content.toLowerCase().includes(normalized)
    );
  }

  function matchesCategory(item: SnippetListItem): boolean {
    if (activeCategory.value === "all") {
      return true;
    }

    if (activeCategory.value === "custom") {
      return item.kind === "custom";
    }

    return item.kind === "builtin" && item.categoryId === activeCategory.value;
  }

  function filterItems(t: (key: string) => string): SnippetListItem[] {
    return allItems.value.filter(
      (item) =>
        matchesCategory(item) &&
        matchesSearch(item, searchQuery.value, t),
    );
  }

  function addCustomSnippet(payload: {
    title: string;
    content: string;
    description?: string;
    categoryId?: SnippetCategoryId | "custom";
  }): CustomSnippet {
    const now = new Date().toISOString();
    const snippet: CustomSnippet = {
      id: createCustomSnippetId(),
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

  return {
    SNIPPET_CATEGORY_IDS,
    customSnippets,
    activeCategory,
    searchQuery,
    filterItems,
    addCustomSnippet,
    updateCustomSnippet,
    deleteCustomSnippet,
    getCustomSnippet,
  };
}
