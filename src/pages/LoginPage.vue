<script setup lang="ts">
import { onMounted, ref } from "vue";
import SiteHeader from "@/components/site/SiteHeader.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import { useLocale } from "@/composables/useLocale";
import {
  getRememberLogin,
  setLibraryApiPassword,
  setLibraryApiUsername,
  setRememberLogin,
} from "@/config/library-credentials";

const { t } = useLocale();
const { navigateTo } = useAppRouter();
const { loginWithCredentials, checkLibraryAuthStatus } = useLibraryAuth();

const username = ref("");
const password = ref("");
const rememberMe = ref(getRememberLogin());
const isSubmitting = ref(false);
const errorMessage = ref("");

onMounted(async () => {
  const status = await checkLibraryAuthStatus();
  if (status.needsSetup) {
    navigateTo("register");
  }
});

async function onSubmit(): Promise<void> {
  if (!username.value.trim() || !password.value) {
    errorMessage.value = t("site.registerRequired");
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = "";
  setRememberLogin(rememberMe.value);
  setLibraryApiUsername(username.value);
  setLibraryApiPassword(password.value);

  try {
    await loginWithCredentials(username.value.trim(), password.value);
    navigateTo("account");
  } catch {
    errorMessage.value = t("site.loginError");
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="site-page auth-page">
    <SiteHeader />

    <main class="auth-card">
      <h1>{{ t("site.loginTitle") }}</h1>
      <p class="auth-card__subtitle">{{ t("site.loginSubtitle") }}</p>

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
            autocomplete="current-password"
          />
        </label>

        <label class="settings-field settings-field--checkbox">
          <input v-model="rememberMe" type="checkbox" />
          <span>{{ t("site.rememberMe") }}</span>
        </label>

        <p v-if="errorMessage" class="settings-field__error">{{ errorMessage }}</p>

        <button class="btn btn-primary btn-lg" type="submit" :disabled="isSubmitting">
          {{ t("site.loginSubmit") }}
        </button>
      </form>

      <p class="auth-card__footer">
        {{ t("site.noAccount") }}
        <button class="btn btn-link" type="button" @click="navigateTo('register')">
          {{ t("site.landingCtaRegister") }}
        </button>
      </p>

      <button class="btn btn-ghost" type="button" @click="navigateTo('landing')">
        {{ t("site.backHome") }}
      </button>
    </main>
  </div>
</template>
