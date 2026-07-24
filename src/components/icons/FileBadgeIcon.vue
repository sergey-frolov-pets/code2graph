<script setup lang="ts">
defineProps<{
  format: "PNG" | "SVG" | "PUML";
}>();
</script>

<template>
  <svg
    class="format-file-icon"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <!-- Lucide file-code (ISC) https://lucide.dev/icons/file-code -->
    <template v-if="format === 'PUML'">
      <path
        d="M10 12.5 8 15l2 2.5m4-5 2 2.5-2 2.5M14 2v4a2 2 0 0 0 2 2h4M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>

    <!-- Lucide shapes (ISC) https://lucide.dev/icons/shapes -->
    <template v-else-if="format === 'SVG'">
      <path
        d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        cx="17.5"
        cy="17.5"
        r="3.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>

    <!-- Lucide file-image (ISC) https://lucide.dev/icons/file-image -->
    <template v-else>
      <path
        d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <circle
        cx="10"
        cy="12"
        r="2"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>
  </svg>
</template>

<style scoped>
.format-file-icon {
  display: block;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}
</style>
