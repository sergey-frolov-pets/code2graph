<script setup lang="ts">
import { ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import {
  DEFAULT_SHARE_MAX_DOWNLOADS,
  type SharePermission,
} from "@/constants/diagram-library";
import { useLocale } from "@/composables/useLocale";
import {
  createDiagramShareLink,
  createSectionShareLink,
} from "@/utils/diagram-api";

const props = defineProps<{
  open: boolean;
  resourceType: "section" | "diagram";
  resourceId: string;
  resourceTitle: string;
}>();

const emit = defineEmits<{
  close: [];
  created: [url: string];
}>();

const { t } = useLocale();
const permission = ref<SharePermission>("view");
const maxDownloads = ref(DEFAULT_SHARE_MAX_DOWNLOADS);
const unlimitedDownloads = ref(false);
const permanentLink = ref(true);
const isCreating = ref(false);
const errorMessage = ref("");
const createdUrl = ref("");

function buildShareUrl(urlPath: string): string {
  const base = new URL(window.location.href);
  base.search = "";
  base.hash = "";
  if (urlPath.startsWith("?")) {
    base.search = urlPath.slice(1);
  } else {
    base.search = urlPath;
  }
  return base.toString();
}

async function createLink(): Promise<void> {
  isCreating.value = true;
  errorMessage.value = "";
  createdUrl.value = "";

  try {
    const payload = {
      permanent: permanentLink.value,
      permission: permission.value,
      maxDownloads:
        permission.value === "download" && !unlimitedDownloads.value
          ? maxDownloads.value
          : null,
    };

    const response =
      props.resourceType === "section"
        ? await createSectionShareLink(props.resourceId, payload)
        : await createDiagramShareLink(props.resourceId, payload);

    const url = buildShareUrl(response.link.urlPath);
    createdUrl.value = url;
    emit("created", url);
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.shareError");
  } finally {
    isCreating.value = false;
  }
}

async function copyUrl(): Promise<void> {
  if (!createdUrl.value) {
    return;
  }
  try {
    await navigator.clipboard.writeText(createdUrl.value);
  } catch {
    // ignore
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      permission.value = "view";
      maxDownloads.value = DEFAULT_SHARE_MAX_DOWNLOADS;
      unlimitedDownloads.value = false;
      permanentLink.value = true;
      errorMessage.value = "";
      createdUrl.value = "";
    }
  },
);
</script>

<template>
  <AppModal
    :open="open"
    :title="t('library.shareModalTitle', { title: resourceTitle })"
    layer="above-library"
    @close="emit('close')"
  >
    <p class="settings-field__hint">{{ t("library.shareModalHint") }}</p>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.sharePermission") }}</span>
      <select v-model="permission" class="select">
        <option value="view">{{ t("library.sharePermissionView") }}</option>
        <option value="download">{{ t("library.sharePermissionDownload") }}</option>
      </select>
    </label>

    <template v-if="permission === 'download'">
      <label class="settings-field settings-field--checkbox">
        <input v-model="unlimitedDownloads" type="checkbox" />
        <span>{{ t("library.shareUnlimitedDownloads") }}</span>
      </label>
      <label v-if="!unlimitedDownloads" class="settings-field">
        <span class="settings-field__label">{{ t("library.shareMaxDownloads") }}</span>
        <input
          v-model.number="maxDownloads"
          class="select"
          type="number"
          min="1"
          max="1000"
        />
      </label>
    </template>

    <label class="settings-field settings-field--checkbox">
      <input v-model="permanentLink" type="checkbox" />
      <span>{{ t("library.sharePermanent") }}</span>
    </label>

    <p v-if="errorMessage" class="settings-field__error">{{ errorMessage }}</p>

    <div v-if="createdUrl" class="library-share-result">
      <input class="select" type="text" readonly :value="createdUrl" />
      <button class="btn" type="button" @click="copyUrl()">
        {{ t("library.shareCopy") }}
      </button>
    </div>

    <template #footer>
      <button class="btn" type="button" :disabled="isCreating" @click="emit('close')">
        {{ t("app.close") }}
      </button>
      <button
        class="btn btn-primary"
        type="button"
        :disabled="isCreating"
        @click="createLink()"
      >
        {{ isCreating ? t("app.loading") : t("library.shareCreateLink") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.library-share-result {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.library-share-result .select {
  flex: 1;
}
</style>
