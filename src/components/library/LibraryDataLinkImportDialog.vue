<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";
import {
  dataLinkImportOffer,
  fileNameFromPathLabel,
  setDataLinkImportHostReady,
  settleDataLinkImport,
  cancelPendingDataLinkImports,
  type DataLinkImportChoice,
} from "@/services/local-data-link/import-offer";
import { pickSpreadsheetFile } from "@/services/local-data-link/file-access";
import {
  findLocalDataLinkBySlug,
  isDataLinkSlug,
  normalizeDataLinkSlug,
} from "@/storage/local-data-links";

const { t } = useLocale();

const slug = ref("");
const filePathLabel = ref("");
const fileName = ref("");
const fileHandle = ref<FileSystemFileHandle | null>(null);
const slugTaken = ref(false);
const slugChecking = ref(false);
const pickError = ref("");
let slugCheck = 0;

const offer = dataLinkImportOffer;
const normalizedSlug = computed(() => normalizeDataLinkSlug(slug.value));
const slugInvalid = computed(
  () => normalizedSlug.value.length > 0 && !isDataLinkSlug(normalizedSlug.value),
);
const canAccept = computed(
  () =>
    isDataLinkSlug(normalizedSlug.value) &&
    !slugTaken.value &&
    !slugChecking.value,
);
const slugError = computed(() => {
  if (slugTaken.value) {
    return t("library.dataLink.slugTaken");
  }
  if (slugInvalid.value) {
    return t("library.dataLink.slugInvalid");
  }
  return "";
});

watch(
  offer,
  (next) => {
    slug.value = next?.marker.slug ?? "";
    filePathLabel.value = next?.marker.filePathLabel ?? "";
    fileName.value = fileNameFromPathLabel(next?.marker.filePathLabel ?? "");
    fileHandle.value = null;
    pickError.value = "";
    slugTaken.value = false;
    slugChecking.value = false;
  },
  { immediate: true },
);

watch(
  () => [offer.value, normalizedSlug.value] as const,
  async ([current, normalized]) => {
    const ticket = ++slugCheck;
    if (!current || !isDataLinkSlug(normalized)) {
      slugTaken.value = false;
      slugChecking.value = false;
      return;
    }
    slugChecking.value = true;
    const taken = await findLocalDataLinkBySlug(normalized);
    if (ticket !== slugCheck) {
      return;
    }
    slugTaken.value = Boolean(taken);
    slugChecking.value = false;
  },
);

function currentChoice(accepted: boolean): DataLinkImportChoice {
  return {
    accepted,
    slug: normalizedSlug.value,
    filePathLabel: filePathLabel.value.trim(),
    fileName: fileName.value || fileNameFromPathLabel(filePathLabel.value),
    fileHandle: fileHandle.value,
  };
}

function onDecline(): void {
  if (!offer.value) {
    return;
  }
  settleDataLinkImport(currentChoice(false));
}

async function onAccept(): Promise<void> {
  if (!offer.value || !isDataLinkSlug(normalizedSlug.value)) {
    return;
  }
  const taken = await findLocalDataLinkBySlug(normalizedSlug.value);
  if (taken) {
    slugTaken.value = true;
    return;
  }
  settleDataLinkImport(currentChoice(true));
}

async function onPickFile(): Promise<void> {
  pickError.value = "";
  const picked = await pickSpreadsheetFile(fileHandle.value);
  if (picked.status === "cancelled") {
    return;
  }
  if (picked.status === "unsupported") {
    pickError.value = t("library.dataLink.pickerUnsupported");
    return;
  }
  const file = await picked.handle.getFile();
  fileHandle.value = picked.handle;
  fileName.value = file.name;
  if (!filePathLabel.value.trim()) {
    filePathLabel.value = file.name;
  }
}

onMounted(() => {
  setDataLinkImportHostReady(true);
});

onUnmounted(() => {
  setDataLinkImportHostReady(false);
  cancelPendingDataLinkImports();
});
</script>

<template>
  <AppModal
    :open="offer !== null"
    :title="t('library.dataLink.importTitle')"
    layer="above-library"
    test-id="library-data-link-import"
    @close="onDecline"
  >
    <p class="data-link-import__hint">{{ t("library.dataLink.importHint") }}</p>
    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.dataLink.slug") }}</span>
      <input
        v-model="slug"
        class="select"
        type="text"
        data-testid="library-data-link-import-slug"
        :placeholder="t('library.dataLink.slugPlaceholder')"
        @blur="slug = slug.trim().toLowerCase()"
      />
    </label>
    <p v-if="slugError" class="data-link-import__error" role="alert">
      {{ slugError }}
    </p>
    <div class="settings-field">
      <span class="settings-field__label">{{ t("library.dataLink.path") }}</span>
      <div class="data-link-import__file-row">
        <input
          v-model="filePathLabel"
          class="select"
          type="text"
          data-testid="library-data-link-import-path"
          :placeholder="t('library.dataLink.pathPlaceholder')"
        />
        <button
          class="btn"
          type="button"
          data-testid="library-data-link-import-pick"
          @click="onPickFile"
        >
          {{ t("library.dataLink.pickFile") }}
        </button>
      </div>
    </div>
    <p v-if="fileName" class="data-link-import__note">{{ fileName }}</p>
    <p v-if="pickError" class="data-link-import__error" role="alert">
      {{ pickError }}
    </p>
    <template #footer>
      <button
        class="btn"
        type="button"
        data-testid="library-data-link-import-decline"
        @click="onDecline"
      >
        {{ t("library.dataLink.importDecline") }}
      </button>
      <button
        class="btn btn-primary"
        type="button"
        data-testid="library-data-link-import-accept"
        :disabled="!canAccept"
        @click="onAccept"
      >
        {{ t("library.dataLink.importAccept") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.data-link-import__hint,
.data-link-import__note {
  margin: 0 0 12px;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.45;
}

.data-link-import__error {
  margin: 0 0 12px;
  color: var(--danger, var(--text));
}

.data-link-import__file-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.data-link-import__file-row .select {
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
}
</style>
