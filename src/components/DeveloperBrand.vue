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
    <svg
      class="developer-brand__logo"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 32"
      role="img"
      :aria-label="APP_META.developer"
    >
      <rect class="developer-brand__mark" width="40" height="32" />
      <text
        class="developer-brand__fs"
        x="20"
        y="21"
        text-anchor="middle"
        font-size="14"
        font-weight="700"
      >
        FS
      </text>
      <text class="developer-brand__name" x="48" y="22" font-size="18" font-weight="700">
        Vibe
      </text>
    </svg>
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

.developer-brand__mark {
  fill: currentColor;
}

.developer-brand__fs {
  fill: var(--surface);
}

.developer-brand__name {
  fill: currentColor;
}
</style>
