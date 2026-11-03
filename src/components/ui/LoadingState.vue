<script setup lang="ts">
defineProps<{
  message?: string;
  detail?: string;
  compact?: boolean;
}>();
</script>

<template>
  <div class="loading-state" :class="{ 'loading-state--compact': compact }" role="status" aria-live="polite">
    <span class="loading-state__spinner" aria-hidden="true" />
    <span v-if="message" class="loading-state__message">{{ message }}</span>
    <span v-if="detail" class="loading-state__detail">{{ detail }}</span>
  </div>
</template>

<style scoped>
.loading-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 24px;
  color: var(--text-muted);
}

.loading-state--compact {
  padding: 12px;
}

.loading-state__spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: loading-spin 0.8s linear infinite;
}

.loading-state__message {
  font-size: 0.9rem;
}

.loading-state__detail {
  font-size: 0.82rem;
  color: var(--text-muted);
  text-align: center;
  max-width: 28rem;
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
