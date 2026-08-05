<script setup lang="ts">
import InstallAppButton from "@/components/InstallAppButton.vue";
import IconButton from "@/components/IconButton.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { APP_META } from "@/constants";
import { useLocale } from "@/composables/useLocale";

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
      <h1>{{ APP_META.name }}</h1>
      <p>{{ t("app.subtitle") }}</p>
    </div>
    <nav class="app-header__nav" :aria-label="t('app.settings')">
      <IconButton
        :label="t('app.aiNewDiagram')"
        extra-class="app-header__icon-btn"
        @click="emit('openWizard')"
      >
        <ActionIcon name="ai" />
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
        :label="t('app.settings')"
        extra-class="app-header__icon-btn"
        @click="emit('openSettings')"
      >
        <span class="app-header__gear-icon" aria-hidden="true">⚙</span>
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
