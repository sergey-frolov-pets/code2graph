<script setup lang="ts">
import WizardExampleActions from "@/components/wizard/WizardExampleActions.vue";
import {
  exampleTagKey,
  type DiagramExample,
  type ExampleTagRef,
} from "@/constants/diagram-example-catalog";
import {
  diagramExampleDescription,
  diagramExampleTitle,
  exampleTagLabel,
} from "@/constants/diagram-example-text";
import type { GalleryExampleAction } from "@/constants/wizard-gallery";
import { useLocale } from "@/composables/useLocale";
import { computed } from "vue";

const props = defineProps<{
  example: DiagramExample;
  llmAvailable: boolean;
  canEnlarge: boolean;
}>();

const emit = defineEmits<{
  choose: [action: GalleryExampleAction];
  enlarge: [];
}>();

const { t } = useLocale();

const title = computed(() => diagramExampleTitle(props.example, t));
const description = computed(() => diagramExampleDescription(props.example, t));
const languageTag = computed(() =>
  props.example.tags.find((tag) => tag.axis === "language"),
);
const domainTags = computed(() =>
  props.example.tags.filter((tag) => tag.axis === "domain"),
);
const otherTags = computed(() =>
  props.example.tags.filter(
    (tag) => tag.axis !== "domain" && tag.axis !== "language",
  ),
);

function labelFor(tag: ExampleTagRef): string {
  return exampleTagLabel(tag, t);
}
</script>

<template>
  <article
    class="wizard-example-card"
    role="dialog"
    :aria-label="t('llm.wizard.gallery.cardLabel')"
  >
    <p class="wizard-example-card__language">
      {{ languageTag ? labelFor(languageTag) : "" }}
    </p>
    <h3 class="wizard-example-card__title">
      {{ title }}
    </h3>
    <p class="wizard-example-card__description">
      {{ description }}
    </p>
    <p class="wizard-example-card__group">
      {{ t("llm.wizard.gallery.domainsLabel") }}
    </p>
    <ul class="wizard-example-card__tags">
      <li
        v-for="tag in domainTags"
        :key="exampleTagKey(tag)"
        class="wizard-tag"
        :class="`wizard-tag--${tag.axis}`"
      >
        {{ labelFor(tag) }}
      </li>
    </ul>
    <p class="wizard-example-card__group">
      {{ t("llm.wizard.gallery.tagsLabel") }}
    </p>
    <ul class="wizard-example-card__tags">
      <li
        v-for="tag in otherTags"
        :key="exampleTagKey(tag)"
        class="wizard-tag"
        :class="`wizard-tag--${tag.axis}`"
      >
        {{ labelFor(tag) }}
      </li>
    </ul>
    <WizardExampleActions
      :label="t('llm.wizard.gallery.actionsLabel')"
      :llm-available="llmAvailable"
      :can-enlarge="canEnlarge"
      @choose="emit('choose', $event)"
      @enlarge="emit('enlarge')"
    />
  </article>
</template>

<style src="./wizard-modal.css"></style>
