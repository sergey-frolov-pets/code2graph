<script setup lang="ts">
import { computed, ref, watch } from "vue";
import LibraryModalHeader from "@/components/library/LibraryModalHeader.vue";
import LibraryModalContent from "@/components/library/LibraryModalContent.vue";
import SectionEditModal from "@/components/SectionEditModal.vue";
import LibraryRegisterModal from "@/components/library/LibraryRegisterModal.vue";
import LibrarySetupAdminModal from "@/components/library/LibrarySetupAdminModal.vue";
import LibraryDiagramVersionsModal from "@/components/library/LibraryDiagramVersionsModal.vue";
import LibraryDiagramPreviewModal from "@/components/library/LibraryDiagramPreviewModal.vue";
import LibraryShareLinkModal from "@/components/library/LibraryShareLinkModal.vue";
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
import { useLibraryDiagramPreview } from "@/composables/useLibraryDiagramPreview";
import { RATINGS_SECTION_ID } from "@/constants/diagram-library";
import { useTransientNotice } from "@/composables/useTransientNotice";
import { waitForEngineReady } from "@/composables/usePlantUml";
import { waitForMermaidReady } from "@/services/mermaid/mermaid-engine";
import { downloadShareResource, fetchShareDiagramPreview, fetchShareResource, addDiagramFavorite, removeDiagramFavorite } from "@/services/library/api";
import { checkServerAvailability } from "@/services/library/library-sync-service";
import type { LayoutEngine } from "@/constants";
import type { RenderMode } from "@/constants/render-settings";

const props = defineProps<{
  open: boolean;
  renderMode: RenderMode;
  layout: LayoutEngine;
  diagramDarkMode: boolean;
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

const { isAdmin, needsSetup, registrationEnabled, isAuthenticated, checkLibraryAuthStatus, refreshCurrentUser } = useLibraryAuth();
const {
  previewMarkup,
  isRendering: isPreviewRendering,
  error: previewError,
  watermark,
  renderPreview,
  resetPreview,
  watermarkLabel,
} = useLibraryDiagramPreview();

const isShareModalOpen = ref(false);
const shareResource = ref<{
  type: "section" | "diagram";
  id: string;
  title: string;
} | null>(null);
const isPreviewModalOpen = ref(false);
const isVersionsModalOpen = ref(false);
const previewTitle = ref("");
const previewCanDownload = ref(false);
const previewDownloadsRemaining = ref<number | null>(null);
const isPreviewDownloading = ref(false);
const activeShareToken = ref("");
const activePreviewDiagramId = ref("");
const shareBrowseContext = ref<{
  token: string;
  canDownload: boolean;
  downloadsRemaining: number | null;
} | null>(null);
const PENDING_SHARE_STORAGE_KEY = "plantuml-smetana-pending-share";

const library = useDiagramLibrary();
const {
  diagrams,
  selectedDiagram,
  selectedSectionId,
  flatSections,
  searchQuery,
  tagFilter,
  minRatingFilter,
  minVotesFilter,
  sortByFilter,
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
const onlineCheckFailed = ref(false);
const isCheckingOnline = ref(false);
const { notice: transientNotice, showNotice: showTransientNotice, clearNotice: clearTransientNotice } =
  useTransientNotice();
const isSectionAccessOpen = ref(false);
const sectionAccessId = ref<string | null>(null);
const sectionAccessTitle = ref("");
const isSetupModalOpen = ref(false);
const isRegisterModalOpen = ref(false);

const showAdminTab = computed(
  () =>
    isAdmin.value &&
    libraryTarget.value === "online" &&
    !needsSetup.value &&
    Boolean(libraryApiUrl.value),
);

const isOnlineSetupPending = computed(
  () =>
    needsSetup.value &&
    libraryTarget.value === "online" &&
    Boolean(libraryApiUrl.value),
);

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
  editLanguage,
  editContentLocale,
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

const personalAdminSectionOptions = computed(() =>
  flatSectionOptions.value.filter((option) => {
    const section = flatSections.value.find((entry) => entry.id === option.id);
    return section?.canAdmin && section?.kind === "personal";
  }),
);

const canManageSubscriptions = computed(
  () =>
    personalAdminSectionOptions.value.length > 0 &&
    libraryTarget.value === "online" &&
    Boolean(libraryApiUrl.value) &&
    !needsSetup.value,
);

const {
  showBackButton,
  showModeTabs,
  headerTitle,
  breadcrumbItems,
  resetBrowseFlow,
  goBack,
  openSubscriptions,
  onSectionPick,
  onDiagramPick: browseDiagramPick,
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

async function onRatingsClick(): Promise<void> {
  await onSectionPick(RATINGS_SECTION_ID);
}

async function onRatingsDiagramPick(diagramId: string): Promise<void> {
  await browseDiagramPick(diagramId);
}

async function onRatingsSectionPick(sectionId: string): Promise<void> {
  await onSectionPick(sectionId);
}

async function onRegisterCompleted(): Promise<void> {
  await refreshCurrentUser();
  showTransientNotice(t("library.registerSuccess"));
}

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
  return t("library.offlineCache");
});

function showApiUnavailableNotice(): void {
  if (!libraryApiUrl.value) {
    return;
  }
  showTransientNotice(
    t("library.apiUnavailable", { url: libraryApiUrl.value }),
  );
}

const isOnlineButtonUnavailable = computed(() => {
  if (libraryTarget.value === "online") {
    return false;
  }
  if (!canUseOnline.value) {
    return true;
  }
  if (!isOnline.value) {
    return true;
  }
  return onlineCheckFailed.value;
});

const onlineTargetButtonClass = computed(() => {
  const classes = ["library-modes__btn"];
  if (isOnlineButtonUnavailable.value && libraryTarget.value !== "online") {
    classes.push("library-target__btn--unavailable");
  }
  return classes.join(" ");
});

function onLocalTargetClick(): void {
  onlineCheckFailed.value = false;
  setLibraryTarget("local");
  void library.refresh();
}

async function onOnlineTargetClick(): Promise<void> {
  if (isCheckingOnline.value) {
    return;
  }

  onlineCheckFailed.value = false;
  uploadError.value = "";

  if (!canUseOnline.value) {
    uploadError.value = t("library.configureServerHint");
    onlineCheckFailed.value = true;
    return;
  }

  if (!navigator.onLine) {
    uploadError.value = t("app.offline");
    onlineCheckFailed.value = true;
    return;
  }

  isCheckingOnline.value = true;
  try {
    const available = await checkServerAvailability(libraryApiUrl.value);
    if (!available) {
      showApiUnavailableNotice();
      onlineCheckFailed.value = true;
      return;
    }

    const status = await checkLibraryAuthStatus(libraryApiUrl.value);
    if (status.needsSetup) {
      isSetupModalOpen.value = true;
      setLibraryTarget("online");
      return;
    }

    setLibraryTarget("online");
    void library.refresh();
  } finally {
    isCheckingOnline.value = false;
  }
}

function switchTab(tab: LibraryTab): void {
  activeTab.value = tab;
  if (tab === "browse") resetBrowseFlow();
  if (tab !== "browse") resetEditForm();
}

function onShareSection(sectionId: string, title: string): void {
  openShareModal("section", sectionId, title);
}

function onManageSectionAccess(sectionId: string, title: string): void {
  openSectionAccess(sectionId, title);
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

function openShareModal(
  type: "section" | "diagram",
  id: string,
  title: string,
): void {
  shareResource.value = { type, id, title };
  isShareModalOpen.value = true;
}

function closeShareModal(): void {
  isShareModalOpen.value = false;
  shareResource.value = null;
}

function clearShareBrowseContext(): void {
  shareBrowseContext.value = null;
  if (!isPreviewModalOpen.value) {
    activeShareToken.value = "";
    activePreviewDiagramId.value = "";
  }
}

async function openShareDiagramPreview(token: string, diagramId: string): Promise<void> {
  const preview = await fetchShareDiagramPreview(token, diagramId);
  previewTitle.value = preview.diagram.title;
  previewCanDownload.value = preview.canDownload;
  previewDownloadsRemaining.value = preview.link.downloadsRemaining;
  activeShareToken.value = token;
  activePreviewDiagramId.value = diagramId;
  isPreviewModalOpen.value = true;
  resetPreview();
  await renderPreview(preview.diagram.source, {
    watermarked: true,
    fileName: preview.diagram.fileName,
    language: preview.diagram.language,
    renderMode: props.renderMode,
    dark: props.diagramDarkMode,
    layout: props.layout,
  });
}

async function handleDiagramPick(diagramId: string): Promise<void> {
  if (shareBrowseContext.value) {
    try {
      await openShareDiagramPreview(shareBrowseContext.value.token, diagramId);
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.shareOpenError");
    }
    return;
  }

  await browseDiagramPick(diagramId);
}

async function handleGoBack(): Promise<void> {
  if (browseStep.value === "diagrams" && shareBrowseContext.value) {
    clearShareBrowseContext();
    browseStep.value = "sections";
    resetEditForm();
    void library.refresh();
    return;
  }

  goBack();
}

function onShareCreated(url: string): void {
  uploadError.value = `${t("library.shareReady")}: ${url}`;
}

function openSectionAccess(sectionId: string, title: string): void {
  sectionAccessId.value = sectionId;
  sectionAccessTitle.value = title;
  isSectionAccessOpen.value = true;
}

async function onPreviewDiagram(): Promise<void> {
  if (!selectedDiagram.value) {
    return;
  }

  let diagram = selectedDiagram.value;
  if (!diagram.source?.trim()) {
    await library.selectDiagram(diagram.id);
    if (!selectedDiagram.value?.source?.trim()) {
      uploadError.value = t("library.previewSourceMissing");
      return;
    }
    diagram = selectedDiagram.value;
  }

  resetPreview();
  previewTitle.value = diagram.title;
  previewCanDownload.value = true;
  previewDownloadsRemaining.value = null;
  activeShareToken.value = "";
  activePreviewDiagramId.value = diagram.id;
  isPreviewModalOpen.value = true;
  await renderPreview(diagram.source, {
    watermarked: true,
    fileName: diagram.fileName,
    language: diagram.language,
    renderMode: props.renderMode,
    dark: props.diagramDarkMode,
    layout: props.layout,
  });
}

function closePreviewModal(): void {
  isPreviewModalOpen.value = false;
  resetPreview();
  activeShareToken.value = "";
  activePreviewDiagramId.value = "";
}

async function onPreviewDownload(): Promise<void> {
  const diagramId =
    activePreviewDiagramId.value || selectedDiagram.value?.id;
  if (!diagramId) {
    return;
  }

  if (activeShareToken.value) {
    isPreviewDownloading.value = true;
    try {
      const result = await downloadShareResource(
        activeShareToken.value,
        diagramId,
      );
      previewDownloadsRemaining.value = result.link.downloadsRemaining;
      emit("open-diagram", {
        content: result.diagram.source,
        fileName: result.diagram.fileName,
        diagramId: result.diagram.id,
      });
      closePreviewModal();
      emit("close");
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.downloadError");
    } finally {
      isPreviewDownloading.value = false;
    }
    return;
  }

  if (!selectedDiagram.value) {
    return;
  }

  emit("open-diagram", {
    content: selectedDiagram.value.source,
    fileName: selectedDiagram.value.fileName,
    diagramId: selectedDiagram.value.id,
  });
  closePreviewModal();
  emit("close");
}

function onShareDiagram(): void {
  if (!selectedDiagram.value) return;
  openShareModal(
    "diagram",
    selectedDiagram.value.id,
    selectedDiagram.value.title,
  );
}

async function onToggleFavorite(): Promise<void> {
  if (!selectedDiagram.value || !libraryApiUrl.value) {
    return;
  }

  try {
    const diagram = selectedDiagram.value.isFavorite
      ? await removeDiagramFavorite(
          selectedDiagram.value.id,
          libraryApiUrl.value,
        )
      : await addDiagramFavorite(
          selectedDiagram.value.id,
          libraryApiUrl.value,
        );
    selectedDiagram.value = diagram;
    void library.searchDiagrams();
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : t("library.favoriteError");
  }
}

function onRatingUpdated(diagram: typeof selectedDiagram.value): void {
  if (!diagram) {
    return;
  }
  selectedDiagram.value = diagram;
  void library.searchDiagrams();
}

function onVersionsRestored(diagram: NonNullable<typeof selectedDiagram.value>): void {
  selectedDiagram.value = diagram;
  void library.searchDiagrams();
}

function closeSectionAccess(): void {
  isSectionAccessOpen.value = false;
  sectionAccessId.value = null;
  sectionAccessTitle.value = "";
}

async function handleIncomingShareToken(token: string): Promise<void> {
  try {
    const payload = await fetchShareResource(token);
    if (payload.resourceType === "diagram" && payload.diagram) {
      await openShareDiagramPreview(token, payload.diagram.id);
      return;
    }

    if (payload.resourceType === "section") {
      uploadError.value = t("library.shareSectionHint");
      shareBrowseContext.value = {
        token,
        canDownload: payload.canDownload ?? false,
        downloadsRemaining: payload.link?.downloadsRemaining ?? null,
      };
      activeShareToken.value = token;
      selectedSectionId.value = payload.sectionId ?? null;
      diagrams.value = payload.diagrams ?? [];
      browseStep.value = "diagrams";
    }
  } catch (error) {
    uploadError.value =
      error instanceof Error ? error.message : t("library.shareOpenError");
  }
}

async function initializeLibraryState(): Promise<void> {
  if (!libraryApiUrl.value) {
    void refreshCurrentUser();
    void library.refresh();
    return;
  }

  try {
    const status = await checkLibraryAuthStatus(libraryApiUrl.value);
    if (status.needsSetup) {
      isSetupModalOpen.value = true;
      if (libraryTarget.value === "online") {
        return;
      }
    }
  } catch {
    // Server unreachable — refresh will surface cache/offline state.
  }

  void refreshCurrentUser();
  void library.refresh().then(() => {
    if (
      libraryTarget.value === "online" &&
      libraryApiUrl.value &&
      !apiAvailable.value &&
      !needsSetup.value
    ) {
      showApiUnavailableNotice();
    }
  });
}

async function onSetupCompleted(): Promise<void> {
  isSetupModalOpen.value = false;
  setLibraryTarget("online");
  await refreshCurrentUser();
  await library.refresh();
}

function onSetupClose(): void {
  isSetupModalOpen.value = false;
  if (needsSetup.value && libraryTarget.value === "online") {
    setLibraryTarget("local");
    void library.refresh();
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      clearShareBrowseContext();
      clearTransientNotice();
      return;
    }

    if (isOpen) {
      resetUploadSectionId();
      resetImportBundle();
      activeTab.value = "browse";
      resetBrowseFlow();
      resetSectionAdmin();
      void waitForEngineReady();
      void waitForMermaidReady(props.diagramDarkMode);
      void initializeLibraryState();

      const pendingShare = sessionStorage.getItem(PENDING_SHARE_STORAGE_KEY);
      if (pendingShare) {
        sessionStorage.removeItem(PENDING_SHARE_STORAGE_KEY);
        void handleIncomingShareToken(pendingShare);
      }
    }
  },
);

watch(activeTab, (tab) => {
  if (tab === "transfer") void loadTransferData();
});

watch(searchQuery, () => library.scheduleSearch());
watch(tagFilter, () => void library.searchDiagrams());
watch(minRatingFilter, () => void library.searchDiagrams());
watch(minVotesFilter, () => void library.searchDiagrams());
watch(sortByFilter, () => void library.searchDiagrams());
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
      <LibraryModalHeader
        :show-back-button="showBackButton"
        :header-title="headerTitle"
        :breadcrumb-items="breadcrumbItems"
        :show-mode-tabs="showModeTabs"
        :status-hint="statusHint"
        :transient-notice="transientNotice"
        :library-target="libraryTarget"
        :registration-enabled="registrationEnabled"
        :is-authenticated="isAuthenticated"
        :is-syncing="isSyncing"
        :is-checking-online="isCheckingOnline"
        :online-target-button-class="onlineTargetButtonClass"
        :show-admin-tab="showAdminTab"
        :active-tab="activeTab"
        @back="handleGoBack()"
        @close="emit('close')"
        @refresh="library.refresh()"
        @register="isRegisterModalOpen = true"
        @local-target="onLocalTargetClick()"
        @online-target="onOnlineTargetClick()"
        @switch-tab="switchTab($event)"
      />

      <LibraryModalContent
        :is-online-setup-pending="isOnlineSetupPending"
        :library-api-url="libraryApiUrl"
        :upload-error="uploadError"
        :error-message="errorMessage"
        :active-tab="activeTab"
        :browse-step="browseStep"
        :flat-section-options="flatSectionOptions"
        :flat-sections="flatSections"
        :selected-section-id="selectedSectionId"
        :is-sections-edit-mode="isSectionsEditMode"
        :is-admin="isAdmin"
        :can-manage-subscriptions="canManageSubscriptions"
        :personal-admin-section-options="personalAdminSectionOptions"
        :diagrams="diagrams"
        :all-tags="allTags"
        :is-loading="isLoading"
        :search-query="searchQuery"
        :tag-filter="tagFilter"
        :min-rating-filter="minRatingFilter"
        :min-votes-filter="minVotesFilter"
        :sort-by-filter="sortByFilter"
        :selected-diagram="selectedDiagram"
        :edit-title="editTitle"
        :edit-description="editDescription"
        :edit-tags="editTags"
        :edit-section-id="editSectionId"
        :edit-visibility="editVisibility"
        :edit-language="editLanguage"
        :edit-content-locale="editContentLocale"
        :is-editing="isEditing"
        :is-saving="isSaving"
        :upload-title="uploadTitle"
        :upload-description="uploadDescription"
        :upload-tags="uploadTags"
        :upload-section-id="uploadSectionId"
        :upload-visibility="uploadVisibility"
        :upload-file="uploadFile"
        :max-size-kb="maxSizeKb"
        :is-uploading="isUploading"
        :transfer-sections="transferSections"
        :transfer-diagrams="transferDiagrams"
        :server-transfer-sections="serverTransferSections"
        :server-transfer-diagrams="serverTransferDiagrams"
        :can-sync-online="canSyncOnline"
        :import-bundle="importBundle"
        :is-transfer-processing="isTransferProcessing"
        :show-admin-tab="showAdminTab"
        @setup-completed="onSetupCompleted()"
        @all-sections-click="onAllSectionsClick()"
        @section-row-click="onSectionRowClick($event)"
        @toggle-edit-mode="toggleSectionsEditMode()"
        @create-section="createSection($event)"
        @delete-section="onDeleteSection"
        @share-section="onShareSection"
        @manage-access="onManageSectionAccess"
        @ratings-click="onRatingsClick()"
        @subscriptions-click="openSubscriptions()"
        @diagram-pick="handleDiagramPick($event)"
        @filters-change="library.searchDiagrams()"
        @save-edit="saveEdit()"
        @cancel-edit="resetEditForm()"
        @start-edit="startEdit()"
        @open-in-editor="openInEditor()"
        @share="onShareDiagram()"
        @preview="onPreviewDiagram()"
        @delete="onDeleteDiagram()"
        @toggle-favorite="onToggleFavorite()"
        @rating-updated="onRatingUpdated($event)"
        @open-versions="isVersionsModalOpen = true"
        @file-change="onFileChange($event)"
        @submit-upload="submitUpload()"
        @export="onExportSelection($event)"
        @import="onImportSelection($event)"
        @load-import-file="onImportFile($event)"
        @push-to-server="onPushToServer($event)"
        @pull-from-server="onPullFromServer($event)"
        @ratings-diagram-pick="onRatingsDiagramPick($event)"
        @ratings-section-pick="onRatingsSectionPick($event)"
        @update:search-query="searchQuery = $event"
        @update:tag-filter="tagFilter = $event"
        @update:min-rating-filter="minRatingFilter = $event"
        @update:min-votes-filter="minVotesFilter = $event"
        @update:sort-by-filter="sortByFilter = $event"
        @update:edit-title="editTitle = $event"
        @update:edit-description="editDescription = $event"
        @update:edit-tags="editTags = $event"
        @update:edit-section-id="editSectionId = $event"
        @update:edit-visibility="editVisibility = $event"
        @update:edit-language="editLanguage = $event"
        @update:edit-content-locale="editContentLocale = $event"
        @update:upload-title="uploadTitle = $event"
        @update:upload-description="uploadDescription = $event"
        @update:upload-tags="uploadTags = $event"
        @update:upload-section-id="uploadSectionId = $event"
        @update:upload-visibility="uploadVisibility = $event"
      />
    </div>
  </Teleport>

  <LibrarySetupAdminModal
    :open="isSetupModalOpen"
    :api-url="libraryApiUrl"
    @completed="onSetupCompleted()"
    @close="onSetupClose()"
  />

  <SectionEditModal
    :open="isSectionModalOpen"
    :section="editingSection"
    :section-options="sectionOptionsForModal"
    @close="closeSectionEditor()"
    @save="saveSectionEdit($event)"
  />
  <LibraryShareLinkModal
    v-if="shareResource"
    :open="isShareModalOpen"
    :resource-type="shareResource.type"
    :resource-id="shareResource.id"
    :resource-title="shareResource.title"
    @close="closeShareModal()"
    @created="onShareCreated($event)"
  />

  <LibraryDiagramPreviewModal
    :open="isPreviewModalOpen"
    :title="previewTitle"
    :preview-markup="previewMarkup"
    :is-rendering="isPreviewRendering"
    :error="previewError"
    :watermarked="watermark"
    :watermark-label="watermarkLabel()"
    :can-download="previewCanDownload"
    :downloads-remaining="previewDownloadsRemaining"
    :is-downloading="isPreviewDownloading"
    @close="closePreviewModal()"
    @download="onPreviewDownload()"
  />

  <LibraryDiagramVersionsModal
    :open="isVersionsModalOpen"
    :diagram="selectedDiagram"
    :api-url="libraryApiUrl"
    @close="isVersionsModalOpen = false"
    @restored="onVersionsRestored($event)"
  />

  <LibrarySectionAccessModal
    :open="isSectionAccessOpen"
    :section-id="sectionAccessId"
    :section-title="sectionAccessTitle"
    @close="closeSectionAccess()"
  />

  <LibraryRegisterModal
    :open="isRegisterModalOpen"
    :api-url="libraryApiUrl"
    @close="isRegisterModalOpen = false"
    @registered="onRegisterCompleted()"
  />
</template>

<style src="./library/library-modal.css"></style>
