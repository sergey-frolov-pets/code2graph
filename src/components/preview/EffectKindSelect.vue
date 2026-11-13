<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";
import type { Component } from "vue";
import type { CSSProperties } from "vue";
import {
  Activity,
  ArrowDownFromLine,
  ArrowDownToLine,
  ArrowLeftFromLine,
  ArrowLeftToLine,
  ArrowRightFromLine,
  ArrowRightToLine,
  ArrowUpFromLine,
  ArrowUpToLine,
  ChevronDown,
  PanelLeft,
  RotateCw,
  Shrink,
  Sparkle,
  Sunrise,
  Sunset,
  WavesHorizontal,
  ZoomIn,
} from "@lucide/vue";
import { FRAME_EFFECT_KINDS } from "@/services/presentation/types";
import type { FrameEffectKind } from "@/services/presentation/types";
import type { TranslateFn } from "@/locales/types";
import { PRESENTATION_EFFECT_MENU_Z_INDEX } from "@/storage/presentation-dock";

const EFFECT_ICON_SIZE = 16;
const EFFECT_ICON_STROKE = 1.8;
const EFFECT_MENU_GAP = 4;
const EFFECT_MENU_EDGE = 8;
const EFFECT_MENU_MIN_WIDTH = 220;
const EFFECT_MENU_MAX_HEIGHT = 280;
const EFFECT_MENU_OPEN_UP_THRESHOLD = 160;

const EFFECT_KIND_ICONS: Record<FrameEffectKind, Component> = {
  fade: Sunrise,
  pulse: Activity,
  zoom: ZoomIn,
  flyInLeft: ArrowRightFromLine,
  flyInRight: ArrowLeftFromLine,
  flyInUp: ArrowDownFromLine,
  flyInDown: ArrowUpFromLine,
  flyOutLeft: ArrowLeftToLine,
  flyOutRight: ArrowRightToLine,
  flyOutUp: ArrowUpToLine,
  flyOutDown: ArrowDownToLine,
  fadeOut: Sunset,
  tear: WavesHorizontal,
  wipe: PanelLeft,
  spin: RotateCw,
  pop: Sparkle,
  shrink: Shrink,
};

defineProps<{
  kind: FrameEffectKind;
  t: TranslateFn;
}>();

const emit = defineEmits<{
  change: [kind: FrameEffectKind];
}>();

const open = ref(false);
const triggerRef = ref<HTMLButtonElement | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const menuStyle = ref<CSSProperties>({});

function placeMenu(): void {
  const trigger = triggerRef.value;
  if (!trigger) {
    return;
  }
  const rect = trigger.getBoundingClientRect();
  const width = Math.max(rect.width, EFFECT_MENU_MIN_WIDTH);
  const left = Math.min(
    Math.max(EFFECT_MENU_EDGE, rect.left),
    window.innerWidth - width - EFFECT_MENU_EDGE,
  );
  const spaceBelow = window.innerHeight - rect.bottom - EFFECT_MENU_GAP;
  const spaceAbove = rect.top - EFFECT_MENU_GAP;
  const openUp = spaceBelow < EFFECT_MENU_OPEN_UP_THRESHOLD && spaceAbove > spaceBelow;
  const maxHeight = Math.min(EFFECT_MENU_MAX_HEIGHT, Math.max(openUp ? spaceAbove : spaceBelow, 0));
  menuStyle.value = {
    left: `${left}px`,
    width: `${width}px`,
    maxHeight: `${maxHeight}px`,
    zIndex: PRESENTATION_EFFECT_MENU_Z_INDEX,
    ...(openUp
      ? { bottom: `${window.innerHeight - rect.top + EFFECT_MENU_GAP}px` }
      : { top: `${rect.bottom + EFFECT_MENU_GAP}px` }),
  };
}

function onPointerDown(event: Event): void {
  const target = event.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (triggerRef.value?.contains(target) || menuRef.value?.contains(target)) {
    return;
  }
  open.value = false;
}

function onKeyDown(event: Event): void {
  if (event instanceof KeyboardEvent && event.key === "Escape") {
    open.value = false;
  }
}

function listen(active: boolean): void {
  if (active) {
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("scroll", placeMenu, true);
    window.addEventListener("resize", placeMenu);
    return;
  }
  document.removeEventListener("pointerdown", onPointerDown, true);
  document.removeEventListener("keydown", onKeyDown);
  document.removeEventListener("scroll", placeMenu, true);
  window.removeEventListener("resize", placeMenu);
}

watch(open, (isOpen) => {
  if (!isOpen) {
    listen(false);
    return;
  }
  placeMenu();
  listen(true);
});

onUnmounted(() => {
  listen(false);
});

function toggle(): void {
  open.value = !open.value;
}

function choose(kind: FrameEffectKind): void {
  emit("change", kind);
  open.value = false;
}
</script>

<template>
  <button
    ref="triggerRef"
    type="button"
    class="effect-kind"
    :aria-label="t('presentation.effectKind')"
    aria-haspopup="listbox"
    :aria-expanded="open"
    @click="toggle"
  >
    <component
      :is="EFFECT_KIND_ICONS[kind]"
      class="effect-kind__icon"
      :size="EFFECT_ICON_SIZE"
      :stroke-width="EFFECT_ICON_STROKE"
      aria-hidden="true"
    />
    <span>{{ t(`presentation.effect.${kind}`) }}</span>
    <ChevronDown
      class="effect-kind__chevron"
      :class="{ 'is-open': open }"
      :size="EFFECT_ICON_SIZE"
      :stroke-width="EFFECT_ICON_STROKE"
      aria-hidden="true"
    />
  </button>
  <Teleport to="body">
    <ul
      v-if="open"
      ref="menuRef"
      class="effect-kind-menu"
      role="listbox"
      :aria-label="t('presentation.effectKind')"
      :style="menuStyle"
    >
      <li
        v-for="item in FRAME_EFFECT_KINDS"
        :key="item"
        role="presentation"
      >
        <button
          type="button"
          role="option"
          :aria-selected="item === kind"
          :data-effect-kind="item"
          @click="choose(item)"
        >
          <component
            :is="EFFECT_KIND_ICONS[item]"
            class="effect-kind__icon"
            :size="EFFECT_ICON_SIZE"
            :stroke-width="EFFECT_ICON_STROKE"
            aria-hidden="true"
          />
          <span>{{ t(`presentation.effect.${item}`) }}</span>
        </button>
      </li>
    </ul>
  </Teleport>
</template>

<style scoped>
.effect-kind {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: var(--btn-sm);
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.effect-kind span,
.effect-kind-menu span {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.effect-kind__icon {
  flex: 0 0 auto;
}

.effect-kind__chevron {
  flex: 0 0 auto;
  color: var(--text-muted);
  transition: transform 0.15s ease;
}

.effect-kind__chevron.is-open {
  transform: rotate(180deg);
}

.effect-kind-menu {
  position: fixed;
  margin: 0;
  padding: 4px;
  overflow: auto;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);
}

.effect-kind-menu button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: var(--btn-sm);
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.effect-kind-menu button:hover,
.effect-kind-menu button[aria-selected="true"] {
  background: var(--surface-muted);
}

.effect-kind-menu button[aria-selected="true"] {
  color: var(--accent);
}
</style>
