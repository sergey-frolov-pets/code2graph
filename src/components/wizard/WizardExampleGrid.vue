<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import WizardExampleActions from "@/components/wizard/WizardExampleActions.vue";
import WizardExampleCard from "@/components/wizard/WizardExampleCard.vue";
import WizardExamplePopover from "@/components/wizard/WizardExamplePopover.vue";
import WizardExampleThumb from "@/components/wizard/WizardExampleThumb.vue";
import { diagramExampleTitle } from "@/constants/diagram-example-text";
import type { DiagramExample } from "@/constants/diagram-example-catalog";
import type { GalleryExampleAction } from "@/constants/wizard-gallery";
import {
  WIZARD_GALLERY_HOVER_CLOSE_MS,
  WIZARD_GALLERY_LONG_PRESS_MOVE_PX,
  WIZARD_GALLERY_LONG_PRESS_MS,
} from "@/constants/wizard-gallery";
import { wizardThumbnailSvg } from "@/constants/wizard-thumbnails";
import { useLocale } from "@/composables/useLocale";
const props = defineProps<{
  examples: readonly DiagramExample[];
  pinnedId: string | null;
  actionsId: string | null;
  llmAvailable: boolean;
}>();

const emit = defineEmits<{
  "open-actions": [example: DiagramExample];
  "pin-card": [example: DiagramExample];
  choose: [example: DiagramExample, action: GalleryExampleAction];
  enlarge: [example: DiagramExample];
}>();

const { t, locale } = useLocale();

const hoveredId = ref<string | null>(null);
const anchor = ref<HTMLElement | null>(null);
const articles = new Map<string, HTMLElement>();

let pressTimer: ReturnType<typeof setTimeout> | null = null;
let hoverTimer: ReturnType<typeof setTimeout> | null = null;
let pressStartX = 0;
let pressStartY = 0;
let suppressClick = false;

const floatingId = computed(
  () => props.actionsId ?? props.pinnedId ?? hoveredId.value,
);
const floatingMode = computed(() => {
  if (props.actionsId) {
    return "actions" as const;
  }

  if (props.pinnedId || hoveredId.value) {
    return "card" as const;
  }

  return null;
});
const floatingExample = computed(
  () => props.examples.find((example) => example.id === floatingId.value) ?? null,
);
const floatingCanEnlarge = computed(() =>
  floatingExample.value ? thumbnailFor(floatingExample.value) !== null : false,
);
const floatingLayoutKey = computed(() =>
  floatingExample.value && floatingMode.value
    ? `${floatingExample.value.id}:${floatingMode.value}`
    : "",
);

function thumbnailFor(example: DiagramExample): string | null {
  return wizardThumbnailSvg(example.format, example.sampleId, locale.value);
}

function bindArticle(id: string, element: unknown): void {
  if (element instanceof HTMLElement) {
    articles.set(id, element);
    return;
  }

  articles.delete(id);
}

function clearPress(): void {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

function cancelHoverClose(): void {
  if (hoverTimer) {
    clearTimeout(hoverTimer);
    hoverTimer = null;
  }
}

function onPointerDown(example: DiagramExample, event: PointerEvent): void {
  if (event.button !== 0) {
    return;
  }

  pressStartX = event.clientX;
  pressStartY = event.clientY;
  clearPress();
  pressTimer = setTimeout(() => {
    pressTimer = null;
    suppressClick = true;
    emit("pin-card", example);
  }, WIZARD_GALLERY_LONG_PRESS_MS);
}

function onPointerMove(event: PointerEvent): void {
  if (!pressTimer) {
    return;
  }

  const distance = Math.hypot(event.clientX - pressStartX, event.clientY - pressStartY);
  if (distance > WIZARD_GALLERY_LONG_PRESS_MOVE_PX) {
    clearPress();
  }
}

function onPointerUp(): void {
  clearPress();
}

function onOpenClick(example: DiagramExample): void {
  if (suppressClick) {
    suppressClick = false;
    return;
  }

  emit("choose", example, "editor");
}

function onHoverStart(example: DiagramExample, event: PointerEvent): void {
  if (event.pointerType !== "mouse") {
    return;
  }

  cancelHoverClose();
  hoveredId.value = example.id;
}

function onHoverEnd(event: PointerEvent): void {
  if (event.pointerType !== "mouse") {
    return;
  }

  cancelHoverClose();
  hoverTimer = setTimeout(() => {
    hoveredId.value = null;
    hoverTimer = null;
  }, WIZARD_GALLERY_HOVER_CLOSE_MS);
}

function onEnlarge(example: DiagramExample): void {
  emit("enlarge", example);
}

watch(
  () => [floatingId.value, props.examples] as const,
  () => {
    const id = floatingId.value;
    if (id && !props.examples.some((example) => example.id === id)) {
      hoveredId.value = null;
    }

    const nextId = floatingId.value;
    anchor.value = nextId ? articles.get(nextId) ?? null : null;
  },
  { flush: "post", immediate: true },
);

onBeforeUnmount(() => {
  clearPress();
  cancelHoverClose();
});
</script>

<template>
  <div
    class="wizard-example-grid"
    role="list"
    :aria-label="t('llm.wizard.gallery.gridLabel')"
  >
    <article
      v-for="example in examples"
      :key="example.id"
      :ref="(element) => bindArticle(example.id, element)"
      class="wizard-example"
      :class="{
        'is-pinned': pinnedId === example.id,
        'is-actions': actionsId === example.id,
        'is-hover': hoveredId === example.id,
      }"
      role="listitem"
      @pointerdown="onPointerDown(example, $event)"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerenter="onHoverStart(example, $event)"
      @pointerleave="onHoverEnd"
    >
      <button
        type="button"
        class="wizard-example__open"
        :aria-label="diagramExampleTitle(example, t)"
        @click="onOpenClick(example)"
      >
        <WizardExampleThumb
          v-if="thumbnailFor(example)"
          :svg="thumbnailFor(example)!"
        />
        <span
          v-else
          class="wizard-example__fallback"
        >
          {{ diagramExampleTitle(example, t) }}
        </span>
      </button>
      <p class="wizard-example__title">
        {{ diagramExampleTitle(example, t) }}
      </p>
    </article>
    <WizardExamplePopover
      v-if="floatingExample && anchor && floatingMode"
      :anchor="anchor"
      :layout-key="floatingLayoutKey"
      @pointerenter="onHoverStart(floatingExample, $event)"
      @pointerleave="onHoverEnd"
    >
      <WizardExampleCard
        v-if="floatingMode === 'card'"
        :example="floatingExample"
        :llm-available="llmAvailable"
        :can-enlarge="floatingCanEnlarge"
        @choose="emit('choose', floatingExample, $event)"
        @enlarge="onEnlarge(floatingExample)"
      />
      <WizardExampleActions
        v-else
        :label="t('llm.wizard.gallery.actionsLabel')"
        :llm-available="llmAvailable"
        :can-enlarge="floatingCanEnlarge"
        @choose="emit('choose', floatingExample, $event)"
        @enlarge="onEnlarge(floatingExample)"
        @pointerdown.stop
      />
    </WizardExamplePopover>
  </div>
</template>

<style src="./wizard-modal.css"></style>
