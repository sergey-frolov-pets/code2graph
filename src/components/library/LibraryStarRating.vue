<script setup lang="ts">
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

function onPick(star: number): void {
  if (props.readonly) {
    return;
  }
  emit("change", star);
}
</script>

<template>
  <span
    class="library-stars"
    :class="`library-stars--${size}`"
    role="img"
    :aria-label="value ? `${value}/5` : '0/5'"
  >
    <button
      v-for="star in 5"
      :key="star"
      class="library-stars__star"
      type="button"
      :class="{ 'is-active': value !== null && star <= value }"
      :disabled="readonly"
      :aria-label="`${star}`"
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
  color: var(--text-muted, #bbb);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.library-stars__star.is-active {
  color: #f5a623;
}

.library-stars__star:disabled {
  cursor: default;
}
</style>
