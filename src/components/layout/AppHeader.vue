<script setup lang="ts">
import InstallAppButton from "@/components/InstallAppButton.vue";
import HeaderControls from "@/components/layout/HeaderControls.vue";
import IconButton from "@/components/IconButton.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { APP_META } from "@/constants";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";
import { useLocale } from "@/composables/useLocale";
import { trackEvent } from "@/analytics";

const { navigateTo } = useAppRouter();
const { isLocalMode } = useLibraryApiUrl();

const emit = defineEmits<{
  openWizard: [];
  openLibrary: [];
  openSettings: [];
}>();

const { t } = useLocale();

// Instant feedback for the "new diagram" button: the wizard itself reports
// `wizard-open-*` once mounted, this only proves the click reached the app.
function onOpenWizard(): void {
  trackEvent("wizard-open-click", "Wizard: new diagram button");
  emit("openWizard");
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__main">
      <div class="app-header__title-row">
        <h1>
          <button
            class="app-header__brand"
            type="button"
            :title="t('site.backHome')"
            @click="navigateTo('landing')"
          >
            {{ APP_META.name }}
          </button>
        </h1>
        <span class="app-header__version">v{{ APP_META.version }}</span>
      </div>
      <p class="app-header__subtitle">{{ t("app.subtitle") }}</p>
    </div>
    <nav class="app-header__nav" :aria-label="t('app.mainNav')">
      <IconButton
        :label="t('site.backHome')"
        extra-class="app-header__icon-btn"
        @click="navigateTo('landing')"
      >
        <ActionIcon name="home" />
      </IconButton>
      <HeaderControls />
      <IconButton
        :label="t('app.aiNewDiagram')"
        extra-class="app-header__icon-btn"
        @click="onOpenWizard"
      >
        <ActionIcon name="plus" />
      </IconButton>
      <IconButton
        :label="t('app.library')"
        extra-class="app-header__icon-btn"
        @click="emit('openLibrary')"
      >
        <ActionIcon name="library" />
      </IconButton>
      <InstallAppButton />
      <IconButton
        v-if="!isLocalMode"
        :label="t('site.accountTitle')"
        extra-class="app-header__icon-btn"
        @click="navigateTo('account')"
      >
        <ActionIcon name="user" />
      </IconButton>
      <IconButton
        :label="t('app.settings')"
        extra-class="app-header__icon-btn"
        @click="emit('openSettings')"
      >
        <ActionIcon name="settings" />
      </IconButton>
    </nav>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.app-header__main {
  flex: 1;
  min-width: 220px;
}

.app-header__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}

.app-header h1 {
  margin: 0;
  font-size: 1.25rem;
}

.app-header__brand {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  line-height: inherit;
  cursor: pointer;
}

.app-header__brand:hover,
.app-header__brand:focus-visible {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.app-header__brand:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
  border-radius: 4px;
}

.app-header__version {
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
}

.app-header__subtitle {
  margin: 6px 0 0;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.app-header__nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.app-header__icon-btn {
  width: 40px;
  min-width: 40px;
  height: 40px;
  min-height: 40px;
  padding: 0;
}

.app-header__gear-icon {
  display: block;
  font-size: 1.25rem;
  line-height: 1;
}
</style>
