<script setup lang="ts">
import { ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";
import { registerLibraryAccount } from "@/services/library/api";
import { setLibraryAuthToken } from "@/config/library-credentials";

const props = defineProps<{
  open: boolean;
  apiUrl?: string;
}>();

const emit = defineEmits<{
  close: [];
  registered: [];
}>();

const { t } = useLocale();
const usernameInput = ref("");
const passwordInput = ref("");
const passwordConfirmInput = ref("");
const isSaving = ref(false);
const errorMessage = ref("");

async function onRegister(): Promise<void> {
  const username = usernameInput.value.trim();
  if (!username || !passwordInput.value) {
    errorMessage.value = t("library.registerRequired");
    return;
  }

  if (passwordInput.value !== passwordConfirmInput.value) {
    errorMessage.value = t("library.registerPasswordMismatch");
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";
  try {
    const response = await registerLibraryAccount(
      username,
      passwordInput.value,
      props.apiUrl,
    );
    setLibraryAuthToken(response.token);
    emit("registered");
    emit("close");
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.registerError");
  } finally {
    isSaving.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      usernameInput.value = "";
      passwordInput.value = "";
      passwordConfirmInput.value = "";
      errorMessage.value = "";
    }
  },
);
</script>

<template>
  <AppModal
    :open="open"
    :title="t('library.registerTitle')"
    layer="above-library"
    @close="emit('close')"
  >
    <p class="settings-field__hint">{{ t("library.registerHint") }}</p>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.adminUsername") }}</span>
      <input v-model="usernameInput" class="select" type="text" autocomplete="username" />
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.adminPassword") }}</span>
      <input
        v-model="passwordInput"
        class="select"
        type="password"
        autocomplete="new-password"
      />
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.registerPasswordConfirm") }}</span>
      <input
        v-model="passwordConfirmInput"
        class="select"
        type="password"
        autocomplete="new-password"
      />
    </label>

    <button
      class="btn btn-primary"
      type="button"
      :disabled="isSaving"
      @click="onRegister()"
    >
      {{ isSaving ? t("app.loading") : t("library.registerSubmit") }}
    </button>

    <p v-if="errorMessage" class="settings-field__error">{{ errorMessage }}</p>
  </AppModal>
</template>
