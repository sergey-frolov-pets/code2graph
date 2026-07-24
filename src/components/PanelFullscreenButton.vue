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
        d="M8 8 4 4M4 4 6.5 4M4 4 4 6.5M16 8 20 4M20 4 17.5 4M20 4 20 6.5M16 16 20 20M20 20 17.5 20M20 20 20 17.5M8 16 4 20M4 20 6.5 20M4 20 4 17.5"
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
        d="M4 4 8 8M8 8 6 8M8 8 8 6M20 4 16 8M16 8 18 8M16 8 16 6M20 20 16 16M16 16 18 16M16 16 16 18M4 20 8 16M8 16 6 16M8 16 8 18"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </IconButton>
</template>
