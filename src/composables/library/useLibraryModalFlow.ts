import { computed, ref, watch, type Ref } from "vue";
import type { TranslateFn } from "@/locales/types";
import { useDiagramLibrary } from "@/composables/useDiagramLibrary";
import { useLibraryApiUrl } from "@/composables/useLibraryApiUrl";
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
import { useLibraryModalTarget } from "@/composables/library/useLibraryModalTarget";
import { useLibraryShareFlow } from "@/composables/library/useLibraryShareFlow";
import { useLibraryPreviewFlow } from "@/composables/library/useLibraryPreviewFlow";
import { useTransientNotice } from "@/composables/useTransientNotice";
import { waitForEngineReady } from "@/composables/usePlantUml";
import { waitForMermaidReady } from "@/services/mermaid/mermaid-engine";
import {
  addDiagramFavorite,
  removeDiagramFavorite,
} from "@/services/library/api";
import { PENDING_SUBSCRIPTION_STORAGE_KEY } from "@/constants/library-subscription";
import {
  fetchSubscriptionAccess,
  fetchSubscriptionAccessDiagram,
  fetchSubscriptionAccessSectionDiagrams,
} from "@/services/library/api/subscriptions";
import { RATINGS_SECTION_ID } from "@/constants/diagram-library";
import type { LayoutEngine } from "@/constants";
import type { DiagramFormat } from "@/constants/diagram-formats";
import type { RenderMode } from "@/constants/render-settings";
import type {
  DiagramDto,
  GrantedSubscriptionDto,
  SubscriptionDto,
} from "@/constants/diagram-library";
import {
  readLibraryBrowseSession,
  restoreLibraryBrowseSession,
  saveLibraryBrowseSession,
} from "@/composables/library/library-browse-session";

export interface UseLibraryModalFlowOptions {
  open: Ref<boolean>;
  renderMode: Ref<RenderMode>;
  layout: Ref<LayoutEngine>;
  diagramDarkMode: Ref<boolean>;
  onOpenDiagram: (payload: {
    content: string;
    fileName: string;
    format?: DiagramFormat;
    diagramId?: string;
  }) => void;
  onClose: () => void;
  t: TranslateFn;
}

export function useLibraryModalFlow(options: UseLibraryModalFlowOptions) {
  const { open, renderMode, layout, diagramDarkMode, onOpenDiagram, onClose, t } =
    options;

  const { confirm, prompt } = useAppDialog();
  const { libraryApiUrl } = useLibraryApiUrl();
  const {
    isAdmin,
    needsSetup,
    registrationEnabled,
    isAuthenticated,
    checkLibraryAuthStatus,
    refreshCurrentUser,
  } = useLibraryAuth();

  const preview = useLibraryDiagramPreview();
  const library = useDiagramLibrary();
  const activeShareToken = ref("");

  const activeTab = ref<LibraryTab>("browse");
  const browseStep = ref<BrowseStep>("sections");
  const uploadError = ref("");
  const isSectionAccessOpen = ref(false);
  const sectionAccessId = ref<string | null>(null);
  const sectionAccessTitle = ref("");
  const isSetupModalOpen = ref(false);
  const isRegisterModalOpen = ref(false);
  const isVersionsModalOpen = ref(false);

  const {
    notice: transientNotice,
    showNotice: showTransientNotice,
    clearNotice: clearTransientNotice,
  } = useTransientNotice();

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
    onOpenDiagram,
    onClose,
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
    selectedSectionId: library.selectedSectionId,
    resetBrowseFlow,
    t,
  });

  const target = useLibraryModalTarget({
    library,
    libraryApiUrl,
    uploadError,
    showTransientNotice,
    onNeedsSetup: () => {
      isSetupModalOpen.value = true;
    },
    t,
  });

  const previewFlow = useLibraryPreviewFlow({
    library,
    preview,
    uploadError,
    activeShareToken,
    libraryApiUrl,
    renderMode,
    layout,
    diagramDarkMode,
    onOpenDiagram,
    onCloseLibrary: onClose,
    t,
  });

  const shareFlow = useLibraryShareFlow({
    library,
    browseStep,
    uploadError,
    resetEditForm,
    browseDiagramPick,
    goBack,
    openShareDiagramPreview: previewFlow.openShareDiagramPreview,
    t,
  });

  const subscriptionBrowseContext = ref<{
    token: string;
    canDownload: boolean;
    readOnly: boolean;
  } | null>(null);

  function clearSubscriptionBrowseContext(): void {
    subscriptionBrowseContext.value = null;
  }

  function consumePendingSubscriptionToken(): string | null {
    const pending = sessionStorage.getItem(PENDING_SUBSCRIPTION_STORAGE_KEY);
    if (!pending) {
      return null;
    }

    sessionStorage.removeItem(PENDING_SUBSCRIPTION_STORAGE_KEY);
    return pending;
  }

  async function handleIncomingSubscriptionToken(token: string): Promise<void> {
    try {
      const payload = await fetchSubscriptionAccess(token, libraryApiUrl.value);
      subscriptionBrowseContext.value = {
        token,
        canDownload: payload.canDownload,
        readOnly: payload.readOnly,
      };

      if (payload.primaryTarget?.type === "diagram") {
        const preview = await fetchSubscriptionAccessDiagram(
          token,
          payload.primaryTarget.id,
          libraryApiUrl.value,
        );
        library.selectedDiagram.value = preview.diagram;
        browseStep.value = "detail";
        return;
      }

      if (payload.primaryTarget?.type === "section") {
        uploadError.value = t("library.subscriptionSectionHint", {
          title: payload.subscription.title,
        });
        library.selectedSectionId.value = payload.primaryTarget.id;
        const sectionPayload = await fetchSubscriptionAccessSectionDiagrams(
          token,
          payload.primaryTarget.id,
          libraryApiUrl.value,
        );
        library.diagrams.value = sectionPayload.diagrams;
        browseStep.value = "diagrams";
        return;
      }

      browseStep.value = "subscriptions";
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.subscriptionOpenError");
    }
  }

  async function onOpenSubscriptionTarget(payload: {
    type: "section" | "diagram";
    id: string;
    subscription?: GrantedSubscriptionDto | SubscriptionDto;
  }): Promise<void> {
    clearSubscriptionBrowseContext();
    if (payload.type === "diagram") {
      await browseDiagramPick(payload.id);
      return;
    }

    await onSectionPick(payload.id);
  }

  const showAdminTab = computed(
    () =>
      isAdmin.value &&
      target.libraryTarget.value === "online" &&
      !needsSetup.value &&
      Boolean(libraryApiUrl.value),
  );

  const isOnlineSetupPending = computed(
    () =>
      needsSetup.value &&
      target.libraryTarget.value === "online" &&
      Boolean(libraryApiUrl.value),
  );

  const personalAdminSectionOptions = computed(() =>
    flatSectionOptions.value.filter((option) => {
      const section = library.flatSections.value.find(
        (entry) => entry.id === option.id,
      );
      return section?.canAdmin && section?.kind === "personal";
    }),
  );

  const canManageSubscriptions = computed(
    () =>
      personalAdminSectionOptions.value.length > 0 &&
      target.libraryTarget.value === "online" &&
      Boolean(libraryApiUrl.value) &&
      !needsSetup.value,
  );

  function switchTab(tab: LibraryTab): void {
    activeTab.value = tab;
    if (tab === "browse") {
      resetBrowseFlow();
    }
    if (tab !== "browse") {
      resetEditForm();
    }
  }

  async function onRatingsClick(): Promise<void> {
    await onSectionPick(RATINGS_SECTION_ID);
  }

  async function onRegisterCompleted(): Promise<void> {
    await refreshCurrentUser();
    showTransientNotice(t("library.registerSuccess"));
  }

  function onShareSection(sectionId: string, title: string): void {
    shareFlow.openShareModal("section", sectionId, title);
  }

  function onManageSectionAccess(sectionId: string, title: string): void {
    sectionAccessId.value = sectionId;
    sectionAccessTitle.value = title;
    isSectionAccessOpen.value = true;
  }

  async function onDeleteDiagram(): Promise<void> {
    if (!library.selectedDiagram.value) {
      return;
    }

    await deleteDiagram(
      library.selectedDiagram.value.id,
      library.selectedDiagram.value.title,
      confirm,
      () => loadTransferData(),
    );
  }

  function onShareDiagram(): void {
    if (!library.selectedDiagram.value) {
      return;
    }

    shareFlow.openShareModal(
      "diagram",
      library.selectedDiagram.value.id,
      library.selectedDiagram.value.title,
    );
  }

  async function onToggleFavorite(): Promise<void> {
    if (!library.selectedDiagram.value || !libraryApiUrl.value) {
      return;
    }

    try {
      const diagram = library.selectedDiagram.value.isFavorite
        ? await removeDiagramFavorite(
            library.selectedDiagram.value.id,
            libraryApiUrl.value,
          )
        : await addDiagramFavorite(
            library.selectedDiagram.value.id,
            libraryApiUrl.value,
          );
      library.selectedDiagram.value = diagram;
      void library.searchDiagrams();
    } catch (error) {
      uploadError.value =
        error instanceof Error ? error.message : t("library.favoriteError");
    }
  }

  function onRatingUpdated(diagram: DiagramDto | null): void {
    if (!diagram) {
      return;
    }
    library.selectedDiagram.value = diagram;
    void library.searchDiagrams();
  }

  function onVersionsRestored(diagram: DiagramDto): void {
    library.selectedDiagram.value = diagram;
    void library.searchDiagrams();
  }

  function closeSectionAccess(): void {
    isSectionAccessOpen.value = false;
    sectionAccessId.value = null;
    sectionAccessTitle.value = "";
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
        if (target.libraryTarget.value === "online") {
          return;
        }
      }
    } catch {
      // Server unreachable — refresh will surface cache/offline state.
    }

    void refreshCurrentUser();
    void library.refresh().then(() => {
      if (
        target.libraryTarget.value === "online" &&
        libraryApiUrl.value &&
        !library.apiAvailable.value &&
        !needsSetup.value
      ) {
        target.showApiUnavailableNotice();
      }
    });
  }

  async function onSetupCompleted(): Promise<void> {
    isSetupModalOpen.value = false;
    target.setLibraryTarget("online");
    await refreshCurrentUser();
    await library.refresh();
  }

  function onSetupClose(): void {
    isSetupModalOpen.value = false;
    if (needsSetup.value && target.libraryTarget.value === "online") {
      target.setLibraryTarget("local");
      void library.refresh();
    }
  }

  watch(open, (isOpen) => {
    if (!isOpen) {
      saveLibraryBrowseSession({
        activeTab: activeTab.value,
        browseStep: browseStep.value,
        selectedSectionId: library.selectedSectionId.value,
        selectedDiagramId: library.selectedDiagram.value?.id ?? null,
      });
      shareFlow.clearShareBrowseContext(!previewFlow.isPreviewModalOpen.value);
      clearSubscriptionBrowseContext();
      clearTransientNotice();
      return;
    }

    resetUploadSectionId();
    resetImportBundle();
    resetSectionAdmin();

    const savedSession = readLibraryBrowseSession();
    if (savedSession) {
      void restoreLibraryBrowseSession(savedSession, {
        library,
        activeTab,
        browseStep,
        resetBrowseFlow,
      });
    } else {
      activeTab.value = "browse";
      resetBrowseFlow();
    }

    void waitForEngineReady();
    void waitForMermaidReady(diagramDarkMode.value);
    void initializeLibraryState();

    const pendingShare = shareFlow.consumePendingShareToken();
    if (pendingShare) {
      void shareFlow.handleIncomingShareToken(pendingShare);
    }

    const pendingSubscription = consumePendingSubscriptionToken();
    if (pendingSubscription) {
      void handleIncomingSubscriptionToken(pendingSubscription);
    }
  });

  watch(activeTab, (tab) => {
    if (tab === "transfer") {
      void loadTransferData();
    }
  });

  watch(library.searchQuery, () => library.scheduleSearch());
  watch(library.tagFilter, () => void library.searchDiagrams());
  watch(library.minRatingFilter, () => void library.searchDiagrams());
  watch(library.minVotesFilter, () => void library.searchDiagrams());
  watch(library.sortByFilter, () => void library.searchDiagrams());
  watch(libraryApiUrl, () => {
    if (open.value) {
      void library.refresh();
    }
  });
  watch(target.libraryTarget, () => {
    if (open.value) {
      void library.refresh();
    }
  });

  async function handleDiagramPick(diagramId: string): Promise<void> {
    if (subscriptionBrowseContext.value) {
      try {
        await previewFlow.openSubscriptionDiagramPreview(
          subscriptionBrowseContext.value.token,
          diagramId,
        );
      } catch (error) {
        uploadError.value =
          error instanceof Error
            ? error.message
            : t("library.subscriptionOpenError");
      }
      return;
    }

    await shareFlow.handleDiagramPick(diagramId);
  }

  async function handleGoBack(): Promise<void> {
    if (browseStep.value === "diagrams" && subscriptionBrowseContext.value) {
      clearSubscriptionBrowseContext();
      browseStep.value = "sections";
      resetEditForm();
      void library.refresh();
      return;
    }

    if (browseStep.value === "detail" && subscriptionBrowseContext.value) {
      browseStep.value = "diagrams";
      resetEditForm();
      return;
    }

    await shareFlow.handleGoBack();
  }

  async function onPreviewDiagram(): Promise<void> {
    if (subscriptionBrowseContext.value && library.selectedDiagram.value) {
      try {
        await previewFlow.openSubscriptionDiagramPreview(
          subscriptionBrowseContext.value.token,
          library.selectedDiagram.value.id,
        );
      } catch (error) {
        uploadError.value =
          error instanceof Error
            ? error.message
            : t("library.subscriptionOpenError");
      }
      return;
    }

    await previewFlow.onPreviewDiagram();
  }

  function onShareCreated(url: string): void {
    shareFlow.onShareCreated(url, (message) => {
      uploadError.value = message;
    });
  }

  return {
    library,
    libraryApiUrl,
    previewMarkup: preview.previewMarkup,
    isPreviewRendering: preview.isRendering,
    previewError: preview.error,
    watermark: preview.watermark,
    watermarkLabel: preview.watermarkLabel,
    libraryTarget: target.libraryTarget,
    isCheckingOnline: target.isCheckingOnline,
    statusHint: target.statusHint,
    toggleLibraryTarget: target.toggleLibraryTarget,
    isShareModalOpen: shareFlow.isShareModalOpen,
    shareResource: shareFlow.shareResource,
    closeShareModal: shareFlow.closeShareModal,
    handleDiagramPick,
    handleGoBack,
    isPreviewModalOpen: previewFlow.isPreviewModalOpen,
    previewTitle: previewFlow.previewTitle,
    previewCanDownload: previewFlow.previewCanDownload,
    previewDownloadsRemaining: previewFlow.previewDownloadsRemaining,
    isPreviewDownloading: previewFlow.isPreviewDownloading,
    onPreviewDiagram,
    closePreviewModal: previewFlow.closePreviewModal,
    onPreviewDownload: previewFlow.onPreviewDownload,
    diagrams: library.diagrams,
    flatSections: library.flatSections,
    selectedSectionId: library.selectedSectionId,
    selectedDiagram: library.selectedDiagram,
    searchQuery: library.searchQuery,
    tagFilter: library.tagFilter,
    minRatingFilter: library.minRatingFilter,
    minVotesFilter: library.minVotesFilter,
    sortByFilter: library.sortByFilter,
    allTags: library.allTags,
    isLoading: library.isLoading,
    isSyncing: library.isSyncing,
    errorMessage: library.errorMessage,
    refreshLibrary: library.refresh,
    searchDiagrams: library.searchDiagrams,
    activeTab,
    browseStep,
    uploadError,
    transientNotice,
    isSectionAccessOpen,
    sectionAccessId,
    sectionAccessTitle,
    isSetupModalOpen,
    isRegisterModalOpen,
    isVersionsModalOpen,
    showAdminTab,
    isOnlineSetupPending,
    personalAdminSectionOptions,
    canManageSubscriptions,
    isEditing,
    isSaving,
    editTitle,
    editDescription,
    editTags,
    editSectionId,
    editVisibility,
    editLanguage,
    editContentLocale,
    isSectionsEditMode,
    isSectionModalOpen,
    flatSectionOptions,
    sectionOptionsForModal,
    editingSection,
    showBackButton,
    showModeTabs,
    headerTitle,
    breadcrumbItems,
    transferSections,
    transferDiagrams,
    serverTransferSections,
    serverTransferDiagrams,
    canSyncOnline,
    importBundle,
    isTransferProcessing,
    uploadTitle,
    uploadDescription,
    uploadTags,
    uploadSectionId,
    uploadVisibility,
    uploadFile,
    maxSizeKb,
    isUploading,
    registrationEnabled,
    isAuthenticated,
    needsSetup,
    isAdmin,
    switchTab,
    onRatingsClick,
    onRegisterCompleted,
    onShareSection,
    onManageSectionAccess,
    onDeleteDiagram,
    onShareDiagram,
    onToggleFavorite,
    onRatingUpdated,
    onVersionsRestored,
    closeSectionAccess,
    onSetupCompleted,
    onSetupClose,
    toggleSectionsEditMode,
    closeSectionEditor,
    createSection,
    onSectionRowClick,
    onAllSectionsClick,
    saveSectionEdit,
    onDeleteSection,
    resetEditForm,
    startEdit,
    saveEdit,
    openInEditor,
    openSubscriptions,
    onOpenSubscriptionTarget,
    onSectionPick,
    onFileChange,
    submitUpload,
    onExportSelection,
    onImportFile,
    onImportSelection,
    onPushToServer,
    onPullFromServer,
    onShareCreated,
  };
}
