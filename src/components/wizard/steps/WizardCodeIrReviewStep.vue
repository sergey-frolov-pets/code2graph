<script setup lang="ts">
import type { DiagramIR } from "@/services/conversion/diagram-ir";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  ir: DiagramIR | null;
}>();

const emit = defineEmits<{
  "update-label": [nodeId: string, label: string];
}>();

const { t } = useLocale();
</script>

<template>
  <div class="wizard-step">
    <p class="wizard-hint">{{ t("codeGraph.irReviewHint") }}</p>
    <div v-if="ir" class="code-graph-ir-review">
      <table>
        <thead>
          <tr>
            <th>{{ t("codeGraph.irNodeId") }}</th>
            <th>{{ t("codeGraph.irNodeLabel") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="node in ir.nodes" :key="node.id">
            <td>{{ node.id }}</td>
            <td>
              <input
                :value="node.label"
                class="wizard-text-input"
                @input="emit('update-label', node.id, ($event.target as HTMLInputElement).value)"
              />
            </td>
          </tr>
        </tbody>
      </table>
      <p class="wizard-hint">{{ t("codeGraph.irEdgeCount", { count: ir.edges.length }) }}</p>
    </div>
    <p v-else class="wizard-hint">{{ t("codeGraph.irEmpty") }}</p>
  </div>
</template>

<style scoped>
.code-graph-ir-review {
  max-height: 360px;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  border-bottom: 1px solid var(--border-color, #ddd);
  padding: 6px 8px;
  text-align: left;
}
</style>
