<script setup lang="ts">
withDefaults(
  defineProps<{
    name:
      | "folder-open"
      | "save"
      | "check"
      | "trash"
      | "refresh"
      | "sun"
      | "moon"
      | "library"
      | "snippets"
      | "plus"
      | "export"
      | "import"
      | "zoom-in"
      | "zoom-out"
      | "history";
    size?: "default" | "large";
  }>(),
  {
    size: "default",
  },
);
</script>

<template>
  <svg
    class="action-icon"
    :class="{ 'action-icon--large': size === 'large' }"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <template v-if="name === 'folder-open'">
      <path
        d="M4 7.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H6a2 2 0 0 0-2 2Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
      />
      <path
        d="M4 10h16"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
    </template>

    <template v-else-if="name === 'save'">
      <path
        d="M6 4h9.2L18 6.8V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linejoin="round"
      />
      <path
        d="M14 4v5H8V4M8 14h8"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>

    <template v-else-if="name === 'check'">
      <circle
        cx="12"
        cy="12"
        r="8.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      />
      <path
        d="M8.5 12.2 10.8 14.5 15.8 9.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>

    <template v-else-if="name === 'trash'">
      <path
        d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-9.5 0 1.1 11.5A1.5 1.5 0 0 0 8 20h8a1.5 1.5 0 0 0 1.4-1.5L18.5 7"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>

    <template v-else-if="name === 'refresh'">
      <path
        d="M17.65 6.35A8 8 0 1 0 19.24 12"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
      />
      <path
        d="M19 2v6h-6"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>

    <template v-else-if="name === 'sun'">
      <circle
        cx="12"
        cy="12"
        r="4.25"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
      />
      <path
        d="M12 2.25v2.5M12 19.25v2.5M4.9 4.9l1.75 1.75M17.35 17.35l1.75 1.75M2.25 12h2.5M19.25 12h2.5M4.9 19.1l1.75-1.75M17.35 6.65l1.75-1.75"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
      />
    </template>

    <template v-else-if="name === 'moon'">
      <path
        d="M20.5 14.2A8.5 8.5 0 1 1 11.3 2.5a7 7 0 1 0 9.2 11.7Z"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="0.5"
        stroke-linejoin="round"
      />
    </template>

    <template v-else-if="name === 'library'">
      <!-- Lucide library (ISC) https://lucide.dev/icons/library -->
      <path
        d="m16 6 4 14M12 6v14M8 8v12M4 4v16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>

    <template v-else-if="name === 'snippets'">
      <path
        d="M8 6h12M8 12h12M8 18h8"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
      <path
        d="M4 6h.01M4 12h.01M4 18h.01"
        fill="currentColor"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      />
    </template>

    <template v-else-if="name === 'plus'">
      <path
        d="M12 5v14M5 12h14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
      />
    </template>

    <template v-else-if="name === 'export'">
      <path
        d="M12 3v10M8.5 9.5 12 13l3.5-3.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>

    <template v-else-if="name === 'import'">
      <path
        d="M12 21V11M8.5 14.5 12 11l3.5 3.5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M5 7V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>

    <template v-else-if="name === 'zoom-in'">
      <!-- Lucide zoom-in (ISC) https://lucide.dev/icons/zoom-in -->
      <circle
        cx="11"
        cy="11"
        r="7"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      />
      <path
        d="M21 21l-4.3-4.3M11 8v6M8 11h6"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
    </template>

    <template v-else-if="name === 'zoom-out'">
      <!-- Lucide zoom-out (ISC) https://lucide.dev/icons/zoom-out -->
      <circle
        cx="11"
        cy="11"
        r="7"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      />
      <path
        d="M21 21l-4.3-4.3M8 11h6"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
      />
    </template>

    <template v-else-if="name === 'history'">
      <!-- Lucide history (ISC) https://lucide.dev/icons/history -->
      <path
        d="M3 3v5h5"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M3.05 13a9 9 0 1 0 .5-4"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M12 7v5l3 2"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </template>
  </svg>
</template>

<style scoped>
.action-icon {
  display: block;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.action-icon--large {
  width: 22px;
  height: 22px;
}
</style>
