<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import IconButton from "@/components/IconButton.vue";
import { useLocale } from "@/composables/useLocale";
import { DATA_LINK_SETUP_HINT_EVENT } from "@/services/local-data-link/constants";
import {
  clearDataLinkSetupHint,
  readDataLinkSetupHint,
} from "@/services/local-data-link/setup-hint";

const { t } = useLocale();
const slug = ref("");

function syncHint(): void {
  slug.value = readDataLinkSetupHint();
}

function onHintEvent(event: Event): void {
  const detail = event instanceof CustomEvent ? event.detail : "";
  slug.value = typeof detail === "string" ? detail : readDataLinkSetupHint();
}

function dismiss(): void {
  clearDataLinkSetupHint();
  slug.value = "";
}

onMounted(() => {
  syncHint();
  window.addEventListener(DATA_LINK_SETUP_HINT_EVENT, onHintEvent);
});

onUnmounted(() => {
  window.removeEventListener(DATA_LINK_SETUP_HINT_EVENT, onHintEvent);
});
</script>

<template>
  <section
    v-if="slug"
    class="library-data-link-hint"
    data-testid="library-data-link-hint"
  >
    <p class="library-data-link-hint__title">
      {{ t("library.dataLink.setupTitle") }}
    </p>
    <p class="library-data-link-hint__text">
      {{ t("library.dataLink.setupHint", { slug }) }}
    </p>
    <IconButton :label="t('app.close')" @click="dismiss" />
  </section>
</template>
