<script setup lang="ts">
import { onMounted } from "vue";
import ServerRequiredNotice from "@/components/site/ServerRequiredNotice.vue";
import SiteHeader from "@/components/site/SiteHeader.vue";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import { useLocale } from "@/composables/useLocale";

const { t } = useLocale();
const { navigateTo } = useAppRouter();
const { isLocalMode } = useLibraryApiUrl();
const { currentUser, isAuthenticated, refreshCurrentUser, logoutLibraryAuth } =
  useLibraryAuth();

onMounted(async () => {
  if (isLocalMode.value) {
    return;
  }

  await refreshCurrentUser();
  if (!isAuthenticated.value) {
    navigateTo("login");
  }
});

function onLogout(): void {
  logoutLibraryAuth();
  navigateTo("landing");
}
</script>

<template>
  <ServerRequiredNotice v-if="isLocalMode" />
  <div v-else class="site-page auth-page">
    <SiteHeader />

    <main v-if="currentUser" class="auth-card">
      <h1>{{ t("site.accountTitle") }}</h1>
      <p class="auth-card__subtitle">
        {{ t("site.welcomeUser", { username: currentUser.username }) }}
      </p>

      <dl class="account-meta">
        <dt>{{ t("site.role") }}</dt>
        <dd>{{ currentUser.role }}</dd>
      </dl>

      <div class="auth-card__actions">
        <button class="btn btn-primary" type="button" @click="navigateTo('app')">
          {{ t("site.openEditor") }}
        </button>
        <button class="btn" type="button" @click="onLogout">
          {{ t("site.logout") }}
        </button>
      </div>

      <button class="btn btn-ghost" type="button" @click="navigateTo('landing')">
        {{ t("site.backHome") }}
      </button>
    </main>
  </div>
</template>
