<script setup lang="ts">
import type { UnwrapNestedRefs } from "vue";
import { useLocale } from "@/composables/useLocale";
import type { useSettingsLlmForm } from "@/composables/settings/useSettingsLlmForm";

defineProps<{
  llm: UnwrapNestedRefs<ReturnType<typeof useSettingsLlmForm>>;
}>();

const { t } = useLocale();
</script>

<template>
  <div class="settings-section">
    <h3 class="settings-section__title">{{ t("settings.ai") }}</h3>

    <label class="settings-field settings-field--checkbox">
      <input
        type="checkbox"
        :checked="llm.llmConsent"
        @change="llm.onConsentChange"
      />
      <span>{{ t("settings.llmConsent") }}</span>
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("settings.llmProvider") }}</span>
      <select class="select" :value="llm.llmProviderId" @change="llm.onProviderChange">
        <option
          v-for="option in llm.llmProviderOptions"
          :key="option.id"
          :value="option.id"
        >
          {{ option.label }}
        </option>
      </select>
    </label>

    <p v-if="llm.activeProvider" class="settings-field__hint">
      {{ t(llm.activeProvider.descriptionKey) }}
    </p>

    <p
      v-if="llm.proxyConfigured && !llm.proxyReachable"
      class="settings-field__hint settings-field__error"
    >
      {{ t("settings.llmProxyUnreachable") }}
    </p>

    <template v-if="llm.isActiveProviderByok">
      <p class="settings-field__label settings-key-status">
        <span
          class="settings-key-status__badge"
          :class="llm.hasActiveApiKey ? 'is-set' : 'is-missing'"
        >
          {{
            llm.hasActiveApiKey
              ? t("settings.llmApiKeyStatusSet")
              : t("settings.llmApiKeyStatusMissing")
          }}
        </span>
      </p>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.llmApiKey") }}</span>
        <div class="settings-key-row">
          <input
            v-model="llm.apiKeyInput"
            class="select settings-key-input"
            :type="llm.showApiKey ? 'text' : 'password'"
            autocomplete="off"
            :placeholder="t('settings.llmApiKeyPlaceholder')"
            @keydown.enter="llm.saveApiKey"
          />
          <button
            class="btn"
            type="button"
            @click="llm.showApiKey = !llm.showApiKey"
          >
            {{
              llm.showApiKey
                ? t("settings.llmApiKeyHide")
                : t("settings.llmApiKeyShow")
            }}
          </button>
        </div>
        <span class="settings-field__hint">{{ t("settings.llmApiKeyHint") }}</span>
        <p v-if="llm.activeProvider?.keyUrl" class="settings-field__links">
          <a
            :href="llm.activeProvider.keyUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ t("settings.llmGetApiKey") }}
          </a>
          <template v-if="llm.activeProvider.docsUrl">
            ·
            <a
              :href="llm.activeProvider.docsUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ t("settings.llmProviderDocs") }}
            </a>
          </template>
        </p>
        <span v-if="llm.apiKeyError" class="settings-field__error">
          {{ llm.apiKeyError }}
        </span>
      </label>

      <div class="settings-key-actions">
        <button class="btn btn-primary" type="button" @click="llm.saveApiKey">
          {{ t("settings.llmApiKeySave") }}
        </button>
        <button
          class="btn"
          type="button"
          :disabled="!llm.hasActiveApiKey"
          @click="llm.clearApiKey"
        >
          {{ t("settings.llmApiKeyClear") }}
        </button>
        <button class="btn" type="button" @click="llm.openKeysGuideForActiveProvider">
          {{ t("settings.llmKeysGuide") }}
        </button>
      </div>
    </template>

    <p v-else-if="llm.activeProvider" class="settings-field__hint">
      {{ t("settings.llmFreeBuiltinHint") }}
    </p>

    <div class="settings-key-actions">
      <button
        class="btn btn-primary"
        type="button"
        :disabled="llm.isTestingLlm"
        @click="llm.onTestLlmConnection"
      >
        {{
          llm.isTestingLlm
            ? t("settings.llmTestRunning")
            : t("settings.llmTestConnection")
        }}
      </button>
    </div>

    <p
      v-if="llm.llmTestMessage"
      class="settings-test-result"
      :class="llm.llmTestOk ? 'is-success' : 'is-error'"
    >
      {{ llm.llmTestOk ? t("settings.llmTestSuccess") : t("settings.llmTestFailed") }}:
      {{ llm.llmTestMessage }}
    </p>
  </div>
</template>

<style src="./settings-modal.css"></style>
