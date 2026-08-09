<script setup lang="ts">
import { computed } from "vue";
import { useLocale } from "@/composables/useLocale";

const props = withDefaults(
  defineProps<{
    value: number | null;
    readonly?: boolean;
    size?: "sm" | "md";
  }>(),
  {
    readonly: false,
    size: "md",
  },
);

const emit = defineEmits<{
  change: [rating: number];
}>();

const { t } = useLocale();

const ariaLabel = computed(() =>
  t("library.ratingOutOfFive", { value: props.value ?? 0 }),
);

function onPick(star: number): void {
  if (props.readonly) {
    return;
  }
  emit("change", star);
}

function starLabel(star: number): string {
  return t("library.starLabel", { star });
}
</script>

<template>
  <span
    class="library-stars"
    :class="`library-stars--${size}`"
    role="img"
    :aria-label="ariaLabel"
  >
    <button
      v-for="star in 5"
      :key="star"
      class="library-stars__star"
      type="button"
      :class="{ 'is-active': value !== null && star <= value }"
      :disabled="readonly"
      :aria-label="starLabel(star)"
      @click="onPick(star)"
    >
      ★
    </button>
  </span>
</template>

<style scoped>
.library-stars {
  display: inline-flex;
  gap: 2px;
}

.library-stars--sm .library-stars__star {
  font-size: 0.85rem;
}

.library-stars--md .library-stars__star {
  font-size: 1.1rem;
}

.library-stars__star {
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.library-stars__star.is-active {
  color: var(--star-active);
}

.library-stars__star:disabled {
  cursor: default;
}
</style>
