<script setup lang="ts">
import type { UnwrapNestedRefs } from "vue";
import { useLocale } from "@/composables/useLocale";
import type { useSettingsLibraryForm } from "@/composables/settings/useSettingsLibraryForm";

defineProps<{
  library: UnwrapNestedRefs<ReturnType<typeof useSettingsLibraryForm>>;
}>();

const { t } = useLocale();
</script>

<template>
  <div class="settings-section">
    <h3 class="settings-section__title">{{ t("settings.library") }}</h3>

    <label v-if="library.libraryProfiles.length > 0" class="settings-field">
      <span class="settings-field__label">{{ t("settings.libraryProfileSelect") }}</span>
      <select
        class="select"
        :value="library.activeLibraryProfileId"
        @change="
          library.onLibraryProfileSelect(
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option
          v-for="profile in library.libraryProfiles"
          :key="profile.id"
          :value="profile.id"
        >
          {{ profile.name }}
        </option>
      </select>
    </label>

    <div class="settings-key-actions">
      <button class="btn" type="button" @click="library.onAddLibraryProfile()">
        {{ t("settings.libraryProfileAdd") }}
      </button>
      <button
        class="btn"
        type="button"
        :disabled="library.libraryProfiles.length <= 1"
        @click="library.onRemoveLibraryProfile()"
      >
        {{ t("settings.libraryProfileRemove") }}
      </button>
    </div>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("settings.libraryProfileName") }}</span>
      <input
        v-model="library.libraryProfileNameInput"
        class="select"
        type="text"
        @blur="library.onLibraryProfileNameBlur()"
      />
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("settings.libraryServer") }}</span>
      <input
        v-model="library.libraryServerInput"
        class="select"
        type="url"
        inputmode="url"
        autocomplete="off"
        :placeholder="t('settings.libraryServerPlaceholder')"
        @blur="library.onLibraryServerBlur"
        @keydown.enter="library.onLibraryServerBlur"
      />
      <span class="settings-field__hint">{{ t("settings.libraryServerHint") }}</span>
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("settings.libraryUsername") }}</span>
      <input
        v-model="library.libraryUsernameInput"
        class="select"
        type="text"
        autocomplete="username"
        :placeholder="t('settings.libraryUsernamePlaceholder')"
        @blur="library.onLibraryUsernameBlur"
        @keydown.enter="library.onLibraryUsernameBlur"
      />
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("settings.libraryPassword") }}</span>
      <div class="settings-api-key-row">
        <input
          v-model="library.libraryPasswordInput"
          class="select"
          :type="library.showLibraryPassword ? 'text' : 'password'"
          autocomplete="new-password"
          :placeholder="t('settings.libraryPasswordPlaceholder')"
          @keydown.enter="library.onLibraryPasswordSave"
        />
        <button
          class="btn"
          type="button"
          @click="library.showLibraryPassword = !library.showLibraryPassword"
        >
          {{
            library.showLibraryPassword
              ? t("settings.llmApiKeyHide")
              : t("settings.llmApiKeyShow")
          }}
        </button>
      </div>
      <span class="settings-field__hint">{{ t("settings.libraryPasswordHint") }}</span>
      <div class="settings-api-key-actions">
        <button class="btn" type="button" @click="library.onLibraryPasswordSave">
          {{ t("settings.libraryPasswordSave") }}
        </button>
        <button
          class="btn"
          type="button"
          :disabled="!library.hasCredentials && !library.libraryPasswordInput"
          @click="library.onLibraryCredentialsClear"
        >
          {{ t("settings.libraryPasswordClear") }}
        </button>
      </div>
      <span class="settings-field__hint">
        {{
          library.hasCredentials
            ? t("settings.libraryCredentialsStatusSet")
            : t("settings.libraryCredentialsStatusMissing")
        }}
      </span>
    </label>

    <div class="settings-field">
      <button
        class="btn"
        type="button"
        :disabled="library.isTestingLibrary || !library.libraryServerInput"
        @click="library.onLibraryTestConnection"
      >
        {{
          library.isTestingLibrary
            ? t("settings.libraryTestRunning")
            : t("settings.libraryTestConnection")
        }}
      </button>
    </div>

    <p
      v-if="library.libraryTestMessage"
      class="settings-test-result"
      :class="library.libraryTestOk ? 'is-success' : 'is-error'"
    >
      {{
        library.libraryTestOk
          ? t("settings.libraryTestSuccess")
          : t("settings.libraryTestFailed")
      }}:
      {{ library.libraryTestMessage }}
    </p>
  </div>
</template>

<style src="./settings-modal.css"></style>
