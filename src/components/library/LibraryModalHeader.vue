<script setup lang="ts">
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import type { LibraryTab } from "@/composables/library/useLibraryBrowseFlow";
import type { LibraryTarget } from "@/constants/diagram-library";
import { useLocale } from "@/composables/useLocale";

export type LibraryBreadcrumbItem = {
  label: string;
  action?: () => void;
};

defineProps<{
  showBackButton: boolean;
  headerTitle: string;
  breadcrumbItems: LibraryBreadcrumbItem[];
  showModeTabs: boolean;
  statusHint: string;
  transientNotice: string;
  libraryTarget: LibraryTarget;
  registrationEnabled: boolean;
  isAuthenticated: boolean;
  isSyncing: boolean;
  isCheckingOnline: boolean;
  onlineTargetButtonClass: string;
  showAdminTab: boolean;
  activeTab: LibraryTab;
}>();

const emit = defineEmits<{
  back: [];
  close: [];
  refresh: [];
  register: [];
  "local-target": [];
  "online-target": [];
  "switch-tab": [tab: LibraryTab];
}>();

const { t } = useLocale();
</script>

<template>
  <header class="library-header">
    <div class="library-header__row">
      <button
        v-if="showBackButton"
        class="btn library-header__back"
        type="button"
        @click="emit('back')"
      >
        ← {{ t("library.back") }}
      </button>
      <h2 class="library-header__title">{{ headerTitle }}</h2>
      <nav
        v-if="breadcrumbItems.length > 1"
        class="library-breadcrumbs"
        :aria-label="t('library.breadcrumbs')"
      >
        <template v-for="(item, index) in breadcrumbItems" :key="`${item.label}-${index}`">
          <button
            v-if="item.action"
            type="button"
            class="library-breadcrumbs__link"
            @click="item.action?.()"
          >
            {{ item.label }}
          </button>
          <span v-else class="library-breadcrumbs__current">{{ item.label }}</span>
          <span
            v-if="index < breadcrumbItems.length - 1"
            class="library-breadcrumbs__sep"
            aria-hidden="true"
          >
            ›
          </span>
        </template>
      </nav>
      <div class="library-header__actions">
        <IconButton
          v-if="libraryTarget === 'online' && registrationEnabled && !isAuthenticated"
          :label="t('library.registerTitle')"
          @click="emit('register')"
        >
          <ActionIcon name="plus" />
        </IconButton>
        <IconButton
          :label="t('library.refresh')"
          :disabled="isSyncing"
          @click="emit('refresh')"
        >
          <ActionIcon name="refresh" />
        </IconButton>
        <IconButton :label="t('app.close')" @click="emit('close')">
          <ActionIcon name="close" />
        </IconButton>
      </div>
    </div>

    <p v-if="showModeTabs" class="library-header__hint">{{ statusHint }}</p>
    <p v-if="transientNotice" class="library-header__notice" role="status">
      {{ transientNotice }}
    </p>

    <div v-if="showModeTabs" class="library-header__modes">
      <div class="library-target">
        <IconButton
          :label="t('library.targetLocal')"
          extra-class="library-modes__btn library-modes__btn--labeled"
          :pressed="libraryTarget === 'local'"
          @click="emit('local-target')"
        >
          <ActionIcon name="unlink" />
          <span class="library-modes__label">{{ t("library.targetLocal") }}</span>
        </IconButton>
        <IconButton
          :label="t('library.targetOnline')"
          :extra-class="onlineTargetButtonClass"
          :pressed="libraryTarget === 'online'"
          :disabled="isCheckingOnline"
          @click="emit('online-target')"
        >
          <ActionIcon name="globe" />
          <span class="library-modes__label">{{ t("library.targetOnline") }}</span>
        </IconButton>
      </div>

      <nav class="library-modes" :aria-label="t('library.title')">
        <IconButton
          :label="t('library.browse')"
          extra-class="library-modes__btn library-modes__btn--labeled"
          :pressed="activeTab === 'browse'"
          @click="emit('switch-tab', 'browse')"
        >
          <ActionIcon name="library" />
          <span class="library-modes__label">{{ t("library.browse") }}</span>
        </IconButton>
        <IconButton
          :label="t('library.uploadDiagram')"
          extra-class="library-modes__btn library-modes__btn--labeled"
          :pressed="activeTab === 'upload'"
          @click="emit('switch-tab', 'upload')"
        >
          <ActionIcon name="export" />
          <span class="library-modes__label">{{ t("library.uploadDiagram") }}</span>
        </IconButton>
        <IconButton
          v-if="showAdminTab"
          :label="t('library.adminUsersTitle')"
          extra-class="library-modes__btn library-modes__btn--labeled"
          :pressed="activeTab === 'admin'"
          @click="emit('switch-tab', 'admin')"
        >
          <ActionIcon name="shield" />
          <span class="library-modes__label">{{ t("library.adminUsersTitle") }}</span>
        </IconButton>
      </nav>
    </div>
  </header>
</template>
