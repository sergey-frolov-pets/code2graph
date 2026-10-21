<script setup lang="ts">
import { computed } from "vue";
import type { Component } from "vue";
import { FileCode, FileImage, Shapes } from "@lucide/vue";

const props = defineProps<{
  format: "PNG" | "SVG" | "PUML" | "MMD" | "GML" | "WMK";
}>();

const ICON_MAP: Record<"PNG" | "SVG" | "PUML" | "MMD" | "GML" | "WMK", Component> = {
  PUML: FileCode,
  MMD: FileCode,
  GML: FileCode,
  WMK: FileCode,
  SVG: Shapes,
  PNG: FileImage,
};

const iconComponent = computed(() => ICON_MAP[props.format]);
</script>

<template>
  <component
    :is="iconComponent"
    class="format-file-icon"
    :size="20"
    :stroke-width="2"
    aria-hidden="true"
  />
</template>

<style scoped>
.format-file-icon {
  display: block;
  flex-shrink: 0;
}
</style>
