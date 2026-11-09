<script setup lang="ts">
import IconButton from "@/components/IconButton.vue";
import { useLocale } from "@/composables/useLocale";

defineProps<{
  active: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
}>();

const { t } = useLocale();
</script>

<template>
  <IconButton
    extra-class="panel-header__dual-screen"
    data-testid="dual-screen-toggle"
    :label="active ? t('preview.dualScreen.exit') : t('preview.dualScreen.enter')"
    :pressed="active"
    @click="emit('toggle')"
  >
    <svg
      class="panel-header__dual-screen-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <!-- Lucide columns-2 (ISC) https://lucide.dev/icons/columns-2 -->
      <rect
        width="18"
        height="18"
        x="3"
        y="3"
        rx="2"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
      <path
        d="M12 3v18"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      />
    </svg>
  </IconButton>
</template>
