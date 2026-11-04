<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";

const query = defineModel<string>({ required: true });

const { t } = useLocale();
</script>

<template>
  <label class="wizard-gallery-search">
    <span class="wizard-gallery-search__label">{{ t("llm.wizard.gallery.searchLabel") }}</span>
    <input
      v-model="query"
      class="wizard-gallery-search__input"
      type="search"
      :placeholder="t('llm.wizard.gallery.searchPlaceholder')"
      data-testid="wizard-gallery-search"
    >
  </label>
</template>

<style src="./wizard-modal.css"></style>
