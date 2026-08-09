<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLocale } from "@/composables/useLocale";
import type { DiagramVersion } from "@/types/diagram-versions";
import {
  createDiagramVersion,
  deleteDiagramVersion,
  listDiagramVersions,
} from "@/storage/diagram-versions";

const props = defineProps<{
  open: boolean;
  documentKey: string;
  currentSource: string;
}>();

const emit = defineEmits<{
  close: [];
  restore: [source: string];
}>();

const { t } = useLocale();
const { confirm } = useAppDialog();

const versions = ref<DiagramVersion[]>([]);
const comment = ref("");
const isLoading = ref(false);
const isSaving = ref(false);
const errorMessage = ref("");

const hasVersions = computed(() => versions.value.length > 0);
const canSaveVersion = computed(() => Boolean(props.currentSource.trim()));

const modalTitle = computed(() =>
  t("versions.title", { file: props.documentKey }),
);

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function versionLabel(version: DiagramVersion): string {
  return t("versions.versionNumber", { number: version.versionNumber });
}

async function loadVersions(): Promise<void> {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    versions.value = await listDiagramVersions(props.documentKey);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("versions.loadError");
    versions.value = [];
  } finally {
    isLoading.value = false;
  }
}

async function saveVersion(): Promise<void> {
  if (!canSaveVersion.value || isSaving.value) {
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";

  try {
    const version = await createDiagramVersion({
      documentKey: props.documentKey,
      source: props.currentSource,
      comment: comment.value,
    });
    versions.value = [version, ...versions.value];
    comment.value = "";
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("versions.saveError");
  } finally {
    isSaving.value = false;
  }
}

async function requestRestore(version: DiagramVersion): Promise<void> {
  if (version.source === props.currentSource) {
    emit("restore", version.source);
    emit("close");
    return;
  }

  const confirmed = await confirm({
    title: t("versions.restoreTitle"),
    message: t("versions.restoreMessage", {
      number: version.versionNumber,
    }),
    confirmLabel: t("versions.restore"),
    variant: "default",
  });

  if (confirmed) {
    emit("restore", version.source);
    emit("close");
  }
}

async function requestDelete(version: DiagramVersion): Promise<void> {
  const confirmed = await confirm({
    title: t("versions.deleteTitle"),
    message: t("versions.deleteMessage", {
      number: version.versionNumber,
    }),
    confirmLabel: t("app.delete"),
    variant: "danger",
  });

  if (!confirmed) {
    return;
  }

  try {
    await deleteDiagramVersion(version.id);
    versions.value = versions.value.filter((item) => item.id !== version.id);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("versions.deleteError");
  }
}

watch(
  () => [props.open, props.documentKey] as const,
  ([isOpen]) => {
    if (isOpen) {
      comment.value = "";
      errorMessage.value = "";
      void loadVersions();
    }
  },
);
</script>

<template>
  <AppModal :open="open" :title="modalTitle" @close="emit('close')">
    <div class="versions-panel">
      <section class="versions-save">
        <label class="field">
          <span class="field-label">{{ t("versions.commentLabel") }}</span>
          <input
            v-model="comment"
            class="input"
            type="text"
            :placeholder="t('versions.commentPlaceholder')"
            :disabled="isSaving"
            @keydown.enter="saveVersion"
          />
        </label>
        <button
          class="btn btn-primary versions-save__btn"
          type="button"
          :disabled="!canSaveVersion || isSaving"
          @click="saveVersion"
        >
          {{ isSaving ? t("app.wait") : t("versions.saveCurrent") }}
        </button>
      </section>

      <p v-if="errorMessage" class="versions-error">{{ errorMessage }}</p>

      <section class="versions-list-section">
        <h3 class="versions-list-title">{{ t("versions.history") }}</h3>

        <p v-if="isLoading" class="versions-empty">{{ t("app.loading") }}</p>
        <p v-else-if="!hasVersions" class="versions-empty">
          {{ t("versions.empty") }}
        </p>

        <ul v-else class="versions-list">
          <li
            v-for="version in versions"
            :key="version.id"
            class="versions-item"
          >
            <button
              class="versions-item__main"
              type="button"
              @click="requestRestore(version)"
            >
              <span class="versions-item__number">{{ versionLabel(version) }}</span>
              <span class="versions-item__date">{{ formatDate(version.createdAt) }}</span>
              <span v-if="version.comment" class="versions-item__comment">
                {{ version.comment }}
              </span>
              <span v-else class="versions-item__comment is-muted">
                {{ t("versions.noComment") }}
              </span>
            </button>
            <div class="versions-item__actions">
              <IconButton
                :label="t('versions.restore')"
                @click="requestRestore(version)"
              >
                <ActionIcon name="history" />
              </IconButton>
              <IconButton
                :label="t('app.delete')"
                @click="requestDelete(version)"
              >
                <ActionIcon name="trash" />
              </IconButton>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <button class="btn" type="button" @click="emit('close')">
        {{ t("app.close") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.versions-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.versions-save {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.versions-save__btn {
  align-self: flex-start;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.versions-error {
  margin: 0;
  color: var(--danger);
  font-size: 0.88rem;
}

.versions-list-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.versions-list-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 600;
}

.versions-empty {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
}

.versions-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: min(40vh, 320px);
  overflow: auto;
}

.versions-item {
  display: flex;
  align-items: stretch;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface-muted);
}

.versions-item__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  color: inherit;
}

.versions-item__main:hover {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.versions-item__number {
  font-weight: 600;
  font-size: 0.9rem;
}

.versions-item__date {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.versions-item__comment {
  font-size: 0.84rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.versions-item__comment.is-muted {
  color: var(--text-muted);
  font-style: italic;
}

.versions-item__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  padding-right: 4px;
}
</style>
