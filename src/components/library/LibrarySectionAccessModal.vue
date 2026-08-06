<script setup lang="ts">
import { ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import type { SectionAccessDto } from "@/constants/diagram-library";
import { useLocale } from "@/composables/useLocale";
import {
  fetchSectionAccess,
  grantSectionAccess,
  revokeSectionAccess,
} from "@/utils/diagram-api";

const props = defineProps<{
  open: boolean;
  sectionId: string | null;
  sectionTitle: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useLocale();
const accessList = ref<SectionAccessDto[]>([]);
const usernameInput = ref("");
const permanentGrant = ref(true);
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");

async function loadAccess(): Promise<void> {
  if (!props.sectionId) {
    return;
  }

  isLoading.value = true;
  errorMessage.value = "";
  try {
    const response = await fetchSectionAccess(props.sectionId);
    accessList.value = response.access;
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.accessLoadError");
  } finally {
    isLoading.value = false;
  }
}

async function onGrant(): Promise<void> {
  if (!props.sectionId || !usernameInput.value.trim()) {
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";
  try {
    await grantSectionAccess(props.sectionId, {
      username: usernameInput.value.trim(),
      permanent: permanentGrant.value,
    });
    usernameInput.value = "";
    await loadAccess();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.accessGrantError");
  } finally {
    isSaving.value = false;
  }
}

async function onRevoke(userId: string): Promise<void> {
  if (!props.sectionId) {
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";
  try {
    await revokeSectionAccess(props.sectionId, userId);
    await loadAccess();
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.accessRevokeError");
  } finally {
    isSaving.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      void loadAccess();
    }
  },
);
</script>

<template>
  <AppModal
    :open="open"
    :title="t('library.sectionAccessTitle', { title: sectionTitle })"
    @close="emit('close')"
  >
    <p class="settings-field__hint">{{ t("library.sectionAccessHint") }}</p>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.accessUsername") }}</span>
      <input v-model="usernameInput" class="select" type="text" />
    </label>

    <label class="settings-field settings-field--checkbox">
      <input v-model="permanentGrant" type="checkbox" />
      <span>{{ t("library.accessPermanent") }}</span>
    </label>

    <button
      class="btn btn-primary"
      type="button"
      :disabled="isSaving || !usernameInput.trim()"
      @click="onGrant()"
    >
      {{ isSaving ? t("app.loading") : t("library.accessGrant") }}
    </button>

    <p v-if="errorMessage" class="settings-field__error">{{ errorMessage }}</p>

    <div v-if="isLoading" class="settings-field__hint">{{ t("app.loading") }}</div>

    <ul v-else class="library-access-list">
      <li v-for="entry in accessList" :key="entry.userId" class="library-access-list__item">
        <span>{{ entry.username }}</span>
        <span class="library-access-list__meta">
          {{
            entry.permanent
              ? t("library.accessPermanentBadge")
              : t("library.accessUntil", { date: entry.expiresAt ?? "" })
          }}
        </span>
        <button class="btn" type="button" :disabled="isSaving" @click="onRevoke(entry.userId)">
          {{ t("library.accessRevoke") }}
        </button>
      </li>
    </ul>
  </AppModal>
</template>

<style scoped>
.library-access-list {
  list-style: none;
  margin: 16px 0 0;
  padding: 0;
}

.library-access-list__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color, #ddd);
}

.library-access-list__meta {
  flex: 1;
  font-size: 0.85rem;
  color: var(--text-muted, #666);
}
</style>
