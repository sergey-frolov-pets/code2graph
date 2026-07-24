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
      | "library";
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
      <rect
        x="2.5"
        y="14"
        width="3.5"
        height="5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
      />
      <rect
        x="6.5"
        y="9"
        width="3.5"
        height="10"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
      />
      <rect
        x="10.5"
        y="11.5"
        width="3"
        height="7.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
      />
      <path
        d="M3.3 14.8v3.2M7.3 9.8v1.2M8.3 9.8v1.2M7.3 11.8v6.2M11.3 12.3v1M12.3 12.3v1M11.3 14.3v3.7M11.3 17.3h.8M12.3 17.3h.8"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
      <path
        d="M2 19h12"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
        stroke-linecap="round"
      />
      <circle
        cx="19"
        cy="10"
        r="3.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.2"
      />
      <path
        d="M21.5 12.5 23 15"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
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
