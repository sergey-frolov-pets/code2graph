<script setup lang="ts">
import { computed, inject, ref, toRef, watch } from 'vue';
import {
  iconButtonTooltipsSuspendedKey,
  useLongPressTooltip,
} from '@/composables/useLongPressTooltip';

const props = defineProps<{
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  primary?: boolean;
  success?: boolean;
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
  hideTooltip,
  consumeSuppressClick,
} = useLongPressTooltip(rootRef, toRef(props, 'label'));

const tooltipsSuspended = inject(iconButtonTooltipsSuspendedKey, computed(() => false));

watch(tooltipsSuspended, (suspended) => {
  if (suspended) {
    hideTooltip();
  }
});

function onMouseEnterGuarded(): void {
  if (tooltipsSuspended.value) {
    return;
  }
  onMouseEnter();
}

function onPointerDownGuarded(event: PointerEvent): void {
  if (tooltipsSuspended.value) {
    return;
  }
  onPointerDown(event);
}

function onTouchStartGuarded(event: TouchEvent): void {
  if (tooltipsSuspended.value) {
    return;
  }
  onTouchStart(event);
}

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
        'btn-success': success,
        'btn-format': format,
        'icon-btn--pressed': pressed,
      },
    ]"
    :disabled="disabled"
    :aria-label="label"
    :aria-pressed="pressed !== undefined ? pressed : undefined"
    @pointerdown="onPointerDownGuarded"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @touchstart.passive="onTouchStartGuarded"
    @touchend="onTouchEnd"
    @touchcancel="onTouchCancel"
    @mouseenter="onMouseEnterGuarded"
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
