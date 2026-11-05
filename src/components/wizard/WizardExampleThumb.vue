<script setup lang="ts">
import {
  namespaceSvgIds,
  svgAtNaturalSize,
  svgFitScale,
  svgNaturalSize,
} from "@/constants/wizard-thumbnails";
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from "vue";

const props = defineProps<{
  svg: string;
  natural?: boolean;
}>();

const frame = ref<HTMLElement | null>(null);
const sheet = ref<HTMLElement | null>(null);
const scale = ref(1);
const idPrefix = useId();
let resizeObserver: ResizeObserver | null = null;

const naturalSize = computed(() => svgNaturalSize(props.svg));

const fitStyle = computed(() => {
  const size = naturalSize.value;
  if (!size || props.natural) {
    return undefined;
  }

  return {
    width: `${size.width * scale.value}px`,
    height: `${size.height * scale.value}px`,
  };
});

const sheetStyle = computed(() => {
  const size = naturalSize.value;
  if (!size || props.natural) {
    return undefined;
  }

  return {
    width: `${size.width}px`,
    height: `${size.height}px`,
    transform: `scale(${scale.value})`,
  };
});

function paint(): void {
  const host = props.natural || !naturalSize.value ? frame.value : sheet.value;
  if (!host) {
    return;
  }

  host.innerHTML = namespaceSvgIds(svgAtNaturalSize(props.svg), idPrefix);
  updateScale();
}

function updateScale(): void {
  const size = naturalSize.value;
  const element = frame.value;
  if (props.natural || !size || !element) {
    scale.value = 1;
    return;
  }

  scale.value = svgFitScale(size, element.clientWidth, element.clientHeight);
}

onMounted(() => {
  paint();
  const element = frame.value;
  if (props.natural || !element || typeof ResizeObserver === "undefined") {
    return;
  }

  resizeObserver = new ResizeObserver(() => {
    updateScale();
  });
  resizeObserver.observe(element);
});

watch(() => [props.svg, props.natural] as const, paint);

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<template>
  <div
    ref="frame"
    :class="natural ? 'wizard-example-zoom__image' : 'wizard-example__image'"
  >
    <div
      v-if="!natural && naturalSize"
      class="wizard-example__fit"
      :style="fitStyle"
    >
      <div
        ref="sheet"
        class="wizard-example__sheet"
        :style="sheetStyle"
      />
    </div>
  </div>
</template>

<style src="./wizard-modal.css"></style>
