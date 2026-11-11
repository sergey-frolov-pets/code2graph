<script setup lang="ts">
import { onMounted, ref } from "vue";

defineProps<{
  src: string;
  poster: string;
  alt: string;
  eager?: boolean;
}>();

const reducedMotion = ref(false);

onMounted(() => {
  reducedMotion.value =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
});
</script>

<template>
  <img
    class="landing-gif"
    :src="reducedMotion ? poster : src"
    :alt="alt"
    width="960"
    height="540"
    :loading="eager ? 'eager' : 'lazy'"
    decoding="async"
  >
</template>

<style scoped>
.landing-gif {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #0f172a;
  box-shadow: var(--shadow);
}
</style>
