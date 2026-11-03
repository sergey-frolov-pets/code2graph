<script setup lang="ts">
import { computed } from "vue";
import { useLocale } from "@/composables/useLocale";
import { usePwaInstall } from "@/composables/usePwaInstall";

const props = withDefaults(
  defineProps<{
    size?: "default" | "large";
  }>(),
  { size: "default" },
);

const { t } = useLocale();
const { canShowInstallButton, isInstalling, installApp } = usePwaInstall();

const buttonClass = computed(() =>
  props.size === "large" ? "btn btn-lg" : "btn btn-ghost",
);
</script>

<template>
  <button
    v-if="canShowInstallButton"
    :class="buttonClass"
    type="button"
    :disabled="isInstalling"
    :aria-busy="isInstalling"
    @click="installApp()"
  >
    {{ t("site.landingCtaInstallPwa") }}
  </button>
</template>
