<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";

defineProps<{
  documents: Array<{ id: string; label: string }>;
  activeDocumentId: string;
}>();

const emit = defineEmits<{
  switch: [documentId: string];
  close: [documentId: string];
}>();

const { t } = useLocale();
</script>

<template>
  <div
    v-if="documents.length > 0"
    class="editor-tab-bar"
    role="tablist"
    data-testid="editor-tab-bar"
    :aria-label="t('editor.tabs.label')"
  >
    <div
      v-for="document in documents"
      :key="document.id"
      class="editor-tab-bar__tab"
      :class="{ 'is-active': document.id === activeDocumentId }"
      role="tab"
      :aria-selected="document.id === activeDocumentId"
    >
      <button
        type="button"
        class="editor-tab-bar__label"
        @click="emit('switch', document.id)"
      >
        {{ document.label }}
      </button>
      <button
        v-if="documents.length > 1"
        type="button"
        class="editor-tab-bar__close"
        :aria-label="t('editor.tabs.close', { label: document.label })"
        @click.stop="emit('close', document.id)"
      >
        ×
      </button>
    </div>
  </div>
</template>

<style scoped>
.editor-tab-bar {
  display: flex;
  gap: 4px;
  padding: 6px 8px 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--border);
  background: var(--surface-muted);
}

.editor-tab-bar__tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  background: color-mix(in srgb, var(--surface-muted) 80%, var(--surface));
  color: var(--text);
}

.editor-tab-bar__tab.is-active {
  background: var(--surface);
  color: var(--text);
  font-weight: 600;
}

.editor-tab-bar__label,
.editor-tab-bar__close {
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 6px 8px;
}

.editor-tab-bar__close {
  opacity: 0.7;
}
</style>
