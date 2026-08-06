<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import LibraryTransferTab from "@/components/LibraryTransferTab.vue";
import SectionEditModal from "@/components/SectionEditModal.vue";
import LibraryBrowseSections from "@/components/library/LibraryBrowseSections.vue";
import LibraryBrowseDiagrams from "@/components/library/LibraryBrowseDiagrams.vue";
import LibraryDiagramDetail from "@/components/library/LibraryDiagramDetail.vue";
import LibraryAdminUsersPanel from "@/components/library/LibraryAdminUsersPanel.vue";
import LibrarySectionAccessModal from "@/components/library/LibrarySectionAccessModal.vue";
import { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";
import { useLocale } from "@/composables/useLocale";
import { useLibraryTarget } from "@/config/library-target";
import { useAppDialog } from "@/composables/useAppDialog";
import {
  useLibraryBrowseFlow,
  type BrowseStep,
  type LibraryTab,
} from "@/composables/library/useLibraryBrowseFlow";
import { useLibraryUpload } from "@/composables/library/useLibraryUpload";
import { useLibraryDiagramEdit } from "@/composables/library/useLibraryDiagramEdit";
import { useLibrarySectionAdmin } from "@/composables/library/useLibrarySectionAdmin";
import { useLibraryTransferHandlers } from "@/composables/library/useLibraryTransferHandlers";
import { useLibraryAuth } from "@/composables/useLibraryAuth";
import { useLibraryShare } from "@/composables/useLibraryShare";

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  "open-diagram": [
    payload: { content: string; fileName: string; diagramId?: string },
  ];
}>();

const { t } = useLocale();
const { confirm, prompt } = useAppDialog();
const { libraryApiUrl } = useLibraryApiUrl();
const { libraryTarget, canUseOnline, setLibraryTarget } = useLibraryTarget();

const { isAdmin, refreshCurrentUser } = useLibraryAuth();
const {
  shareDiagram,
  copyShareUrl,
} = useLibraryShare();

const library = useDiagramLibrary();
const {
  diagrams,
  selectedDiagram,
  selectedSectionId,
  flatSections,
  searchQuery,
  tagFilter,
  allTags,
  isLoading,
  isSyncing,
  isOnline,
  isLocalMode,
  apiAvailable,
  usingCache,
  errorMessage,
} = library;

const activeTab = ref<LibraryTab>("browse");
const browseStep = ref<BrowseStep>("sections");
const uploadError = ref("");
const isSectionAccessOpen = ref(false);
const sectionAccessId = ref<string | null>(null);
const sectionAccessTitle = ref("");
const isAdminPanelOpen = ref(false);

const onSectionPickRef = ref<(sectionId: string | null) => Promise<void>>(
  async () => {},
);
const onTransferRefreshRef = ref<() => Promise<void>>(async () => {});

const {
  isEditing,
  isSaving,
  editTitle,
  editDescription,
  editTags,
  editSectionId,
  editVisibility,
  resetEditForm,
  startEdit,
  saveEdit,
  openInEditor,
  onDeleteDiagram: deleteDiagram,
} = useLibraryDiagramEdit({
  library,
  uploadError,
  browseStep,
  t,
  onOpenDiagram: (payload) => emit("open-diagram", payload),
  onClose: () => emit("close"),
});

const {
  isSectionsEditMode,
  isSectionModalOpen,
  flatSectionOptions,
  sectionOptionsForModal,
  editingSection,
  toggleSectionsEditMode,
  closeSectionEditor,
  createSection,
  onSectionRowClick,
  onAllSectionsClick,
  saveSectionEdit,
  onDeleteSection,
  resetSectionAdmin,
} = useLibrarySectionAdmin({
  library,
  activeTab,
  browseStep,
  uploadError,
  isAdmin,
  onSectionPick: (sectionId) => onSectionPickRef.value(sectionId),
  onTransferRefresh: () => onTransferRefreshRef.value(),
  t,
  prompt,
  confirm,
});

const {
  showBackButton,
  showModeTabs,
  headerTitle,
  resetBrowseFlow,
  goBack,
  onSectionPick,
  onDiagramPick,
} = useLibraryBrowseFlow({
  library,
  activeTab,
  browseStep,
  flatSectionOptions,
  resetEditForm,
  t,
});

onSectionPickRef.value = onSectionPick;

const {
  transferSections,
  transferDiagrams,
  serverTransferSections,
  serverTransferDiagrams,
  canSyncOnline,
  importBundle,
  isTransferProcessing,
  loadTransferData,
  onExportSelection,
  onImportFile,
  onImportSelection,
  onPushToServer,
  onPullFromServer,
  resetImportBundle,
} = useLibraryTransferHandlers({
  library,
  activeTab,
  uploadError,
  resetBrowseFlow,
  t,
});

onTransferRefreshRef.value = () => loadTransferData();

const {
  uploadTitle,
  uploadDescription,
  uploadTags,
  uploadSectionId,
  uploadVisibility,
  uploadFile,
  isUploading,
  maxSizeKb,
  onFileChange,
  submitUpload,
  resetUploadSectionId,
} = useLibraryUpload({
  library,
  activeTab,
  uploadError,
  selectedSectionId,
  resetBrowseFlow,
  t,
});

const statusHint = computed(() => {
  if (libraryTarget.value === "online" && !libraryApiUrl.value) {
    return t("library.configureServerHint");
  }
  if (isLocalMode.value) {
    return t("library.localModeActive");
  }
  if (apiAvailable.value) {
    return t("library.onlineModeActive", { url: libraryApiUrl.value });
  }
  if (usingCache.value) return t("library.offlineCache");
  if (isOnline.value) return t("library.apiUnavailable");
  return t("library.offlineCache");
});

function onTargetChange(target: "local" | "online"): void {
  setLibraryTarget(target);
  void library.refresh();
}

function switchTab(tab: LibraryTab): void {
  activeTab.value = tab;
  if (tab === "browse") resetBrowseFlow();
  if (tab !== "browse") resetEditForm();
}

async function onDeleteDiagram(): Promise<void> {
  if (!selectedDiagram.value) return;
  await deleteDiagram(
    selectedDiagram.value.id,
    selectedDiagram.value.title,
    confirm,
    () => loadTransferData(),
  );
}

async function onShareDiagram(): Promise<void> {
  if (!selectedDiagram.value) return;
  const link = await shareDiagram(selectedDiagram.value.id);
  if (link) {
    const url =
      new URL(window.location.href).origin +
      window.location.pathname +
      link.urlPath;
    const copied = await copyShareUrl(url);
    uploadError.value = copied
      ? t("library.shareCopied")
      : `${t("library.shareReady")}: ${url}`;
  } else if (!uploadError.value) {
    uploadError.value = t("library.shareError");
  }
}

function closeSectionAccess(): void {
  isSectionAccessOpen.value = false;
  sectionAccessId.value = null;
  sectionAccessTitle.value = "";
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetUploadSectionId();
      resetImportBundle();
      activeTab.value = "browse";
      resetBrowseFlow();
      resetSectionAdmin();
      void refreshCurrentUser();
      void library.refresh();
    }
  },
);

watch(activeTab, (tab) => {
  if (tab === "transfer") void loadTransferData();
});

watch(searchQuery, () => library.scheduleSearch());
watch(tagFilter, () => void library.searchDiagrams());
watch(libraryApiUrl, () => {
  if (props.open) void library.refresh();
});

watch(libraryTarget, () => {
  if (props.open) void library.refresh();
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="library-screen" role="dialog" aria-modal="true">
      <header class="library-header">
        <div class="library-header__row">
          <button
            v-if="showBackButton"
            class="btn library-header__back"
            type="button"
            @click="goBack()"
          >
            ← {{ t("library.back") }}
          </button>
          <h2 class="library-header__title">{{ headerTitle }}</h2>
          <div class="library-header__actions">
            <IconButton
              :label="t('library.refresh')"
              :disabled="isSyncing"
              @click="library.refresh()"
            >
              <ActionIcon name="refresh" />
            </IconButton>
            <IconButton :label="t('app.close')" @click="emit('close')">
              <ActionIcon name="close" />
            </IconButton>
          </div>
        </div>

        <p v-if="showModeTabs" class="library-header__hint">{{ statusHint }}</p>

        <div v-if="showModeTabs && canUseOnline" class="library-target">
          <button
            class="btn library-target__btn"
            type="button"
            :class="{ 'is-active': libraryTarget === 'local' }"
            @click="onTargetChange('local')"
          >
            {{ t("library.targetLocal") }}
          </button>
          <button
            class="btn library-target__btn"
            type="button"
            :class="{ 'is-active': libraryTarget === 'online' }"
            @click="onTargetChange('online')"
          >
            {{ t("library.targetOnline") }}
          </button>
        </div>

        <nav
          v-if="showModeTabs"
          class="library-modes"
          :aria-label="t('library.title')"
        >
          <IconButton
            :label="t('library.browse')"
            extra-class="library-modes__btn"
            :pressed="activeTab === 'browse'"
            @click="switchTab('browse')"
          >
            <ActionIcon name="library" />
          </IconButton>
          <IconButton
            :label="t('library.uploadDiagram')"
            extra-class="library-modes__btn"
            :pressed="activeTab === 'upload'"
            @click="switchTab('upload')"
          >
            <ActionIcon name="export" />
          </IconButton>
          <IconButton
            :label="t('library.transfer')"
            extra-class="library-modes__btn"
            :pressed="activeTab === 'transfer'"
            @click="switchTab('transfer')"
          >
            <ActionIcon name="transfer" />
          </IconButton>
        </nav>
      </header>

      <div class="library-body">
        <p v-if="uploadError" class="library-error">{{ uploadError }}</p>
        <p v-if="errorMessage" class="library-error">{{ errorMessage }}</p>

        <LibraryBrowseSections
          v-if="activeTab === 'browse' && browseStep === 'sections'"
          :flat-section-options="flatSectionOptions"
          :flat-sections="flatSections"
          :selected-section-id="selectedSectionId"
          :is-online="isOnline"
          :is-sections-edit-mode="isSectionsEditMode"
          :can-create-shared-section="isAdmin"
          @all-sections-click="onAllSectionsClick()"
          @section-row-click="onSectionRowClick($event)"
          @toggle-edit-mode="toggleSectionsEditMode()"
          @create-section="createSection($event)"
          @delete-section="(id, title) => onDeleteSection(id, title)"
        />

        <LibraryBrowseDiagrams
          v-else-if="activeTab === 'browse' && browseStep === 'diagrams'"
          v-model:search-query="searchQuery"
          v-model:tag-filter="tagFilter"
          :diagrams="diagrams"
          :all-tags="allTags"
          :is-loading="isLoading"
          @diagram-pick="onDiagramPick($event)"
        />

        <LibraryDiagramDetail
          v-else-if="activeTab === 'browse' && browseStep === 'detail' && selectedDiagram"
          v-model:edit-title="editTitle"
          v-model:edit-description="editDescription"
          v-model:edit-tags="editTags"
          v-model:edit-section-id="editSectionId"
          v-model:edit-visibility="editVisibility"
          :diagram="selectedDiagram"
          :flat-section-options="flatSectionOptions"
          :is-editing="isEditing"
          :is-saving="isSaving"
          @save="saveEdit()"
          @cancel="resetEditForm()"
          @start-edit="startEdit()"
          @open-in-editor="openInEditor()"
          @share="onShareDiagram()"
          @delete="onDeleteDiagram()"
        />

        <LibraryUploadForm
          v-else-if="activeTab === 'upload'"
          v-model:upload-title="uploadTitle"
          v-model:upload-description="uploadDescription"
          v-model:upload-tags="uploadTags"
          v-model:upload-section-id="uploadSectionId"
          v-model:upload-visibility="uploadVisibility"
          :flat-section-options="flatSectionOptions"
          :upload-file="uploadFile"
          :max-size-kb="maxSizeKb"
          :is-uploading="isUploading"
          @file-change="onFileChange($event)"
          @submit="submitUpload()"
        />

        <div v-else-if="activeTab === 'transfer'">
          <div v-if="isAdmin" class="library-step__toolbar">
            <button class="btn" type="button" @click="isAdminPanelOpen = true">
              {{ t("library.adminUsersTitle") }}
            </button>
          </div>

          <LibraryAdminUsersPanel
            v-if="isAdmin"
            :open="isAdminPanelOpen"
            @close="isAdminPanelOpen = false"
          />

          <LibraryTransferTab
            :sections="transferSections"
            :diagrams="transferDiagrams"
            :server-sections="serverTransferSections"
            :server-diagrams="serverTransferDiagrams"
            :can-sync-online="canSyncOnline"
            :import-bundle="importBundle"
            :is-processing="isTransferProcessing"
            @export="onExportSelection($event)"
            @import="onImportSelection($event)"
            @load-import-file="onImportFile($event)"
            @push-to-server="onPushToServer($event)"
            @pull-from-server="onPullFromServer($event)"
          />
        </div>
      </div>
    </div>
  </Teleport>

  <SectionEditModal
    :open="isSectionModalOpen"
    :section="editingSection"
    :section-options="sectionOptionsForModal"
    @close="closeSectionEditor()"
    @save="saveSectionEdit($event)"
  />
  <LibrarySectionAccessModal
    :open="isSectionAccessOpen"
    :section-id="sectionAccessId"
    :section-title="sectionAccessTitle"
    @close="closeSectionAccess()"
  />
</template>

<style src="./library/library-modal.css"></style>
