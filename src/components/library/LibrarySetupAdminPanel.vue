<script setup lang="ts">
import { ref } from "vue";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import { useLocale } from "@/composables/useLocale";

const props = defineProps<{
  apiUrl?: string;
}>();

const emit = defineEmits<{
  completed: [];
}>();

const { t } = useLocale();
const { setupFirstAdmin } = useLibraryAuth();
const username = ref("");
const password = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);

async function onSubmit(): Promise<void> {
  const trimmedUsername = username.value.trim();
  if (!trimmedUsername || !password.value) {
    errorMessage.value = t("library.setupAdminRequired");
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = "";
  try {
    await setupFirstAdmin(trimmedUsername, password.value, props.apiUrl);
    username.value = "";
    password.value = "";
    emit("completed");
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.setupAdminError");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <section class="library-setup-panel">
    <h3 class="library-setup-panel__title">{{ t("library.setupAdminTitle") }}</h3>
    <p class="settings-field__hint">{{ t("library.setupAdminHint") }}</p>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.adminUsername") }}</span>
      <input
        v-model="username"
        class="settings-field__input"
        type="text"
        autocomplete="username"
        :disabled="isSubmitting"
      />
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.adminPassword") }}</span>
      <input
        v-model="password"
        class="settings-field__input"
        type="password"
        autocomplete="new-password"
        :disabled="isSubmitting"
      />
    </label>

    <p v-if="errorMessage" class="settings-field__error">{{ errorMessage }}</p>

    <button
      class="btn btn--primary"
      type="button"
      :disabled="isSubmitting"
      @click="onSubmit()"
    >
      {{ t("library.setupAdminSubmit") }}
    </button>
  </section>
</template>

<style scoped>
.library-setup-panel {
  max-width: 420px;
  margin: 8px 0 16px;
  padding: 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius, 8px);
  background: var(--surface-muted, #f8fafc);
}

.library-setup-panel__title {
  margin: 0 0 8px;
  font-size: 1rem;
}
</style>
