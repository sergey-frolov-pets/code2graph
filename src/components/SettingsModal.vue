<script setup lang="ts">
import { reactive, toRef } from "vue";
import AppModal from "@/components/AppModal.vue";
import SettingsGeneralTab from "@/components/settings/SettingsGeneralTab.vue";
import SettingsLlmTab from "@/components/settings/SettingsLlmTab.vue";
import SettingsLibraryTab from "@/components/settings/SettingsLibraryTab.vue";
import { useSettingsTabs } from "@/composables/settings/useSettingsTabs";
import { useSettingsLlmForm } from "@/composables/settings/useSettingsLlmForm";
import { useSettingsLibraryForm } from "@/composables/settings/useSettingsLibraryForm";
import { useLocale } from "@/composables/useLocale";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";
import type {
  EditorFontFamilyId,
  EditorFontSize,
} from "@/constants/editor-settings";

const props = defineProps<{
  open: boolean;
  layout: LayoutEngine;
  renderMode: RenderMode;
  darkMode: boolean;
  editorFontSize: EditorFontSize;
  editorFontFamilyId: EditorFontFamilyId;
  editorSyntaxHighlight: boolean;
  editorAutocomplete: boolean;
}>();

const emit = defineEmits<{
  close: [];
  "update:layout": [value: LayoutEngine];
  "update:renderMode": [value: RenderMode];
  "update:darkMode": [value: boolean];
  "update:editorFontSize": [value: EditorFontSize];
  "update:editorFontFamilyId": [value: EditorFontFamilyId];
  "update:editorSyntaxHighlight": [value: boolean];
  "update:editorAutocomplete": [value: boolean];
  openAbout: [];
}>();

const { t } = useLocale();
const llmForm = useSettingsLlmForm(t);
const library = reactive(useSettingsLibraryForm(t, llmForm));
const llm = reactive(llmForm);
const { activeTab, tabs, showLlmKeyBanner } = useSettingsTabs({
  open: toRef(props, "open"),
  refreshLlmProxyAvailability: llmForm.refreshLlmProxyAvailability,
  isActiveProviderByok: llmForm.isActiveProviderByok,
  hasActiveApiKey: llmForm.hasActiveApiKey,
  t,
});
</script>

<template>
  <AppModal :open="open" :title="t('settings.title')" @close="emit('close')">
    <nav class="settings-tabs" role="tablist" :aria-label="t('settings.title')">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="settings-tabs__btn"
        :class="{ 'is-active': activeTab === tab.id }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </nav>

    <p v-if="showLlmKeyBanner" class="settings-banner settings-banner--warning">
      {{ t("settings.llmApiKeyMissing") }}
    </p>

    <SettingsGeneralTab
      v-show="activeTab === 'general'"
      :layout="layout"
      :render-mode="renderMode"
      :dark-mode="darkMode"
      :editor-font-size="editorFontSize"
      :editor-font-family-id="editorFontFamilyId"
      :editor-syntax-highlight="editorSyntaxHighlight"
      :editor-autocomplete="editorAutocomplete"
      @update:layout="emit('update:layout', $event)"
      @update:render-mode="emit('update:renderMode', $event)"
      @update:dark-mode="emit('update:darkMode', $event)"
      @update:editor-font-size="emit('update:editorFontSize', $event)"
      @update:editor-font-family-id="emit('update:editorFontFamilyId', $event)"
      @update:editor-syntax-highlight="emit('update:editorSyntaxHighlight', $event)"
      @update:editor-autocomplete="emit('update:editorAutocomplete', $event)"
      @open-about="emit('openAbout')"
    />

    <SettingsLlmTab v-show="activeTab === 'llm'" :llm="llm" />

    <SettingsLibraryTab v-show="activeTab === 'library'" :library="library" />

    <template #footer>
      <button class="btn btn-primary" type="button" @click="emit('close')">
        {{ t("app.done") }}
      </button>
    </template>
  </AppModal>
</template>

<style src="./settings/settings-modal.css"></style>
