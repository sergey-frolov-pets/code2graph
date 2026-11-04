<script setup lang="ts">
import { onMounted, ref, watch } from "vue";

const props = defineProps<{
  svg: string;
}>();

const host = ref<HTMLElement | null>(null);

function paint(): void {
  if (!host.value) {
    return;
  }

  host.value.innerHTML = props.svg;
}

onMounted(paint);
watch(() => props.svg, paint);
</script>

<template>
  <div
    ref="host"
    class="wizard-example__image"
  />
</template>

<style src="./wizard-modal.css"></style>
