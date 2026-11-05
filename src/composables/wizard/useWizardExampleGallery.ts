import { computed, ref } from "vue";
import {
  exampleTagKey,
  filterDiagramExamples,
  listCloudTags,
  listDiagramExamples,
  type ExampleTagRef,
} from "@/constants/diagram-example-catalog";
import { diagramExampleSearchText } from "@/constants/diagram-example-text";
import { useLocale } from "@/composables/useLocale";
import type { TranslateFn } from "@/locales/types";

export function useWizardExampleGallery(t: TranslateFn) {
  const { locale } = useLocale();
  const selectedTags = ref<ExampleTagRef[]>([]);
  const query = ref("");
  const examples = listDiagramExamples();

  const cloudTags = computed(() => listCloudTags(examples));

  const visibleExamples = computed(() =>
    filterDiagramExamples(
      examples,
      selectedTags.value,
      query.value,
      (example) => diagramExampleSearchText(example, t, locale.value),
    ),
  );

  function isTagSelected(tag: ExampleTagRef): boolean {
    const key = exampleTagKey(tag);
    return selectedTags.value.some((item) => exampleTagKey(item) === key);
  }

  function toggleTag(tag: ExampleTagRef): void {
    if (isTagSelected(tag)) {
      const key = exampleTagKey(tag);
      selectedTags.value = selectedTags.value.filter(
        (item) => exampleTagKey(item) !== key,
      );
      return;
    }

    selectedTags.value = [...selectedTags.value, { axis: tag.axis, id: tag.id }];
  }

  function resetFilters(): void {
    selectedTags.value = [];
    query.value = "";
  }

  return {
    selectedTags,
    query,
    cloudTags,
    visibleExamples,
    isTagSelected,
    toggleTag,
    resetFilters,
  };
}
