<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useTooltipRegistry } from "@/composables/useTooltipRegistry";

const { tooltipState, hideAll } = useTooltipRegistry();
const tooltipRef = ref<HTMLElement | null>(null);
const position = ref({ top: 0, left: 0 });
const placement = ref<"top" | "bottom">("top");

const TOOLTIP_OFFSET_PX = 8;
const VIEWPORT_MARGIN_PX = 8;
const TOOLTIP_ESTIMATED_WIDTH_PX = 200;
const TOOLTIP_ESTIMATED_HEIGHT_PX = 40;

function clampPosition(): void {
  const entry = tooltipState.value;
  if (!entry) {
    return;
  }

  const anchorRect = entry.anchor.getBoundingClientRect();
  const tooltip = tooltipRef.value;
  const tooltipWidth = tooltip?.offsetWidth ?? TOOLTIP_ESTIMATED_WIDTH_PX;
  const tooltipHeight = tooltip?.offsetHeight ?? TOOLTIP_ESTIMATED_HEIGHT_PX;
  const halfWidth = tooltipWidth / 2;

  let left = anchorRect.left + anchorRect.width / 2;
  left = Math.max(
    VIEWPORT_MARGIN_PX + halfWidth,
    Math.min(window.innerWidth - VIEWPORT_MARGIN_PX - halfWidth, left),
  );

  const spaceAbove = anchorRect.top - VIEWPORT_MARGIN_PX;
  const spaceBelow = window.innerHeight - anchorRect.bottom - VIEWPORT_MARGIN_PX;
  let nextPlacement: "top" | "bottom" = "top";
  let top = anchorRect.top - TOOLTIP_OFFSET_PX;

  if (
    spaceAbove < tooltipHeight + TOOLTIP_OFFSET_PX &&
    spaceBelow > spaceAbove
  ) {
    nextPlacement = "bottom";
    top = anchorRect.bottom + TOOLTIP_OFFSET_PX;
  }

  position.value = { top, left };
  placement.value = nextPlacement;
}

function schedulePositionUpdate(): void {
  void nextTick(() => {
    requestAnimationFrame(() => {
      clampPosition();
    });
  });
}

function onViewportChange(): void {
  if (!tooltipState.value) {
    return;
  }
  clampPosition();
}

watch(tooltipState, (entry) => {
  if (!entry) {
    return;
  }
  placement.value = entry.placement;
  schedulePositionUpdate();
});

onMounted(() => {
  window.addEventListener("scroll", onViewportChange, true);
  window.addEventListener("resize", onViewportChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("scroll", onViewportChange, true);
  window.removeEventListener("resize", onViewportChange);
  hideAll();
});
</script>

<template>
  <Teleport to="body">
    <span
      v-if="tooltipState"
      ref="tooltipRef"
      class="floating-tooltip"
      :class="`floating-tooltip--${placement}`"
      :style="{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }"
      role="tooltip"
    >
      {{ tooltipState.label }}
    </span>
  </Teleport>
</template>
