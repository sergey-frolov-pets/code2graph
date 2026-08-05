<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { APP_LINKS, LAYOUT_ENGINES, type LayoutEngine } from "@/constants";
import {
  ALL_LLM_PROVIDERS,
  LLM_PROVIDER_KIND,
} from "@/constants/llm-providers";
import {
  EDITOR_FONT_FAMILY_OPTIONS,
  EDITOR_FONT_SIZE_OPTIONS,
  type EditorFontFamilyId,
  type EditorFontSize,
} from "@/constants/editor-settings";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type AppLocale,
} from "@/constants/i18n";
import { useLlmApiKeys } from "@/composables/useLlmApiKeys";
import { useLlmKeysGuide } from "@/composables/useLlmKeysGuide";
import { useLlmSettings } from "@/composables/useLlmSettings";
import { useLocale } from "@/composables/useLocale";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";
import { isLlmProxyConfigured } from "@/utils/llm-proxy";

defineProps<{
  open: boolean;
  layout: LayoutEngine;
  darkMode: boolean;
  editorFontSize: EditorFontSize;
  editorFontFamilyId: EditorFontFamilyId;
}>();

const emit = defineEmits<{
  close: [];
  "update:layout": [value: LayoutEngine];
  "update:darkMode": [value: boolean];
  "update:editorFontSize": [value: EditorFontSize];
  "update:editorFontFamilyId": [value: EditorFontFamilyId];
  openAbout: [];
}>();

const { locale, setLocale, t } = useLocale();
const { libraryApiUrl, setLibraryApiUrl } = useLibraryApiUrl();
const { openLlmKeysGuide } = useLlmKeysGuide();
const {
  llmProviderId,
  llmConsent,
  isActiveProviderByok,
  isActiveProviderFree,
  setLlmProviderId,
  setLlmConsent,
} = useLlmSettings();
const { hasLlmApiKey, setLlmApiKey, clearLlmApiKey } = useLlmApiKeys();

const libraryServerInput = ref(libraryApiUrl.value);
const apiKeyInput = ref("");
const showApiKey = ref(false);
const apiKeyError = ref("");

watch(libraryApiUrl, (value) => {
  libraryServerInput.value = value;
});

watch(
  () => llmProviderId.value,
  () => {
    apiKeyInput.value = "";
    apiKeyError.value = "";
    showApiKey.value = false;
  },
);

function onLibraryServerBlur(): void {
  setLibraryApiUrl(libraryServerInput.value);
}

const layoutOptions = Object.entries(LAYOUT_ENGINES).map(([label, value]) => ({
  label,
  value,
}));

const fontFamilyOptions = computed(() =>
  EDITOR_FONT_FAMILY_OPTIONS.map((option) => ({
    ...option,
    label: option.id === "system" ? t("settings.fontSystem") : option.label,
  })),
);

const llmProviderOptions = computed(() =>
  ALL_LLM_PROVIDERS.map((provider) => {
    const kindBadge =
      provider.kind === LLM_PROVIDER_KIND.FREE_BUILTIN
        ? t("settings.llmFreeBadge")
        : t("settings.llmByokBadge");
    const recommendedBadge = provider.recommended
      ? ` — ${t("settings.llmRecommendedBadge")}`
      : "";

    return {
      id: provider.id,
      label: `${t(provider.nameKey)} ${kindBadge}${recommendedBadge}`,
    };
  }),
);

const hasActiveApiKey = computed(() => hasLlmApiKey(llmProviderId.value));

const showNoProxyWarning = computed(
  () => isActiveProviderFree.value && !isLlmProxyConfigured(),
);

function onProviderChange(event: Event): void {
  setLlmProviderId((event.target as HTMLSelectElement).value);
}

function onConsentChange(event: Event): void {
  setLlmConsent((event.target as HTMLInputElement).checked);
}

function saveApiKey(): void {
  apiKeyError.value = "";

  if (!apiKeyInput.value.trim()) {
    return;
  }

  const saved = setLlmApiKey(llmProviderId.value, apiKeyInput.value);
  if (!saved) {
    apiKeyError.value = t("settings.llmApiKeyInvalid");
    return;
  }

  apiKeyInput.value = "";
  showApiKey.value = false;
}

function clearApiKey(): void {
  clearLlmApiKey(llmProviderId.value);
  apiKeyInput.value = "";
  apiKeyError.value = "";
  showApiKey.value = false;
}

function openKeysGuideForActiveProvider(): void {
  openLlmKeysGuide(isActiveProviderByok.value ? llmProviderId.value : undefined);
}
</script>

<template>
  <AppModal :open="open" :title="t('settings.title')" @close="emit('close')">
    <div class="settings-section">
      <h3 class="settings-section__title">{{ t("settings.editor") }}</h3>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.fontSize") }}</span>
        <select
          class="select"
          :value="editorFontSize"
          @change="
            emit(
              'update:editorFontSize',
              ($event.target as HTMLSelectElement).value as EditorFontSize,
            )
          "
        >
          <option
            v-for="option in EDITOR_FONT_SIZE_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.fontFamily") }}</span>
        <select
          class="select"
          :value="editorFontFamilyId"
          @change="
            emit(
              'update:editorFontFamilyId',
              ($event.target as HTMLSelectElement).value as EditorFontFamilyId,
            )
          "
        >
          <option
            v-for="option in fontFamilyOptions"
            :key="option.id"
            :value="option.id"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title">{{ t("settings.rendering") }}</h3>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.layoutEngine") }}</span>
        <select
          class="select"
          :value="layout"
          @change="
            emit(
              'update:layout',
              ($event.target as HTMLSelectElement).value as LayoutEngine,
            )
          "
        >
          <option
            v-for="option in layoutOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title">{{ t("settings.theme") }}</h3>

      <label class="settings-field settings-field--checkbox">
        <input
          type="checkbox"
          :checked="darkMode"
          @change="
            emit(
              'update:darkMode',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        <span>{{ t("settings.darkTheme") }}</span>
      </label>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title">{{ t("settings.language") }}</h3>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.language") }}</span>
        <select
          class="select"
          :value="locale"
          @change="
            setLocale(($event.target as HTMLSelectElement).value as AppLocale)
          "
        >
          <option
            v-for="supportedLocale in SUPPORTED_LOCALES"
            :key="supportedLocale"
            :value="supportedLocale"
          >
            {{ LOCALE_LABELS[supportedLocale] }}
          </option>
        </select>
      </label>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title">{{ t("settings.ai") }}</h3>

      <label class="settings-field settings-field--checkbox">
        <input type="checkbox" :checked="llmConsent" @change="onConsentChange" />
        <span>{{ t("settings.llmConsent") }}</span>
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.llmProvider") }}</span>
        <select class="select" :value="llmProviderId" @change="onProviderChange">
          <option
            v-for="option in llmProviderOptions"
            :key="option.id"
            :value="option.id"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <p v-if="isActiveProviderFree" class="settings-field__hint">
        {{ t("settings.llmFreeHint") }}
      </p>

      <p v-if="showNoProxyWarning" class="settings-warning">
        {{ t("settings.llmNoProxyWarning") }}
      </p>

      <template v-if="isActiveProviderByok">
        <p class="settings-field__label settings-key-status">
          <span
            class="settings-key-status__badge"
            :class="hasActiveApiKey ? 'is-set' : 'is-missing'"
          >
            {{
              hasActiveApiKey
                ? t("settings.llmApiKeyStatusSet")
                : t("settings.llmApiKeyStatusMissing")
            }}
          </span>
        </p>

        <label class="settings-field">
          <span class="settings-field__label">{{ t("settings.llmApiKey") }}</span>
          <div class="settings-key-row">
            <input
              v-model="apiKeyInput"
              class="select settings-key-input"
              :type="showApiKey ? 'text' : 'password'"
              autocomplete="off"
              :placeholder="t('settings.llmApiKeyPlaceholder')"
              @keydown.enter="saveApiKey"
            />
            <button
              class="btn"
              type="button"
              @click="showApiKey = !showApiKey"
            >
              {{
                showApiKey ? t("settings.llmApiKeyHide") : t("settings.llmApiKeyShow")
              }}
            </button>
          </div>
          <span class="settings-field__hint">{{ t("settings.llmApiKeyHint") }}</span>
          <span v-if="apiKeyError" class="settings-field__error">{{ apiKeyError }}</span>
        </label>

        <div class="settings-key-actions">
          <button class="btn btn-primary" type="button" @click="saveApiKey">
            {{ t("settings.llmApiKeySave") }}
          </button>
          <button
            class="btn"
            type="button"
            :disabled="!hasActiveApiKey"
            @click="clearApiKey"
          >
            {{ t("settings.llmApiKeyClear") }}
          </button>
          <button class="btn" type="button" @click="openKeysGuideForActiveProvider">
            {{ t("settings.llmKeysGuide") }}
          </button>
        </div>
      </template>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title">{{ t("settings.library") }}</h3>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.libraryServer") }}</span>
        <input
          v-model="libraryServerInput"
          class="select"
          type="url"
          inputmode="url"
          autocomplete="off"
          :placeholder="t('settings.libraryServerPlaceholder')"
          @blur="onLibraryServerBlur"
          @keydown.enter="onLibraryServerBlur"
        />
        <span class="settings-field__hint">{{ t("settings.libraryServerHint") }}</span>
      </label>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title">{{ t("settings.help") }}</h3>
      <div class="settings-links">
        <a
          class="btn settings-link-btn"
          :href="APP_LINKS.plantumlGuide"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t("settings.plantumlGuide") }}
        </a>
        <button
          class="btn settings-link-btn"
          type="button"
          @click="openLlmKeysGuide()"
        >
          {{ t("settings.llmKeysGuide") }}
        </button>
        <button
          class="btn settings-link-btn"
          type="button"
          @click="emit('openAbout')"
        >
          {{ t("settings.about") }}
        </button>
      </div>
    </div>

    <template #footer>
      <button class="btn btn-primary" type="button" @click="emit('close')">
        {{ t("app.done") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.settings-section + .settings-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.settings-section__title {
  margin: 0 0 12px;
  font-size: 0.92rem;
  font-weight: 600;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
}

.settings-field__label {
  font-size: 0.88rem;
  color: var(--text-muted);
}

.settings-field__hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.35;
}

.settings-field__error {
  font-size: 0.8rem;
  color: var(--danger);
}

.settings-field--checkbox {
  flex-direction: row;
  align-items: center;
  gap: 10px;
  color: var(--text);
}

.settings-warning {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
  font-size: 0.82rem;
  line-height: 1.4;
}

.settings-key-status {
  margin: 0 0 8px;
}

.settings-key-status__badge {
  display: inline-block;
  font-size: 0.8rem;
  padding: 2px 8px;
  border-radius: 999px;
}

.settings-key-status__badge.is-set {
  background: color-mix(in srgb, var(--success) 18%, transparent);
  color: var(--success);
}

.settings-key-status__badge.is-missing {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
}

.settings-key-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.settings-key-input {
  flex: 1;
  min-width: 0;
}

.settings-key-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.settings-links {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settings-link-btn {
  width: 100%;
  justify-content: flex-start;
  text-decoration: none;
  color: var(--text);
}
</style>
