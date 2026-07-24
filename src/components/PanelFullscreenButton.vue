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
        d="M9 9H4V4M15 4h5v5M15 15h5v-4H15M9 15H4v-4"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </IconButton>
</template>
