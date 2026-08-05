<script setup lang="ts">
import { ref } from "vue";
import type { CodeFoldRegion } from "@/utils/code-folds";
import type { GutterRow } from "@/composables/editor/useEditorDisplayModel";
import { useLocale } from "@/composables/useLocale";

const gutterRef = ref<HTMLDivElement | null>(null);

defineExpose({
  get gutterEl() {
    return gutterRef.value;
  },
});

defineProps<{
  gutterRows: GutterRow[];
  isLineInFoldSelection: (sourceLine: number) => boolean;
}>();

const emit = defineEmits<{
  gutterMouseDown: [sourceLine: number, event: MouseEvent];
  gutterMouseEnter: [sourceLine: number];
  foldToggleClick: [fold: CodeFoldRegion, event: MouseEvent];
  foldRemove: [foldId: string, event: MouseEvent];
}>();

const { t } = useLocale();
</script>

<template>
  <div
    ref="gutterRef"
    class="code-editor__gutter"
    :title="t('editor.foldCreate')"
    aria-hidden="true"
  >
    <div
      v-for="row in gutterRows"
      :key="row.key"
      class="code-editor__gutter-line"
      :class="{
        'is-fold-selection': isLineInFoldSelection(row.sourceLine),
        'is-placeholder': row.visibleLine.kind === 'placeholder',
      }"
      @mousedown="emit('gutterMouseDown', row.sourceLine, $event)"
      @mouseenter="emit('gutterMouseEnter', row.sourceLine)"
    >
      <button
        v-if="row.fold"
        type="button"
        class="code-editor__fold-toggle"
        :title="
          row.fold.collapsed
            ? `${t('editor.foldToggle')} · ${t('editor.foldRemove')}`
            : `${t('editor.foldToggle')} · ${t('editor.foldRemove')}`
        "
        :aria-label="t('editor.foldToggle')"
        @mousedown.stop
        @mouseup.stop
        @click.stop="emit('foldToggleClick', row.fold, $event)"
        @contextmenu.prevent="emit('foldRemove', row.fold.id, $event)"
      >
        {{ row.fold.collapsed ? "\u25B6" : "\u25BC" }}
      </button>
      <span v-else class="code-editor__fold-spacer" aria-hidden="true" />
      <span class="code-editor__gutter-number">
        <template v-if="row.lineNumber !== null">
          {{ row.lineNumber }}
        </template>
        <template v-else>⋯</template>
      </span>
    </div>
  </div>
</template>
