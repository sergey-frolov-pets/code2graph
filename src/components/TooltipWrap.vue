<script setup lang="ts">
import { ref, toRef } from 'vue';
import { useLongPressTooltip } from '@/composables/useLongPressTooltip';

const props = defineProps<{
  label: string;
}>();

const rootRef = ref<HTMLElement | null>(null);

const {
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onTouchStart,
  onTouchEnd,
  onTouchCancel,
  onMouseEnter,
  onMouseLeave,
} = useLongPressTooltip(rootRef, toRef(props, 'label'));
</script>

<template>
  <span
    ref="rootRef"
    class="tooltip-wrap"
    @pointerdown.capture="onPointerDown"
    @pointerup.capture="onPointerUp"
    @pointercancel.capture="onPointerCancel"
    @touchstart.capture.passive="onTouchStart"
    @touchend.capture="onTouchEnd"
    @touchcancel.capture="onTouchCancel"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @contextmenu.prevent
  >
    <slot />
  </span>
</template>

<style scoped>
.tooltip-wrap {
  position: relative;
  display: inline-flex;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}
</style>
