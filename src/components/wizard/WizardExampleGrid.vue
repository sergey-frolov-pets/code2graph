<script setup lang="ts">
import WizardExampleActions from "@/components/wizard/WizardExampleActions.vue";
import WizardExampleCard from "@/components/wizard/WizardExampleCard.vue";
import { diagramExampleTitle } from "@/constants/diagram-example-text";
import type { DiagramExample } from "@/constants/diagram-example-catalog";
import type { GalleryExampleAction } from "@/constants/wizard-gallery";
import {
  WIZARD_GALLERY_LONG_PRESS_MOVE_PX,
  WIZARD_GALLERY_LONG_PRESS_MS,
} from "@/constants/wizard-gallery";
import { wizardThumbnailUrl } from "@/constants/wizard-thumbnails";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  examples: readonly DiagramExample[];
  pinnedId: string | null;
  actionsId: string | null;
}>();

const emit = defineEmits<{
  "open-actions": [example: DiagramExample];
  "pin-card": [example: DiagramExample];
  choose: [example: DiagramExample, action: GalleryExampleAction];
}>();

const { t, locale } = useLocale();

let pressTimer: ReturnType<typeof setTimeout> | null = null;
let pressStartX = 0;
let pressStartY = 0;
let suppressClick = false;

function clearPress(): void {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
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

  emit("open-actions", example);
}

function thumbnailFor(example: DiagramExample): string | null {
  return wizardThumbnailUrl(example.format, example.sampleId, locale.value);
}
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
      class="wizard-example"
      :class="{
        'is-pinned': pinnedId === example.id,
        'is-actions': actionsId === example.id,
      }"
      role="listitem"
      @pointerdown="onPointerDown(example, $event)"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <button
        type="button"
        class="wizard-example__open"
        :aria-label="diagramExampleTitle(example, t)"
        @click="onOpenClick(example)"
      >
        <img
          v-if="thumbnailFor(example)"
          class="wizard-example__image"
          :src="thumbnailFor(example) ?? undefined"
          alt=""
        >
        <span
          v-else
          class="wizard-example__fallback"
        >
          {{ diagramExampleTitle(example, t) }}
        </span>
      </button>
      <button
        type="button"
        class="wizard-example__details"
        @pointerdown.stop
        @click.stop="emit('pin-card', example)"
      >
        {{ t("llm.wizard.gallery.details") }}
      </button>
      <p class="wizard-example__title">
        {{ diagramExampleTitle(example, t) }}
      </p>
      <WizardExampleCard
        class="wizard-example__card"
        :example="example"
        @choose="emit('choose', example, $event)"
        @pointerdown.stop
      />
      <WizardExampleActions
        v-if="actionsId === example.id"
        class="wizard-example__menu"
        :label="t('llm.wizard.gallery.actionsLabel')"
        @choose="emit('choose', example, $event)"
        @pointerdown.stop
      />
    </article>
  </div>
</template>

<style src="./wizard-modal.css"></style>
