<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import LibraryTransferTab from "@/components/LibraryTransferTab.vue";
import SectionEditModal from "@/components/SectionEditModal.vue";
import LibrarySubscriptionsPanel from "@/components/library/LibrarySubscriptionsPanel.vue";
import LibraryBrowseRatings from "@/components/library/LibraryBrowseRatings.vue";
import LibraryRegisterModal from "@/components/library/LibraryRegisterModal.vue";
import LibraryBrowseSections from "@/components/library/LibraryBrowseSections.vue";
import LibraryBrowseDiagrams from "@/components/library/LibraryBrowseDiagrams.vue";
import LibraryDiagramDetail from "@/components/library/LibraryDiagramDetail.vue";
import LibraryAdminUsersPanel from "@/components/library/LibraryAdminUsersPanel.vue";
import LibrarySetupAdminPanel from "@/components/library/LibrarySetupAdminPanel.vue";
import LibrarySetupAdminModal from "@/components/library/LibrarySetupAdminModal.vue";
import LibraryDiagramVersionsModal from "@/components/library/LibraryDiagramVersionsModal.vue";
import LibraryDiagramPreviewModal from "@/components/library/LibraryDiagramPreviewModal.vue";
import LibraryShareLinkModal from "@/components/library/LibraryShareLinkModal.vue";
import LibrarySectionAccessModal from "@/components/library/LibrarySectionAccessModal.vue";
import LibraryUploadForm from "@/components/library/LibraryUploadForm.vue";
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
      <header class="library-header">
        <div class="library-header__row">
          <button
            v-if="showBackButton"
            class="btn library-header__back"
            type="button"
            @click="handleGoBack()"
          >
            ← {{ t("library.back") }}
          </button>
          <h2 class="library-header__title">{{ headerTitle }}</h2>
          <nav
            v-if="breadcrumbItems.length > 1"
            class="library-breadcrumbs"
            :aria-label="t('library.sections')"
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
              @click="isRegisterModalOpen = true"
            >
              <ActionIcon name="plus" />
            </IconButton>
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
        <p v-if="transientNotice" class="library-header__notice" role="status">
          {{ transientNotice }}
        </p>

        <div v-if="showModeTabs" class="library-header__modes">
          <div class="library-target">
            <IconButton
              :label="t('library.targetLocal')"
              extra-class="library-modes__btn"
              :pressed="libraryTarget === 'local'"
              @click="onLocalTargetClick()"
            >
              <ActionIcon name="unlink" />
            </IconButton>
            <IconButton
              :label="t('library.targetOnline')"
              :extra-class="onlineTargetButtonClass"
              :pressed="libraryTarget === 'online'"
              :disabled="isCheckingOnline"
              @click="onOnlineTargetClick()"
            >
              <ActionIcon name="globe" />
            </IconButton>
          </div>

          <nav class="library-modes" :aria-label="t('library.title')">
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
              v-if="showAdminTab"
              :label="t('library.adminUsersTitle')"
              extra-class="library-modes__btn"
              :pressed="activeTab === 'admin'"
              @click="switchTab('admin')"
            >
              <ActionIcon name="shield" />
            </IconButton>
          </nav>
        </div>
      </header>

      <div class="library-body">
        <p v-if="uploadError" class="library-error">{{ uploadError }}</p>
        <p v-if="errorMessage" class="library-error">{{ errorMessage }}</p>

        <LibrarySetupAdminPanel
          v-if="isOnlineSetupPending"
          :api-url="libraryApiUrl"
          @completed="onSetupCompleted()"
        />

        <template v-if="!isOnlineSetupPending">
        <LibraryBrowseSections
          v-if="activeTab === 'browse' && browseStep === 'sections'"
          :flat-section-options="flatSectionOptions"
          :flat-sections="flatSections"
          :selected-section-id="selectedSectionId"
          :is-sections-edit-mode="isSectionsEditMode"
          :can-create-shared-section="isAdmin"
          :can-manage-subscriptions="canManageSubscriptions"
          @all-sections-click="onAllSectionsClick()"
          @section-row-click="onSectionRowClick($event)"
          @toggle-edit-mode="toggleSectionsEditMode()"
          @create-section="createSection($event)"
          @delete-section="(id, title) => onDeleteSection(id, title)"
          @share-section="(id, title) => openShareModal('section', id, title)"
          @manage-access="(id, title) => openSectionAccess(id, title)"
          @ratings-click="onRatingsClick()"
          @subscriptions-click="openSubscriptions()"
        />

        <LibrarySubscriptionsPanel
          v-else-if="activeTab === 'browse' && browseStep === 'subscriptions'"
          :flat-section-options="personalAdminSectionOptions"
        />

        <LibraryBrowseRatings
          v-else-if="
            activeTab === 'browse' &&
            browseStep === 'diagrams' &&
            selectedSectionId === RATINGS_SECTION_ID
          "
          @diagram-pick="onRatingsDiagramPick($event)"
          @section-pick="onRatingsSectionPick($event)"
        />

        <LibraryBrowseDiagrams
          v-else-if="activeTab === 'browse' && browseStep === 'diagrams'"
          v-model:search-query="searchQuery"
          v-model:tag-filter="tagFilter"
          v-model:min-rating-filter="minRatingFilter"
          v-model:min-votes-filter="minVotesFilter"
          v-model:sort-by-filter="sortByFilter"
          :diagrams="diagrams"
          :all-tags="allTags"
          :is-loading="isLoading"
          @diagram-pick="handleDiagramPick($event)"
          @filters-change="library.searchDiagrams()"
        />

        <LibraryDiagramDetail
          v-else-if="activeTab === 'browse' && browseStep === 'detail' && selectedDiagram"
          v-model:edit-title="editTitle"
          v-model:edit-description="editDescription"
          v-model:edit-tags="editTags"
          v-model:edit-section-id="editSectionId"
          v-model:edit-visibility="editVisibility"
          v-model:edit-language="editLanguage"
          v-model:edit-content-locale="editContentLocale"
          :diagram="selectedDiagram"
          :flat-section-options="flatSectionOptions"
          :is-editing="isEditing"
          :is-saving="isSaving"
          :library-api-url="libraryApiUrl"
          @save="saveEdit()"
          @cancel="resetEditForm()"
          @start-edit="startEdit()"
          @open-in-editor="openInEditor()"
          @share="onShareDiagram()"
          @preview="onPreviewDiagram()"
          @delete="onDeleteDiagram()"
          @toggle-favorite="onToggleFavorite()"
          @rating-updated="onRatingUpdated($event)"
          @open-versions="isVersionsModalOpen = true"
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

        <LibraryAdminUsersPanel
          v-else-if="activeTab === 'admin' && showAdminTab"
          embedded
        />
        </template>
      </div>
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
