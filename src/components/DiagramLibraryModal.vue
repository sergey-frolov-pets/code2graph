<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import LibraryTransferTab from "@/components/LibraryTransferTab.vue";
import SectionEditModal from "@/components/SectionEditModal.vue";
import LibraryBrowseSections from "@/components/library/LibraryBrowseSections.vue";
import LibraryBrowseDiagrams from "@/components/library/LibraryBrowseDiagrams.vue";
import LibraryDiagramDetail from "@/components/library/LibraryDiagramDetail.vue";
import LibraryUploadForm from "@/components/library/LibraryUploadForm.vue";
import { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";
import { useLocale } from "@/composables/useLocale";
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

const props = defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
  "open-diagram": [payload: { content: string; fileName: string }];
}>();

const { t } = useLocale();
const { confirm, prompt } = useAppDialog();
const { libraryApiUrl } = useLibraryApiUrl();

const library = useDiagramLibrary();
const {
  diagrams,
  selectedDiagram,
  selectedSectionId,
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
  importBundle,
  isTransferProcessing,
  loadTransferData,
  onExportSelection,
  onImportFile,
  onImportSelection,
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
  uploadSectionId,
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
  if (isLocalMode.value) return t("library.localMode");
  if (apiAvailable.value) {
    return t("library.serverMode", { url: libraryApiUrl.value });
  }
  if (usingCache.value) return t("library.offlineCache");
  if (isOnline.value) return t("library.apiUnavailable");
  return t("library.offlineCache");
});

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

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetUploadSectionId();
      resetImportBundle();
      activeTab.value = "browse";
      resetBrowseFlow();
      resetSectionAdmin();
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
          :selected-section-id="selectedSectionId"
          :is-online="isOnline"
          :is-sections-edit-mode="isSectionsEditMode"
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
          :diagram="selectedDiagram"
          :flat-section-options="flatSectionOptions"
          :is-editing="isEditing"
          :is-saving="isSaving"
          @save="saveEdit()"
          @cancel="resetEditForm()"
          @start-edit="startEdit()"
          @open-in-editor="openInEditor()"
          @delete="onDeleteDiagram()"
        />

        <LibraryUploadForm
          v-else-if="activeTab === 'upload'"
          v-model:upload-title="uploadTitle"
          v-model:upload-section-id="uploadSectionId"
          :flat-section-options="flatSectionOptions"
          :upload-file="uploadFile"
          :max-size-kb="maxSizeKb"
          :is-uploading="isUploading"
          @file-change="onFileChange($event)"
          @submit="submitUpload()"
        />

        <LibraryTransferTab
          v-else-if="activeTab === 'transfer'"
          :sections="transferSections"
          :diagrams="transferDiagrams"
          :import-bundle="importBundle"
          :is-processing="isTransferProcessing"
          @export="onExportSelection($event)"
          @import="onImportSelection($event)"
          @load-import-file="onImportFile($event)"
        />
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
</template>

<style scoped src="./library/library-modal.css"></style>
