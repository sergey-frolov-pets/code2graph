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
      <rect
        x="5"
        y="5"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      />
      <path
        d="M7.5 7.5 11.7 11.7M11.7 11.7 11.7 10.4M11.7 11.7 10.4 11.7M16.5 7.5 12.3 11.7M12.3 11.7 12.3 10.4M12.3 11.7 13.6 11.7M16.5 16.5 12.3 12.3M12.3 12.3 12.3 13.6M12.3 12.3 13.6 12.3M7.5 16.5 11.7 12.3M11.7 12.3 11.7 13.6M11.7 12.3 10.4 12.3"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </IconButton>
</template>
