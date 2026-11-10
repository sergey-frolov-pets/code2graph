<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import WizardExampleGrid from "@/components/wizard/WizardExampleGrid.vue";
import WizardExampleSearch from "@/components/wizard/WizardExampleSearch.vue";
import WizardExampleZoom from "@/components/wizard/WizardExampleZoom.vue";
import WizardTagCloud from "@/components/wizard/WizardTagCloud.vue";
import { useWizardExampleGallery } from "@/composables/wizard/useWizardExampleGallery";
import { exampleTagKey, type DiagramExample } from "@/constants/diagram-example-catalog";
import {
  diagramExamplePrompt,
  diagramExampleTitle,
} from "@/constants/diagram-example-text";
import {
  WIZARD_GALLERY_POPOVER_CLASS,
  WIZARD_GALLERY_SEARCH_TRACK_MS,
  type GalleryExampleAction,
} from "@/constants/wizard-gallery";
import { diagramAnalyticsKind, trackEvent } from "@/analytics";
import { useLocale } from "@/composables/useLocale";

const emit = defineEmits<{
  choose: [payload: {
    example: DiagramExample;
    action: GalleryExampleAction;
    label: string;
    prompt: string;
  }];
}>();

const { t } = useLocale();
const {
  query,
  cloudTags,
  visibleExamples,
  isTagSelected,
  toggleTag,
  resetFilters,
  selectedTags,
} = useWizardExampleGallery(t);

const pinnedId = ref<string | null>(null);
const actionsId = ref<string | null>(null);
const zoomExample = ref<DiagramExample | null>(null);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

watch(query, (value) => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return;
  }

  searchTimer = setTimeout(() => {
    trackEvent(
      "wizard-gallery-search",
      `Wizard gallery search: ${trimmed.length}`,
    );
  }, WIZARD_GALLERY_SEARCH_TRACK_MS);
});

function onToggle(tag: DiagramExample["tags"][number]): void {
  pinnedId.value = null;
  actionsId.value = null;
  toggleTag(tag);
  trackEvent(
    "wizard-gallery-filter",
    `Wizard gallery filter: ${selectedTags.value.map(exampleTagKey).join(" ")}`,
  );
}

function onReset(): void {
  pinnedId.value = null;
  actionsId.value = null;
  resetFilters();
}

function onOpenActions(example: DiagramExample): void {
  pinnedId.value = null;
  actionsId.value = example.id;
}

function onPinCard(example: DiagramExample): void {
  actionsId.value = null;
  pinnedId.value = example.id;
}

function onEnlarge(example: DiagramExample): void {
  pinnedId.value = null;
  actionsId.value = null;
  zoomExample.value = example;
}

function onChoose(example: DiagramExample, action: GalleryExampleAction): void {
  const kind = diagramAnalyticsKind(example.format, example.diagramType);
  trackEvent(
    `wizard-gallery-${action}-${kind}`,
    `Wizard gallery ${action}: ${example.format} / ${example.diagramType}`,
  );
  emit("choose", {
    example,
    action,
    label: diagramExampleTitle(example, t),
    prompt: diagramExamplePrompt(example, t),
  });
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key !== "Escape") {
    return;
  }

  if (!pinnedId.value && !actionsId.value) {
    return;
  }

  event.stopPropagation();
  pinnedId.value = null;
  actionsId.value = null;
}

function onWindowPointerDown(event: PointerEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  if (target.closest(`.wizard-example, .${WIZARD_GALLERY_POPOVER_CLASS}`)) {
    return;
  }

  pinnedId.value = null;
  actionsId.value = null;
}

window.addEventListener("keydown", onKeydown);
window.addEventListener("pointerdown", onWindowPointerDown);

onBeforeUnmount(() => {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("pointerdown", onWindowPointerDown);
});
</script>

<template>
  <section
    class="wizard-gallery"
    data-testid="wizard-example-gallery"
  >
    <div class="wizard-gallery__toolbar">
      <WizardExampleSearch v-model="query" />
      <button
        type="button"
        class="wizard-gallery__reset"
        @click="onReset"
      >
        {{ t("llm.wizard.gallery.reset") }}
      </button>
    </div>
    <WizardTagCloud
      :tags="cloudTags"
      :is-selected="isTagSelected"
      @toggle="onToggle"
    />
    <p
      v-if="visibleExamples.length === 0"
      class="wizard-gallery__empty"
    >
      {{ t("llm.wizard.gallery.empty") }}
    </p>
    <WizardExampleGrid
      v-else
      :examples="visibleExamples"
      :pinned-id="pinnedId"
      :actions-id="actionsId"
      @open-actions="onOpenActions"
      @pin-card="onPinCard"
      @choose="onChoose"
      @enlarge="onEnlarge"
    />
    <WizardExampleZoom
      :example="zoomExample"
      @close="zoomExample = null"
    />
  </section>
</template>

<style src="./wizard-modal.css"></style>
