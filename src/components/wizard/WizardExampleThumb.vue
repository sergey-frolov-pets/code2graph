<script setup lang="ts">
import { namespaceSvgIds, svgAtNaturalSize } from "@/constants/wizard-thumbnails";
import { onMounted, ref, useId, watch } from "vue";

const props = defineProps<{
  svg: string;
  natural?: boolean;
}>();

const host = ref<HTMLElement | null>(null);
const idPrefix = useId();

function paint(): void {
  if (!host.value) {
    return;
  }

  const source = props.natural ? svgAtNaturalSize(props.svg) : props.svg;
  host.value.innerHTML = namespaceSvgIds(source, idPrefix);
}

onMounted(paint);
watch(() => [props.svg, props.natural] as const, paint);
</script>

<template>
  <div
    ref="host"
    :class="natural ? 'wizard-example-zoom__image' : 'wizard-example__image'"
  />
</template>

<style src="./wizard-modal.css"></style>
