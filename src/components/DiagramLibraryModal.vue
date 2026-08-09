<script setup lang="ts">
import { reactive, toRef } from "vue";
import LibraryModalHeader from "@/components/library/LibraryModalHeader.vue";
import LibraryModalContent from "@/components/library/LibraryModalContent.vue";
import LibraryModalOverlays from "@/components/library/LibraryModalOverlays.vue";
import { useModalStackEntry } from "@/composables/useModalStackEntry";
import { useLibraryModalFlow } from "@/composables/library/useLibraryModalFlow";
import { useLocale } from "@/composables/useLocale";
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

useModalStackEntry(
  "diagram-library",
  toRef(props, "open"),
  () => emit("close"),
  "default",
);

const { t } = useLocale();

const flow = reactive(
  useLibraryModalFlow({
    open: toRef(props, "open"),
    renderMode: toRef(props, "renderMode"),
    layout: toRef(props, "layout"),
    diagramDarkMode: toRef(props, "diagramDarkMode"),
    onOpenDiagram: (payload) => emit("open-diagram", payload),
    onClose: () => emit("close"),
    t,
  }),
);
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="library-screen" role="dialog" aria-modal="true">
      <LibraryModalHeader
        :show-back-button="flow.showBackButton"
        :header-title="flow.headerTitle"
        :breadcrumb-items="flow.breadcrumbItems"
        :show-mode-tabs="flow.showModeTabs"
        :status-hint="flow.statusHint"
        :transient-notice="flow.transientNotice"
        :library-target="flow.libraryTarget"
        :registration-enabled="flow.registrationEnabled"
        :is-authenticated="flow.isAuthenticated"
        :is-syncing="flow.isSyncing"
        :is-checking-online="flow.isCheckingOnline"
        :online-target-button-class="flow.onlineTargetButtonClass"
        :show-admin-tab="flow.showAdminTab"
        :active-tab="flow.activeTab"
        @back="flow.handleGoBack()"
        @close="emit('close')"
        @refresh="flow.refreshLibrary()"
        @register="flow.isRegisterModalOpen = true"
        @local-target="flow.onLocalTargetClick()"
        @online-target="flow.onOnlineTargetClick()"
        @switch-tab="flow.switchTab($event)"
      />

      <LibraryModalContent
        :is-online-setup-pending="flow.isOnlineSetupPending"
        :library-api-url="flow.libraryApiUrl"
        :upload-error="flow.uploadError"
        :error-message="flow.errorMessage"
        :active-tab="flow.activeTab"
        :browse-step="flow.browseStep"
        :flat-section-options="flow.flatSectionOptions"
        :flat-sections="flow.flatSections"
        :selected-section-id="flow.selectedSectionId"
        :is-sections-edit-mode="flow.isSectionsEditMode"
        :is-admin="flow.isAdmin"
        :can-manage-subscriptions="flow.canManageSubscriptions"
        :personal-admin-section-options="flow.personalAdminSectionOptions"
        :diagrams="flow.diagrams"
        :all-tags="flow.allTags"
        :is-loading="flow.isLoading"
        :search-query="flow.searchQuery"
        :tag-filter="flow.tagFilter"
        :min-rating-filter="flow.minRatingFilter"
        :min-votes-filter="flow.minVotesFilter"
        :sort-by-filter="flow.sortByFilter"
        :selected-diagram="flow.selectedDiagram"
        :edit-title="flow.editTitle"
        :edit-description="flow.editDescription"
        :edit-tags="flow.editTags"
        :edit-section-id="flow.editSectionId"
        :edit-visibility="flow.editVisibility"
        :edit-language="flow.editLanguage"
        :edit-content-locale="flow.editContentLocale"
        :is-editing="flow.isEditing"
        :is-saving="flow.isSaving"
        :upload-title="flow.uploadTitle"
        :upload-description="flow.uploadDescription"
        :upload-tags="flow.uploadTags"
        :upload-section-id="flow.uploadSectionId"
        :upload-visibility="flow.uploadVisibility"
        :upload-file="flow.uploadFile"
        :max-size-kb="flow.maxSizeKb"
        :is-uploading="flow.isUploading"
        :transfer-sections="flow.transferSections"
        :transfer-diagrams="flow.transferDiagrams"
        :server-transfer-sections="flow.serverTransferSections"
        :server-transfer-diagrams="flow.serverTransferDiagrams"
        :can-sync-online="flow.canSyncOnline"
        :import-bundle="flow.importBundle"
        :is-transfer-processing="flow.isTransferProcessing"
        :show-admin-tab="flow.showAdminTab"
        @setup-completed="flow.onSetupCompleted()"
        @all-sections-click="flow.onAllSectionsClick()"
        @section-row-click="flow.onSectionRowClick($event)"
        @toggle-edit-mode="flow.toggleSectionsEditMode()"
        @create-section="flow.createSection($event)"
        @delete-section="flow.onDeleteSection"
        @share-section="flow.onShareSection"
        @manage-access="flow.onManageSectionAccess"
        @ratings-click="flow.onRatingsClick()"
        @subscriptions-click="flow.openSubscriptions()"
        @open-subscription-target="flow.onOpenSubscriptionTarget($event)"
        @diagram-pick="flow.handleDiagramPick($event)"
        @filters-change="flow.searchDiagrams()"
        @save-edit="flow.saveEdit()"
        @cancel-edit="flow.resetEditForm()"
        @start-edit="flow.startEdit()"
        @open-in-editor="flow.openInEditor()"
        @share="flow.onShareDiagram()"
        @preview="flow.onPreviewDiagram()"
        @delete="flow.onDeleteDiagram()"
        @toggle-favorite="flow.onToggleFavorite()"
        @rating-updated="flow.onRatingUpdated($event)"
        @open-versions="flow.isVersionsModalOpen = true"
        @file-change="flow.onFileChange($event)"
        @submit-upload="flow.submitUpload()"
        @export="flow.onExportSelection($event)"
        @import="flow.onImportSelection($event)"
        @load-import-file="flow.onImportFile($event)"
        @push-to-server="flow.onPushToServer($event)"
        @pull-from-server="flow.onPullFromServer($event)"
        @ratings-diagram-pick="flow.handleDiagramPick($event)"
        @ratings-section-pick="flow.onSectionPick($event)"
        @update:search-query="flow.searchQuery = $event"
        @update:tag-filter="flow.tagFilter = $event"
        @update:min-rating-filter="flow.minRatingFilter = $event"
        @update:min-votes-filter="flow.minVotesFilter = $event"
        @update:sort-by-filter="flow.sortByFilter = $event"
        @update:edit-title="flow.editTitle = $event"
        @update:edit-description="flow.editDescription = $event"
        @update:edit-tags="flow.editTags = $event"
        @update:edit-section-id="flow.editSectionId = $event"
        @update:edit-visibility="flow.editVisibility = $event"
        @update:edit-language="flow.editLanguage = $event"
        @update:edit-content-locale="flow.editContentLocale = $event"
        @update:upload-title="flow.uploadTitle = $event"
        @update:upload-description="flow.uploadDescription = $event"
        @update:upload-tags="flow.uploadTags = $event"
        @update:upload-section-id="flow.uploadSectionId = $event"
        @update:upload-visibility="flow.uploadVisibility = $event"
      />
    </div>
  </Teleport>

  <LibraryModalOverlays
    :is-setup-modal-open="flow.isSetupModalOpen"
    :library-api-url="flow.libraryApiUrl"
    :is-section-modal-open="flow.isSectionModalOpen"
    :editing-section="flow.editingSection"
    :section-options-for-modal="flow.sectionOptionsForModal"
    :is-share-modal-open="flow.isShareModalOpen"
    :share-resource="flow.shareResource"
    :is-preview-modal-open="flow.isPreviewModalOpen"
    :preview-title="flow.previewTitle"
    :preview-markup="flow.previewMarkup"
    :is-preview-rendering="flow.isPreviewRendering"
    :preview-error="flow.previewError"
    :watermark="flow.watermark"
    :watermark-label="flow.watermarkLabel()"
    :preview-can-download="flow.previewCanDownload"
    :preview-downloads-remaining="flow.previewDownloadsRemaining"
    :is-preview-downloading="flow.isPreviewDownloading"
    :is-versions-modal-open="flow.isVersionsModalOpen"
    :selected-diagram="flow.selectedDiagram"
    :is-section-access-open="flow.isSectionAccessOpen"
    :section-access-id="flow.sectionAccessId"
    :section-access-title="flow.sectionAccessTitle"
    :is-register-modal-open="flow.isRegisterModalOpen"
    @setup-completed="flow.onSetupCompleted()"
    @setup-close="flow.onSetupClose()"
    @close-section-editor="flow.closeSectionEditor()"
    @save-section-edit="flow.saveSectionEdit($event)"
    @close-share-modal="flow.closeShareModal()"
    @share-created="flow.onShareCreated($event)"
    @close-preview-modal="flow.closePreviewModal()"
    @preview-download="flow.onPreviewDownload()"
    @close-versions-modal="flow.isVersionsModalOpen = false"
    @versions-restored="flow.onVersionsRestored($event)"
    @close-section-access="flow.closeSectionAccess()"
    @close-register-modal="flow.isRegisterModalOpen = false"
    @register-completed="flow.onRegisterCompleted()"
  />
</template>

<style src="./library/library-modal.css"></style>
