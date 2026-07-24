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
        d="M11 11 4 4M4 4 6.5 4M4 4 4 6.5M13 11 20 4M20 4 17.5 4M20 4 20 6.5M13 13 20 20M20 20 17.5 20M20 20 20 17.5M11 13 4 20M4 20 6.5 20M4 20 4 17.5"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
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
        d="M4 4 11 11M11 11 9 11M11 11 11 9M20 4 13 11M13 11 15 11M13 11 13 9M20 20 13 13M13 13 15 13M13 13 13 15M4 20 11 13M11 13 9 13M11 13 11 15"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </IconButton>
</template>
