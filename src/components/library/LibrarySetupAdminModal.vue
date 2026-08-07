<script setup lang="ts">
import { ref } from "vue";
import AppModal from "@/components/AppModal.vue";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import { useLocale } from "@/composables/useLocale";

const props = defineProps<{
  open: boolean;
  apiUrl?: string;
}>();

const emit = defineEmits<{
  completed: [];
  close: [];
}>();

const { t } = useLocale();
const { setupFirstAdmin } = useLibraryAuth();
const username = ref("");
const password = ref("");
const errorMessage = ref("");
const isSubmitting = ref(false);

function resetForm(): void {
  username.value = "";
  password.value = "";
  errorMessage.value = "";
  isSubmitting.value = false;
}

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
    resetForm();
    emit("completed");
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.setupAdminError");
    isSubmitting.value = false;
  }
}

function onClose(): void {
  resetForm();
  emit("close");
}
</script>

<template>
  <AppModal
    :open="props.open"
    :title="t('library.setupAdminTitle')"
    variant="default"
    wide
    @close="onClose()"
  >
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

    <div class="modal-actions">
      <button
        class="btn btn--primary"
        type="button"
        :disabled="isSubmitting"
        @click="onSubmit()"
      >
        {{ t("library.setupAdminSubmit") }}
      </button>
      <button class="btn" type="button" :disabled="isSubmitting" @click="onClose()">
        {{ t("app.close") }}
      </button>
    </div>
  </AppModal>
</template>
