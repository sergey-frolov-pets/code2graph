<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { APP_LINKS, LAYOUT_ENGINES, type LayoutEngine } from "@/constants";
import {
  RENDER_MODES,
  type RenderMode,
} from "@/constants/render-settings";
import { ALL_LLM_PROVIDERS } from "@/constants/llm-providers";
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
import { useLibraryCredentials } from "@/composables/useLibraryCredentials";
import { testLlmConnection } from "@/services/llm/llm-client";
import { checkApiHealth } from "@/utils/diagram-api";
import { useLibraryAuth } from "@/composables/useLibraryAuth";

defineProps<{
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

const { locale, setLocale, t } = useLocale();
const { libraryApiUrl, setLibraryApiUrl } = useLibraryApiUrl();
const {
  libraryApiUsername,
  libraryApiPassword,
  hasCredentials,
  setUsername,
  setPassword,
  clearCredentials,
} = useLibraryCredentials();
const { loginWithCredentials } = useLibraryAuth();
const { openLlmKeysGuide } = useLlmKeysGuide();
const {
  llmProviderId,
  llmConsent,
  activeProvider,
  setLlmProviderId,
  setLlmConsent,
} = useLlmSettings();
const { hasLlmApiKey, setLlmApiKey, clearLlmApiKey } = useLlmApiKeys();

const libraryServerInput = ref(libraryApiUrl.value);
const libraryUsernameInput = ref(libraryApiUsername.value);
const libraryPasswordInput = ref("");
const showLibraryPassword = ref(false);
const isTestingLibrary = ref(false);
const libraryTestOk = ref(false);
const libraryTestMessage = ref("");
const apiKeyInput = ref("");
const showApiKey = ref(false);
const apiKeyError = ref("");
const isTestingLlm = ref(false);
const llmTestOk = ref(false);
const llmTestMessage = ref("");

watch(libraryApiUrl, (value) => {
  libraryServerInput.value = value;
});

watch(libraryApiUsername, (value) => {
  libraryUsernameInput.value = value;
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

function onLibraryUsernameBlur(): void {
  setUsername(libraryUsernameInput.value);
}

function onLibraryPasswordSave(): void {
  if (libraryPasswordInput.value) {
    setPassword(libraryPasswordInput.value);
    libraryPasswordInput.value = "";
    showLibraryPassword.value = false;
  }
}

function onLibraryCredentialsClear(): void {
  clearCredentials();
  libraryUsernameInput.value = "";
  libraryPasswordInput.value = "";
  showLibraryPassword.value = false;
  libraryTestMessage.value = "";
}

async function onLibraryTestConnection(): Promise<void> {
  onLibraryServerBlur();
  onLibraryUsernameBlur();
  onLibraryPasswordSave();

  if (!libraryApiUrl.value) {
    libraryTestOk.value = false;
    libraryTestMessage.value = t("settings.libraryTestNoUrl");
    return;
  }

  isTestingLibrary.value = true;
  libraryTestMessage.value = "";

  try {
    const ok = await checkApiHealth();
    if (ok && libraryApiUsername.value && libraryApiPassword.value) {
      try {
        await loginWithCredentials(
          libraryApiUsername.value,
          libraryApiPassword.value,
        );
      } catch {
        libraryTestOk.value = false;
        libraryTestMessage.value = t("settings.libraryLoginFailed");
        return;
      }
    }

    libraryTestOk.value = ok;
    libraryTestMessage.value = ok
      ? t("settings.libraryTestSuccessDetail")
      : t("settings.libraryTestFailedDetail");
  } catch {
    libraryTestOk.value = false;
    libraryTestMessage.value = t("settings.libraryTestFailedDetail");
  } finally {
    isTestingLibrary.value = false;
  }
}

const layoutOptions = Object.entries(LAYOUT_ENGINES).map(([label, value]) => ({
  label,
  value,
}));

const renderModeOptions = [
  {
    value: RENDER_MODES.offline,
    labelKey: "settings.renderModeOffline",
  },
  {
    value: RENDER_MODES.online,
    labelKey: "settings.renderModeOnline",
  },
] as const;

const fontFamilyOptions = computed(() =>
  EDITOR_FONT_FAMILY_OPTIONS.map((option) => ({
    ...option,
    label: option.id === "system" ? t("settings.fontSystem") : option.label,
  })),
);

const llmProviderOptions = computed(() =>
  ALL_LLM_PROVIDERS.map((provider) => {
    const recommendedBadge = provider.recommended
      ? ` — ${t("settings.llmRecommendedBadge")}`
      : "";

    return {
      id: provider.id,
      label: `${t(provider.nameKey)}${recommendedBadge}`,
    };
  }),
);

const hasActiveApiKey = computed(() => hasLlmApiKey(llmProviderId.value));

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
  openLlmKeysGuide(llmProviderId.value);
}

async function onTestLlmConnection(): Promise<void> {
  isTestingLlm.value = true;
  llmTestMessage.value = "";
  llmTestOk.value = false;

  const result = await testLlmConnection();
  llmTestOk.value = result.ok;
  llmTestMessage.value = result.message;
  isTestingLlm.value = false;
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

      <label class="settings-field settings-field--checkbox">
        <input
          type="checkbox"
          :checked="editorSyntaxHighlight"
          @change="
            emit(
              'update:editorSyntaxHighlight',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        <span>{{ t("settings.syntaxHighlight") }}</span>
      </label>

      <label class="settings-field settings-field--checkbox">
        <input
          type="checkbox"
          :checked="editorAutocomplete"
          @change="
            emit(
              'update:editorAutocomplete',
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        <span>{{ t("settings.autocomplete") }}</span>
      </label>
    </div>

    <div class="settings-section">
      <h3 class="settings-section__title">{{ t("settings.rendering") }}</h3>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.renderMode") }}</span>
        <select
          class="select"
          :value="renderMode"
          @change="
            emit(
              'update:renderMode',
              ($event.target as HTMLSelectElement).value as RenderMode,
            )
          "
        >
          <option
            v-for="option in renderModeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ t(option.labelKey) }}
          </option>
        </select>
        <span class="settings-field__hint">{{ t("settings.renderModeHint") }}</span>
      </label>

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

      <p v-if="activeProvider" class="settings-field__hint">
        {{ t(activeProvider.descriptionKey) }}
      </p>

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
          <p v-if="activeProvider?.keyUrl" class="settings-field__links">
            <a
              :href="activeProvider.keyUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ t("settings.llmGetApiKey") }}
            </a>
            <template v-if="activeProvider.docsUrl">
              ·
              <a
                :href="activeProvider.docsUrl"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ t("settings.llmProviderDocs") }}
              </a>
            </template>
          </p>
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

      <div class="settings-key-actions">
        <button
          class="btn btn-primary"
          type="button"
          :disabled="isTestingLlm"
          @click="onTestLlmConnection"
        >
          {{
            isTestingLlm ? t("settings.llmTestRunning") : t("settings.llmTestConnection")
          }}
        </button>
      </div>

      <p
        v-if="llmTestMessage"
        class="settings-test-result"
        :class="llmTestOk ? 'is-success' : 'is-error'"
      >
        {{ llmTestOk ? t("settings.llmTestSuccess") : t("settings.llmTestFailed") }}:
        {{ llmTestMessage }}
      </p>
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

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.libraryUsername") }}</span>
        <input
          v-model="libraryUsernameInput"
          class="select"
          type="text"
          autocomplete="username"
          :placeholder="t('settings.libraryUsernamePlaceholder')"
          @blur="onLibraryUsernameBlur"
          @keydown.enter="onLibraryUsernameBlur"
        />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.libraryPassword") }}</span>
        <div class="settings-api-key-row">
          <input
            v-model="libraryPasswordInput"
            class="select"
            :type="showLibraryPassword ? 'text' : 'password'"
            autocomplete="new-password"
            :placeholder="t('settings.libraryPasswordPlaceholder')"
            @keydown.enter="onLibraryPasswordSave"
          />
          <button
            class="btn"
            type="button"
            @click="showLibraryPassword = !showLibraryPassword"
          >
            {{ showLibraryPassword ? t("settings.llmApiKeyHide") : t("settings.llmApiKeyShow") }}
          </button>
        </div>
        <span class="settings-field__hint">{{ t("settings.libraryPasswordHint") }}</span>
        <div class="settings-api-key-actions">
          <button class="btn" type="button" @click="onLibraryPasswordSave">
            {{ t("settings.libraryPasswordSave") }}
          </button>
          <button
            class="btn"
            type="button"
            :disabled="!hasCredentials && !libraryPasswordInput"
            @click="onLibraryCredentialsClear"
          >
            {{ t("settings.libraryPasswordClear") }}
          </button>
        </div>
        <span class="settings-field__hint">
          {{
            hasCredentials
              ? t("settings.libraryCredentialsStatusSet")
              : t("settings.libraryCredentialsStatusMissing")
          }}
        </span>
      </label>

      <div class="settings-field">
        <button
          class="btn"
          type="button"
          :disabled="isTestingLibrary || !libraryServerInput"
          @click="onLibraryTestConnection"
        >
          {{
            isTestingLibrary
              ? t("settings.libraryTestRunning")
              : t("settings.libraryTestConnection")
          }}
        </button>
      </div>

      <p
        v-if="libraryTestMessage"
        class="settings-test-result"
        :class="libraryTestOk ? 'is-success' : 'is-error'"
      >
        {{ libraryTestOk ? t("settings.libraryTestSuccess") : t("settings.libraryTestFailed") }}:
        {{ libraryTestMessage }}
      </p>
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
        <a
          class="btn settings-link-btn"
          :href="APP_LINKS.llmApiKeysGuide"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t("settings.llmKeysGuide") }}
        </a>
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

.settings-field__links {
  margin: 6px 0 0;
  font-size: 0.82rem;
}

.settings-field__links a {
  color: var(--accent);
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

.settings-test-result {
  margin: 0 0 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  line-height: 1.4;
  word-break: break-word;
}

.settings-test-result.is-success {
  background: color-mix(in srgb, var(--success) 14%, transparent);
  color: var(--success);
}

.settings-test-result.is-error {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
  color: var(--danger);
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
