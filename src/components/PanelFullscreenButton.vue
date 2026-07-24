<script setup lang="ts">
import IconButton from "@/components/IconButton.vue";

defineProps<{
  active: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
}>();
</script>

<template>
  <IconButton
    extra-class="panel-header__fullscreen"
    :label="active ? 'Свернуть' : 'На весь экран'"
    :pressed="active"
    @click="emit('toggle')"
  >
    <svg
      v-if="!active"
      class="panel-header__fullscreen-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M8 4H4v4M16 4h4v4M16 20h4v-4M8 20H4v-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <svg
      v-else
      class="panel-header__fullscreen-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="M4 4 10 10M10 10 8 10M10 10 10 8M20 4 14 10M14 10 16 10M14 10 14 8M20 20 14 14M14 14 16 14M14 14 14 16M4 20 10 14M10 14 8 14M10 14 10 16"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </IconButton>
</template>
