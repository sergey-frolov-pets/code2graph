<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import { useLocale } from "@/composables/useLocale";
import { useLibraryTarget } from "@/config/library-target";
import { diagramDataLinkUrl } from "@/router";
import { DATA_LINK_EXAMPLE_URL } from "@/services/local-data-link/constants";
import { pickSpreadsheetFile } from "@/services/local-data-link/file-access";
import { parseSheetRange } from "@/services/local-data-link/sheet-range";
import {
  findLocalDataLinkBySlug,
  getLocalDataLink,
  isDataLinkSlug,
  LocalDataLinkSlugTakenError,
  normalizeDataLinkSlug,
  saveLocalDataLink,
  type LocalDataLinkRecord,
} from "@/storage/local-data-links";

const props = defineProps<{
  diagramId: string;
}>();

const { t } = useLocale();
const { libraryTarget } = useLibraryTarget();
const isLocal = computed(() => libraryTarget.value === "local");

const filePathLabel = ref("");
const sheetRange = ref("A1:B2");
const untilEmptyRow = ref(false);
const slug = ref("");
const fileName = ref("");
const fileHandle = ref<FileSystemFileHandle | null>(null);
const errorMessage = ref("");
const statusMessage = ref("");
const isSaving = ref(false);

const showCsvHint = computed(() =>
  /\.csv$/i.test(filePathLabel.value) || /\.csv$/i.test(fileName.value),
);

type AddressHintMark = "text" | "local" | "example";

interface AddressHintPart {
  key: string;
  text: string;
  mark: AddressHintMark;
}

function splitAddressHint(
  text: string,
  marks: ReadonlyArray<{ mark: Exclude<AddressHintMark, "text">; value: string }>,
): AddressHintPart[] {
  const ordered = marks
    .filter((mark) => mark.value.length > 0)
    .map((mark) => ({ ...mark, at: text.indexOf(mark.value) }))
    .filter((mark) => mark.at >= 0)
    .sort((left, right) => left.at - right.at);

  const parts: AddressHintPart[] = [];
  let cursor = 0;
  ordered.forEach((mark, index) => {
    if (mark.at < cursor) {
      return;
    }
    if (mark.at > cursor) {
      parts.push({
        key: `text-${index}`,
        text: text.slice(cursor, mark.at),
        mark: "text",
      });
    }
    parts.push({
      key: `${mark.mark}-${index}`,
      text: mark.value,
      mark: mark.mark,
    });
    cursor = mark.at + mark.value.length;
  });
  if (cursor < text.length) {
    parts.push({ key: "text-tail", text: text.slice(cursor), mark: "text" });
  }
  return parts;
}

const normalizedSlug = computed(() => normalizeDataLinkSlug(slug.value));
const hintUrl = computed(() =>
  isDataLinkSlug(normalizedSlug.value)
    ? diagramDataLinkUrl(window.location.origin, normalizedSlug.value)
    : DATA_LINK_EXAMPLE_URL,
);
const slugLinkReady = ref(false);
let slugCheck = 0;

watch(
  () => [props.diagramId, normalizedSlug.value, isLocal.value] as const,
  async ([diagramId, normalized, local]) => {
    const ticket = ++slugCheck;
    if (!local || !isDataLinkSlug(normalized)) {
      slugLinkReady.value = false;
      return;
    }
    const taken = await findLocalDataLinkBySlug(normalized);
    if (ticket !== slugCheck) {
      return;
    }
    slugLinkReady.value = !taken || taken.diagramId === diagramId;
  },
  { immediate: true },
);

const addressHintParts = computed(() => {
  const localWord = t("library.dataLink.addressHintLocal");
  const url = slugLinkReady.value ? hintUrl.value : DATA_LINK_EXAMPLE_URL;
  const text = t("library.dataLink.addressHint", {
    local: localWord,
    example: url,
  });
  return splitAddressHint(text, [
    { mark: "local", value: localWord },
    { mark: "example", value: url },
  ]);
});

async function loadLink(diagramId: string): Promise<void> {
  errorMessage.value = "";
  statusMessage.value = "";
  const link = await getLocalDataLink(diagramId);
  filePathLabel.value = link?.filePathLabel ?? "";
  sheetRange.value = link?.sheetRange ?? "A1:B2";
  untilEmptyRow.value = link?.untilEmptyRow ?? false;
  slug.value = link?.slug ?? "";
  fileName.value = link?.fileName ?? "";
  fileHandle.value = link?.fileHandle ?? null;
}

watch(
  () => [props.diagramId, isLocal.value] as const,
  ([diagramId, local]) => {
    if (!local) {
      return;
    }
    void loadLink(diagramId);
  },
  { immediate: true },
);

function currentRecord(): LocalDataLinkRecord | null {
  const normalized = normalizeDataLinkSlug(slug.value);
  if (!isDataLinkSlug(normalized)) {
    errorMessage.value = t("library.dataLink.slugInvalid");
    return null;
  }
  if (!parseSheetRange(sheetRange.value)) {
    errorMessage.value = t("library.dataLink.rangeInvalid");
    return null;
  }
  errorMessage.value = "";
  return {
    diagramId: props.diagramId,
    slug: normalized,
    filePathLabel: filePathLabel.value.trim(),
    sheetRange: sheetRange.value.trim(),
    untilEmptyRow: untilEmptyRow.value,
    fileName: fileName.value,
    fileHandle: fileHandle.value,
  };
}

async function onSave(): Promise<boolean> {
  const record = currentRecord();
  if (!record) {
    return false;
  }
  isSaving.value = true;
  statusMessage.value = "";
  try {
    await saveLocalDataLink(record);
    slug.value = record.slug;
    statusMessage.value = t("library.dataLink.saved");
    return true;
  } catch (error) {
    errorMessage.value =
      error instanceof LocalDataLinkSlugTakenError
        ? t("library.dataLink.slugTaken")
        : t("library.dataLink.saveError");
    return false;
  } finally {
    isSaving.value = false;
  }
}

async function onPickFile(): Promise<void> {
  errorMessage.value = "";
  const handle = await pickSpreadsheetFile(fileHandle.value);
  if (handle.status === "cancelled") {
    return;
  }
  if (handle.status === "unsupported") {
    errorMessage.value = t("library.dataLink.pickerUnsupported");
    return;
  }
  const file = await handle.handle.getFile();
  fileHandle.value = handle.handle;
  fileName.value = file.name;
  if (!filePathLabel.value.trim()) {
    filePathLabel.value = file.name;
  }
}

async function onOpenLink(): Promise<void> {
  const saved = await onSave();
  if (!saved) {
    return;
  }
  window.location.assign(diagramDataLinkUrl(window.location.origin, slug.value));
}

async function onCopyLink(): Promise<void> {
  const saved = await onSave();
  if (!saved) {
    return;
  }
  const url = diagramDataLinkUrl(window.location.origin, slug.value);
  try {
    await navigator.clipboard.writeText(url);
    statusMessage.value = t("library.dataLink.copied");
  } catch {
    errorMessage.value = t("library.dataLink.copyError");
  }
}
</script>

<template>
  <section v-if="isLocal" class="library-data-link" data-testid="library-data-link">
    <h3 class="library-data-link__title">{{ t("library.dataLink.sectionTitle") }}</h3>
    <p class="library-data-link__note">{{ t("library.dataLink.templateHint") }}</p>
    <div class="settings-field">
      <span class="settings-field__label">{{ t("library.dataLink.path") }}</span>
      <div class="library-data-link__file-row">
        <input
          v-model="filePathLabel"
          class="select"
          type="text"
          :placeholder="t('library.dataLink.pathPlaceholder')"
        />
        <button
          class="btn"
          type="button"
          :disabled="isSaving"
          data-testid="library-data-link-pick-file"
          @click="onPickFile"
        >
          {{ t("library.dataLink.pickFile") }}
        </button>
      </div>
    </div>
    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.dataLink.range") }}</span>
      <input
        v-model="sheetRange"
        class="select"
        type="text"
        :placeholder="t('library.dataLink.rangePlaceholder')"
      />
    </label>
    <p v-if="showCsvHint" class="library-data-link__note">
      {{ t("library.dataLink.csvHint") }}
    </p>
    <label class="library-data-link__check">
      <input v-model="untilEmptyRow" type="checkbox" />
      <span>{{ t("library.dataLink.untilEmpty") }}</span>
    </label>
    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.dataLink.slug") }}</span>
      <input
        v-model="slug"
        class="select"
        type="text"
        data-testid="library-data-link-slug"
        :placeholder="t('library.dataLink.slugPlaceholder')"
        @blur="slug = slug.trim().toLowerCase()"
      />
    </label>
    <p class="library-data-link__note" data-testid="library-data-link-address">
      <template v-for="part in addressHintParts" :key="part.key">
        <strong v-if="part.mark === 'local'">{{ part.text }}</strong>
        <a
          v-else-if="part.mark === 'example' && slugLinkReady"
          data-testid="library-data-link-live"
          :href="part.text"
        >{{ part.text }}</a>
        <span
          v-else-if="part.mark === 'example'"
          data-testid="library-data-link-example"
        >{{ part.text }}</span>
        <template v-else>{{ part.text }}</template>
      </template>
    </p>
    <p v-if="fileName" class="library-data-link__note">{{ fileName }}</p>
    <p v-if="errorMessage" class="library-data-link__error" role="alert">
      {{ errorMessage }}
    </p>
    <p v-else-if="statusMessage" class="library-data-link__note">{{ statusMessage }}</p>
    <div class="library-detail__actions">
      <IconButton
        :label="t('library.dataLink.openLink')"
        :disabled="isSaving"
        data-testid="library-data-link-open"
        @click="onOpenLink"
      >
        <ActionIcon name="open-link" />
      </IconButton>
      <IconButton
        :label="isSaving ? t('app.loading') : t('library.saveChanges')"
        primary
        :disabled="isSaving"
        data-testid="library-data-link-save"
        @click="onSave"
      >
        <ActionIcon name="save" />
      </IconButton>
      <IconButton
        :label="t('library.dataLink.copyLink')"
        :disabled="isSaving"
        @click="onCopyLink"
      >
        <ActionIcon name="clipboard-copy" />
      </IconButton>
    </div>
  </section>
</template>
