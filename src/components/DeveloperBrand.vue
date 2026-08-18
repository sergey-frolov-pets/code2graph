<script setup lang="ts">
import { APP_META } from "@/constants";

withDefaults(
  defineProps<{
    size?: "sm" | "md";
  }>(),
  { size: "md" },
);
</script>

<template>
  <span class="developer-brand" :class="`developer-brand--${size}`">
    <img
      class="developer-brand__logo"
      :src="APP_META.developerLogo"
      :alt="APP_META.developer"
<<<<<<< HEAD
      width="88"
      height="24"
=======
      width="104"
      height="40"
>>>>>>> origin/main
      decoding="async"
    />
  </span>
</template>

<style scoped>
.developer-brand {
  display: inline-flex;
  align-items: center;
  line-height: 0;
  vertical-align: middle;
}

.developer-brand__logo {
  display: block;
  width: auto;
  height: 1.25rem;
}

.developer-brand--sm .developer-brand__logo {
  height: 0.9rem;
}
</style>
