<script setup lang="ts">
import DiagramVersionsModal from "@/components/DiagramVersionsModal.vue";
import LibraryDiagramVersionsModal from "@/components/library/LibraryDiagramVersionsModal.vue";
import type { DiagramDto } from "@/constants/diagram-library";

defineProps<{
  source: "local" | "server";
  open: boolean;
  documentKey?: string;
  currentSource?: string;
  diagram?: DiagramDto | null;
  apiUrl?: string;
}>();

const emit = defineEmits<{
  close: [];
  restore: [source: string];
  restored: [diagram: DiagramDto];
}>();
</script>

<template>
  <DiagramVersionsModal
    v-if="source === 'local'"
    :open="open"
    :document-key="documentKey ?? ''"
    :current-source="currentSource ?? ''"
    @close="emit('close')"
    @restore="emit('restore', $event)"
  />
  <LibraryDiagramVersionsModal
    v-else
    :open="open"
    :diagram="diagram ?? null"
    :api-url="apiUrl"
    @close="emit('close')"
    @restored="emit('restored', $event)"
  />
</template>
