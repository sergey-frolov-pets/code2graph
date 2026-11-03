<script setup lang="ts">
defineProps<{
  title: string;
  description?: string;
  actionLabel?: string;
}>();

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="empty-state" role="status">
    <p class="empty-state__title">{{ title }}</p>
    <p v-if="description" class="empty-state__description">{{ description }}</p>
    <button
      v-if="actionLabel"
      type="button"
      class="btn btn-primary"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: grid;
  justify-items: center;
  gap: 8px;
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
}

.empty-state__title {
  margin: 0;
  font-size: 1rem;
  color: var(--text);
}

.empty-state__description {
  margin: 0;
  font-size: 0.9rem;
}
</style>
