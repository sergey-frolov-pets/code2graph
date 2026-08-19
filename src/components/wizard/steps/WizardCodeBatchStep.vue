<script setup lang="ts">
import type { CodeGraphBatchItem } from "@/composables/code-graph/useCodeAnalysisQueue";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  queue: CodeGraphBatchItem[];
  batchEnabled: boolean;
  isRunning: boolean;
  progressPercent: number;
}>();

const emit = defineEmits<{
  add: [];
  run: [];
}>();

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <p class="wizard-hint">{{ t("codeGraph.batchHint") }}</p>

    <div class="code-graph-batch-actions">
      <button type="button" class="wizard-secondary-btn" @click="emit('add')">
        {{ t("codeGraph.batchAddCurrent") }}
      </button>
      <button
        type="button"
        class="wizard-primary-btn"
        :disabled="!batchEnabled || queue.length === 0 || isRunning"
        @click="emit('run')"
      >
        {{ t("codeGraph.batchRun") }}
      </button>
    </div>

    <p v-if="!batchEnabled" class="wizard-hint">{{ t("codeGraph.batchProOnly") }}</p>

    <ul v-if="queue.length > 0" class="code-graph-batch-list">
      <li v-for="item in queue" :key="item.id">
        <span>{{ item.label }}</span>
        <span class="code-graph-batch-list__status">{{ item.status }}</span>
      </li>
    </ul>

    <progress v-if="isRunning" :max="100" :value="progressPercent" />
  </div>
</template>

<style scoped>
.code-graph-batch-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.code-graph-batch-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.code-graph-batch-list li {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid var(--border-color, #eee);
}

.code-graph-batch-list__status {
  opacity: 0.7;
}
</style>
