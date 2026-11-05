<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";
import { placeWizardPopover } from "@/constants/wizard-popover-placement";
import {
  WIZARD_GALLERY_POPOVER_CLASS,
  WIZARD_GALLERY_POPOVER_Z_INDEX_FALLBACK,
  WIZARD_GALLERY_POPOVER_Z_INDEX_OFFSET,
} from "@/constants/wizard-gallery";

const props = defineProps<{
  anchor: HTMLElement;
  layoutKey: string;
}>();

const emit = defineEmits<{
  pointerenter: [event: PointerEvent];
  pointerleave: [event: PointerEvent];
}>();

const panel = ref<HTMLElement | null>(null);
const style = ref<Record<string, string>>({
  position: "fixed",
  visibility: "hidden",
});

let frame = 0;
let observer: ResizeObserver | null = null;

function updatePlacement(): void {
  const element = panel.value;
  if (!element || !props.anchor.isConnected) {
    return;
  }

  const modal = props.anchor.closest(".modal");
  const bounds = (modal ?? document.documentElement).getBoundingClientRect();
  const placed = placeWizardPopover({
    anchor: props.anchor.getBoundingClientRect(),
    bounds,
    panelHeight: element.scrollHeight,
  });
  const backdrop = props.anchor.closest(".modal-backdrop");
  const zSource =
    backdrop instanceof HTMLElement ? window.getComputedStyle(backdrop).zIndex : "";
  const parsedZ = Number.parseInt(zSource, 10);
  const zIndex =
    (Number.isFinite(parsedZ) ? parsedZ : WIZARD_GALLERY_POPOVER_Z_INDEX_FALLBACK) +
    WIZARD_GALLERY_POPOVER_Z_INDEX_OFFSET;
  const nextStyle = {
    position: "fixed",
    top: `${placed.top}px`,
    left: `${placed.left}px`,
    width: `${placed.width}px`,
    maxHeight: `${placed.maxHeight}px`,
    zIndex: String(zIndex),
    visibility: "visible",
  };
  const current = style.value;
  if (
    current.top === nextStyle.top &&
    current.left === nextStyle.left &&
    current.width === nextStyle.width &&
    current.maxHeight === nextStyle.maxHeight &&
    current.zIndex === nextStyle.zIndex &&
    current.visibility === nextStyle.visibility
  ) {
    return;
  }

  style.value = nextStyle;
}

function schedule(): void {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    updatePlacement();
  });
}

watch(
  () => [props.anchor, props.layoutKey] as const,
  () => {
    schedule();
  },
  { flush: "post", immediate: true },
);

watch(panel, (element) => {
  observer?.disconnect();
  observer = null;
  if (!element) {
    return;
  }

  observer = new ResizeObserver(() => {
    schedule();
  });
  observer.observe(element);
  schedule();
});

function onViewportChange(): void {
  schedule();
}

window.addEventListener("resize", onViewportChange);
document.addEventListener("scroll", onViewportChange, true);

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  observer?.disconnect();
  window.removeEventListener("resize", onViewportChange);
  document.removeEventListener("scroll", onViewportChange, true);
});
</script>

<template>
  <Teleport to="body">
    <div
      ref="panel"
      :class="WIZARD_GALLERY_POPOVER_CLASS"
      :style="style"
      @pointerenter="emit('pointerenter', $event)"
      @pointerleave="emit('pointerleave', $event)"
    >
      <slot />
    </div>
  </Teleport>
</template>

<style src="./wizard-modal.css"></style>
