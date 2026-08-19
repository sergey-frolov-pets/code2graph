<script setup lang="ts">
import InstallAppButton from "@/components/InstallAppButton.vue";
import HeaderControls from "@/components/layout/HeaderControls.vue";
import IconButton from "@/components/IconButton.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { APP_META } from "@/constants";
import { useAppRouter } from "@/composables/useAppRouter";
import { useLocale } from "@/composables/useLocale";

const { navigateTo } = useAppRouter();

const emit = defineEmits<{
  openWizard: [];
  openLibrary: [];
  openSettings: [];
}>();

const { t } = useLocale();
</script>

<template>
  <header class="app-header">
    <div class="app-header__main">
      <div class="app-header__title-row">
        <h1>{{ APP_META.name }}</h1>
        <span class="app-header__version">v{{ APP_META.version }}</span>
      </div>
      <p class="app-header__subtitle">{{ t("app.subtitle") }}</p>
    </div>
    <nav class="app-header__nav" :aria-label="t('app.mainNav')">
      <HeaderControls />
      <IconButton
        :label="t('app.aiNewDiagram')"
        extra-class="app-header__icon-btn"
        @click="emit('openWizard')"
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
