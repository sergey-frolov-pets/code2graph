<script setup lang="ts">
import { provide, reactive, toRef } from "vue";
import AppModal from "@/components/AppModal.vue";
import SettingsGeneralTab from "@/components/settings/SettingsGeneralTab.vue";
import SettingsLlmTab from "@/components/settings/SettingsLlmTab.vue";
import SettingsLibraryTab from "@/components/settings/SettingsLibraryTab.vue";
import { useSettingsTabs } from "@/composables/settings/useSettingsTabs";
import { useSettingsLibraryForm, SETTINGS_LIBRARY_FORM_KEY } from "@/composables/settings/useSettingsLibraryForm";
import { useSettingsLlmForm, SETTINGS_LLM_FORM_KEY } from "@/composables/settings/useSettingsLlmForm";
import { useLocale } from "@/composables/useLocale";
import type {
  EditorFontFamilyId,
  EditorFontSize,
  EditorSurfaceMode,
} from "@/constants/editor-settings";

const props = defineProps<{
  open: boolean;
  editorFontSize: EditorFontSize;
  editorFontFamilyId: EditorFontFamilyId;
  editorSyntaxHighlight: boolean;
  editorAutocomplete: boolean;
  editorSurfaceMode: EditorSurfaceMode;
}>();

const emit = defineEmits<{
  close: [];
  "update:editorFontSize": [value: EditorFontSize];
  "update:editorFontFamilyId": [value: EditorFontFamilyId];
  "update:editorSyntaxHighlight": [value: boolean];
  "update:editorAutocomplete": [value: boolean];
  "update:editorSurfaceMode": [value: EditorSurfaceMode];
  openAbout: [];
}>();

const { t } = useLocale();
const llmForm = useSettingsLlmForm(t);
const library = reactive(useSettingsLibraryForm(t, llmForm));
const llm = reactive(llmForm);

provide(SETTINGS_LLM_FORM_KEY, llm);
provide(SETTINGS_LIBRARY_FORM_KEY, library);
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
      :editor-font-size="editorFontSize"
      :editor-font-family-id="editorFontFamilyId"
      :editor-syntax-highlight="editorSyntaxHighlight"
      :editor-autocomplete="editorAutocomplete"
      :editor-surface-mode="editorSurfaceMode"
      @update:editor-font-size="emit('update:editorFontSize', $event)"
      @update:editor-font-family-id="emit('update:editorFontFamilyId', $event)"
      @update:editor-syntax-highlight="emit('update:editorSyntaxHighlight', $event)"
      @update:editor-autocomplete="emit('update:editorAutocomplete', $event)"
      @update:editor-surface-mode="emit('update:editorSurfaceMode', $event)"
      @open-about="emit('openAbout')"
    />

    <SettingsLlmTab v-show="activeTab === 'llm'" />

    <SettingsLibraryTab v-show="activeTab === 'library'" />

    <template #footer>
      <button class="btn btn-primary" type="button" @click="emit('close')">
        {{ t("app.done") }}
      </button>
    </template>
  </AppModal>
</template>

<style src="./settings/settings-modal.css"></style>
