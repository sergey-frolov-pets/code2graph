<script setup lang="ts">
import { ref, toRef } from 'vue';
import { useLongPressTooltip } from '@/composables/useLongPressTooltip';

const props = defineProps<{
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  primary?: boolean;
  format?: boolean;
  extraClass?: string;
  preventMousedownDefault?: boolean;
}>();

const emit = defineEmits<{
  click: [event: MouseEvent];
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
  consumeSuppressClick,
} = useLongPressTooltip(rootRef, toRef(props, 'label'));

function onMousedown(event: MouseEvent): void {
  if (props.preventMousedownDefault) {
    event.preventDefault();
  }
}

function onClick(event: MouseEvent): void {
  if (consumeSuppressClick()) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  emit('click', event);
}
</script>

<template>
  <button
    ref="rootRef"
    type="button"
    class="icon-btn btn btn-icon"
    :class="[
      props.extraClass,
      {
        'btn-primary': primary,
        'btn-format': format,
        'icon-btn--pressed': pressed,
      },
    ]"
    :disabled="disabled"
    :aria-label="label"
    :aria-pressed="pressed !== undefined ? pressed : undefined"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @touchstart.passive="onTouchStart"
    @touchend="onTouchEnd"
    @touchcancel="onTouchCancel"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @contextmenu.prevent
    @mousedown="onMousedown"
    @click="onClick"
  >
    <slot />
  </button>
</template>

<style scoped>
.icon-btn {
  position: relative;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.icon-btn--pressed {
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
}
</style>
