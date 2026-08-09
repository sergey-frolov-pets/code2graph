<script setup lang="ts">
import { ref } from "vue";
import type { CodeFoldRegion } from "@/utils/code-folds";
import type { GutterRow } from "@/composables/editor/useEditorDisplayModel";
import { useLocale } from "@/composables/useLocale";

const gutterRef = ref<HTMLDivElement | null>(null);
const regionsButtonRef = ref<HTMLButtonElement | null>(null);

defineExpose({
  get gutterEl() {
    return gutterRef.value;
  },
  get regionsButtonEl() {
    return regionsButtonRef.value;
  },
});

defineProps<{
  gutterRows: GutterRow[];
  useLineVirtualization: boolean;
  isLineInFoldSelection: (sourceLine: number) => boolean;
  regionsModalOpen: boolean;
}>();

const emit = defineEmits<{
  gutterMouseDown: [sourceLine: number, event: MouseEvent];
  gutterMouseEnter: [sourceLine: number];
  foldToggleClick: [fold: CodeFoldRegion, event: MouseEvent];
  foldRemove: [foldId: string, event: MouseEvent];
  gutterLineTap: [sourceLine: number];
  openRegionsModal: [];
}>();

const { t } = useLocale();

function onGutterLinePointerDown(
  sourceLine: number,
  event: MouseEvent,
): void {
  if (event.button !== 0) {
    return;
  }

  emit("gutterMouseDown", sourceLine, event);
}

function onGutterLineClick(
  sourceLine: number,
  regionsModalOpen: boolean,
  event: MouseEvent,
): void {
  if (!regionsModalOpen) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  emit("gutterLineTap", sourceLine);
}
</script>

<template>
  <div class="code-editor__gutter-wrap">
    <div
      ref="gutterRef"
      class="code-editor__gutter"
      :class="{ 'is-line-pick-active': regionsModalOpen }"
      :title="regionsModalOpen ? t('editor.regions.tapHint') : t('editor.foldCreate')"
      aria-hidden="true"
    >
      <div
        v-for="row in gutterRows"
        :key="row.key"
        class="code-editor__gutter-line"
        :class="{
          'is-fold-selection': isLineInFoldSelection(row.sourceLine),
          'is-placeholder': row.visibleLine.kind === 'placeholder',
          'editor-virtual-line': useLineVirtualization,
        }"
        @mousedown="onGutterLinePointerDown(row.sourceLine, $event)"
        @mouseenter="emit('gutterMouseEnter', row.sourceLine)"
        @click="onGutterLineClick(row.sourceLine, regionsModalOpen, $event)"
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

    <button
      ref="regionsButtonRef"
      type="button"
      class="code-editor__gutter-regions-btn"
      :title="t('editor.regions.open')"
      :aria-label="t('editor.regions.open')"
      :aria-expanded="regionsModalOpen"
      @click="emit('openRegionsModal')"
    >
      ⋯
    </button>
  </div>
</template>
