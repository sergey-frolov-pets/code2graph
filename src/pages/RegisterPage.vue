<script setup lang="ts">
import { onMounted, ref } from "vue";
import SiteHeader from "@/components/site/SiteHeader.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import { useLocale } from "@/composables/useLocale";
import {
  setLibraryApiPassword,
  setLibraryApiUsername,
  setRememberLogin,
} from "@/config/library-credentials";

const { t } = useLocale();
const { navigateTo } = useAppRouter();
const { registerAccount, setupFirstAdmin, checkLibraryAuthStatus, registrationEnabled, needsSetup } =
  useLibraryAuth();

const username = ref("");
const password = ref("");
const passwordConfirm = ref("");
const isSubmitting = ref(false);
const authStatusReady = ref(false);
const errorMessage = ref("");

onMounted(async () => {
  try {
    await checkLibraryAuthStatus();
    authStatusReady.value = true;
    if (!needsSetup.value && !registrationEnabled.value) {
      errorMessage.value = t("site.registerDisabled");
    }
  } catch {
    errorMessage.value = t("site.registerStatusError");
  }
});

async function onSubmit(): Promise<void> {
  if (!username.value.trim() || !password.value) {
    errorMessage.value = t("site.registerRequired");
    return;
  }
  if (password.value !== passwordConfirm.value) {
    errorMessage.value = t("site.registerMismatch");
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = "";
  setRememberLogin(true);
  setLibraryApiUsername(username.value);
  setLibraryApiPassword(password.value);

  try {
    if (needsSetup.value) {
      await setupFirstAdmin(username.value.trim(), password.value);
    } else {
      await registerAccount(username.value.trim(), password.value);
    }
    navigateTo("account");
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("site.registerError");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="site-page auth-page">
    <SiteHeader />

    <main class="auth-card">
      <h1>{{ t("site.registerTitle") }}</h1>
      <p class="auth-card__subtitle">{{ t("site.registerSubtitle") }}</p>

      <form class="auth-form" @submit.prevent="onSubmit">
        <label class="settings-field">
          <span class="settings-field__label">{{ t("site.username") }}</span>
          <input v-model="username" class="select" type="text" autocomplete="username" />
        </label>

        <label class="settings-field">
          <span class="settings-field__label">{{ t("site.password") }}</span>
          <input
            v-model="password"
            class="select"
            type="password"
            autocomplete="new-password"
          />
        </label>

        <label class="settings-field">
          <span class="settings-field__label">{{ t("site.passwordConfirm") }}</span>
          <input
            v-model="passwordConfirm"
            class="select"
            type="password"
            autocomplete="new-password"
          />
        </label>

        <p v-if="errorMessage" class="settings-field__error">{{ errorMessage }}</p>

        <button
          class="btn btn-primary btn-lg"
          type="submit"
          :disabled="
            isSubmitting || (authStatusReady && !needsSetup && !registrationEnabled)
          "
        >
          {{ t("site.registerSubmit") }}
        </button>
      </form>

      <p class="auth-card__footer">
        {{ t("site.hasAccount") }}
        <button class="btn btn-link" type="button" @click="navigateTo('login')">
          {{ t("site.landingCtaLogin") }}
        </button>
      </p>

      <button class="btn btn-ghost" type="button" @click="navigateTo('landing')">
        {{ t("site.backHome") }}
      </button>
    </main>
  </div>
</template>
