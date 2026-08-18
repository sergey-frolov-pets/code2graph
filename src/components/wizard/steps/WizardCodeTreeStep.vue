<script setup lang="ts">
import type { ProjectTreeNode } from "@/services/code-graph/ir/code-project-ir";
import { flattenProjectTree } from "@/services/code-graph/ingest/build-project-tree";
import { useLocale } from "@/composables/useLocale";
import { computed } from "vue";

const props = defineProps<{
  tree: ProjectTreeNode | null;
  progressCompleted: number;
  progressTotal: number;
  currentPath: string;
}>();

const emit = defineEmits<{
  toggle: [nodeId: string, checked: boolean];
}>();

const { t } = useLocale();

const flatNodes = computed(() =>
  props.tree ? flattenProjectTree(props.tree).filter((node) => node.kind !== "project") : [],
);
</script>

<template>
  <div class="wizard-step">
    <p class="wizard-hint">{{ t("codeGraph.treeHint") }}</p>

    <div v-if="progressTotal > 0" class="code-graph-progress">
      <progress :max="progressTotal" :value="progressCompleted" />
      <span>{{ progressCompleted }} / {{ progressTotal }}</span>
      <span class="code-graph-progress__path">{{ currentPath }}</span>
    </div>

    <div v-if="tree" class="code-graph-tree" role="tree">
      <label
        v-for="node in flatNodes"
        :key="node.id"
        class="code-graph-tree__row"
        :style="{ paddingLeft: `${16 + node.depth * 16}px` }"
      >
        <input
          type="checkbox"
          :checked="node.checked"
          :indeterminate="node.indeterminate"
          @change="emit('toggle', node.id, ($event.target as HTMLInputElement).checked)"
        />
        <span class="code-graph-tree__kind">{{ node.kind }}</span>
        <span>{{ node.label }}</span>
      </label>
    </div>

    <p v-else class="wizard-hint">{{ t("codeGraph.noProjectLoaded") }}</p>
  </div>
</template>

<style src="../wizard-modal.css"></style>
<style scoped>
.code-graph-tree {
  max-height: 360px;
  overflow: auto;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 8px;
}

.code-graph-tree__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--border-color, #eee);
}

.code-graph-tree__kind {
  font-size: 11px;
  opacity: 0.7;
  min-width: 52px;
}

.code-graph-progress {
  display: grid;
  gap: 4px;
  margin-bottom: 12px;
}

.code-graph-progress__path {
  font-size: 12px;
  opacity: 0.75;
  word-break: break-all;
}
</style>
