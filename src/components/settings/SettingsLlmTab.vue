<script setup lang="ts">
import { useLocale } from "@/composables/useLocale";
import { useSettingsLlmFormContext } from "@/composables/settings/useSettingsLlmForm";

const llm = useSettingsLlmFormContext();
const { t } = useLocale();
</script>

<template>
  <div class="settings-section">
    <h3 class="settings-section__title">{{ t("settings.ai") }}</h3>

    <p
      v-if="llm.llmKeyStoreError === 'missing_seed'"
      class="settings-field__hint settings-field__error"
    >
      {{ t("settings.llmKeySeedMissing") }}
    </p>
    <p
      v-else-if="llm.llmKeyStoreError === 'decrypt_failed'"
      class="settings-field__hint settings-field__error"
    >
      {{ t("settings.llmKeyDecryptFailed") }}
    </p>

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
      <div class="settings-key-actions">
        <button
          class="btn"
          type="button"
          :disabled="llm.isRefreshingPrices"
          @click="llm.refreshModelPrices"
        >
          {{
            llm.isRefreshingPrices
              ? t("settings.llmRefreshPricesRunning")
              : t("settings.llmRefreshPrices")
          }}
        </button>
      </div>
      <p v-if="llm.modelPriceError" class="settings-field__error">
        {{ llm.modelPriceError }}
      </p>
    </template>

    <template v-if="llm.isActiveProviderByok || llm.isActiveProviderLocal">
      <p class="settings-field__hint">{{ t("settings.llmAccountsHint") }}</p>
      <p class="settings-field__label settings-key-status">
        <span class="settings-key-status__badge settings-key-status__badge--local is-set">
          {{ t("settings.llmApiKeyLocalBadge") }}
        </span>
        <span
          v-if="llm.isActiveProviderByok"
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

      <ul v-if="llm.providerAccounts.length > 0" class="settings-llm-accounts">
        <li
          v-for="account in llm.providerAccounts"
          :key="account.id"
          class="settings-llm-account"
        >
          <div class="settings-llm-account__head">
            <span class="settings-llm-account__label">{{ account.label }}</span>
            <span class="settings-llm-account__meta">{{ account.meta }}</span>
            <label class="settings-llm-account__active">
              <input
                type="checkbox"
                :checked="account.active"
                @change="llm.onAccountActiveChange(account.id, $event)"
              />
              <span>{{ t("settings.llmAccountActive") }}</span>
            </label>
            <button class="btn" type="button" @click="llm.removeAccount(account.id)">
              {{ t("settings.llmAccountRemove") }}
            </button>
          </div>
          <label class="settings-field">
            <span class="settings-field__label">{{ t("settings.llmModel") }}</span>
            <select
              v-if="!account.isLocal"
              class="select settings-model-select"
              :value="account.modelId"
              @change="llm.onAccountModelChange(account.id, $event)"
            >
              <option
                v-if="account.modelId && !llm.modelOptions.some((model) => model.id === account.modelId)"
                :value="account.modelId"
              >
                {{ account.modelId }}
              </option>
              <option v-for="model in llm.modelOptions" :key="model.id" :value="model.id">
                {{ model.label }}
              </option>
            </select>
            <input
              v-else
              class="select settings-model-select"
              type="text"
              :value="account.modelId"
              spellcheck="false"
              @change="llm.onAccountModelChange(account.id, $event)"
            />
            <span v-if="account.modelPrice" class="settings-field__hint">{{ account.modelPrice }}</span>
          </label>
          <div class="settings-llm-params">
            <label v-for="parameter in account.parameters" :key="parameter.key" class="settings-field">
              <span class="settings-field__label">
                {{ parameter.label }}
                <template v-if="parameter.fixed"> ({{ t("settings.llmFixedParameter") }})</template>
              </span>
              <input
                class="select settings-model-select"
                type="number"
                :min="parameter.min"
                :max="parameter.max"
                :step="parameter.step"
                :value="parameter.value"
                :disabled="parameter.fixed"
                @change="llm.onAccountParameterChange(account.id, parameter.key, $event)"
              />
            </label>
          </div>
        </li>
      </ul>
      <p v-else class="settings-field__hint">
        {{
          llm.isActiveProviderLocal
            ? t("settings.llmLocalEmpty")
            : t("settings.llmAccountEmpty")
        }}
      </p>
    </template>

    <template v-if="llm.isActiveProviderByok">
      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.llmAccountLabel") }}</span>
        <input
          v-model="llm.accountLabelInput"
          class="select"
          type="text"
          autocomplete="off"
          :placeholder="t('settings.llmAccountLabelPlaceholder')"
        />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.llmApiKey") }}</span>
        <div class="settings-key-row">
          <input
            v-model="llm.apiKeyInput"
            class="select settings-key-input"
            :type="llm.showApiKey ? 'text' : 'password'"
            autocomplete="off"
            :placeholder="t('settings.llmApiKeyPlaceholder')"
            @keydown.enter="llm.addProviderKey"
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

      <label class="settings-field settings-field--checkbox">
        <input v-model="llm.accountActiveInput" type="checkbox" />
        <span>{{ t("settings.llmAccountActive") }}</span>
      </label>

      <div class="settings-key-actions">
        <button class="btn btn-primary" type="button" @click="llm.addProviderKey">
          {{ t("settings.llmAccountAdd") }}
        </button>
        <button class="btn" type="button" @click="llm.openKeysGuideForActiveProvider">
          {{ t("settings.llmKeysGuide") }}
        </button>
      </div>
    </template>

    <template v-else-if="llm.isActiveProviderLocal">
      <p class="settings-field__hint">{{ t("settings.llmLocalHint") }}</p>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.llmAccountLabel") }}</span>
        <input
          v-model="llm.localLabelInput"
          class="select"
          type="text"
          autocomplete="off"
          :placeholder="t('settings.llmAccountLabelPlaceholder')"
        />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.llmLocalBaseUrl") }}</span>
        <input
          v-model="llm.localBaseUrlInput"
          class="select"
          type="url"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t('settings.llmLocalBaseUrlPlaceholder')"
        />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.llmLocalModel") }}</span>
        <input
          v-model="llm.localModelInput"
          class="select"
          type="text"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t('settings.llmLocalModelPlaceholder')"
          @keydown.enter="llm.addLocalProvider"
        />
      </label>

      <label class="settings-field">
        <span class="settings-field__label">{{ t("settings.llmLocalApiKey") }}</span>
        <div class="settings-key-row">
          <input
            v-model="llm.localApiKeyInput"
            class="select settings-key-input"
            :type="llm.showLocalApiKey ? 'text' : 'password'"
            autocomplete="off"
            :placeholder="t('settings.llmLocalApiKeyPlaceholder')"
          />
          <button
            class="btn"
            type="button"
            @click="llm.showLocalApiKey = !llm.showLocalApiKey"
          >
            {{
              llm.showLocalApiKey
                ? t("settings.llmApiKeyHide")
                : t("settings.llmApiKeyShow")
            }}
          </button>
        </div>
      </label>

      <label class="settings-field settings-field--checkbox">
        <input v-model="llm.localActiveInput" type="checkbox" />
        <span>{{ t("settings.llmAccountActive") }}</span>
      </label>

      <span v-if="llm.localError" class="settings-field__error">
        {{ llm.localError }}
      </span>

      <div class="settings-key-actions">
        <button class="btn btn-primary" type="button" @click="llm.addLocalProvider">
          {{ t("settings.llmLocalAdd") }}
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
