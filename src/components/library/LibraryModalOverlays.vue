<script setup lang="ts">
import SectionEditModal from "@/components/SectionEditModal.vue";
import LibraryRegisterModal from "@/components/library/LibraryRegisterModal.vue";
import LibrarySetupAdminModal from "@/components/library/LibrarySetupAdminModal.vue";
import LibraryDiagramVersionsModal from "@/components/library/LibraryDiagramVersionsModal.vue";
import LibraryDiagramPreviewModal from "@/components/library/LibraryDiagramPreviewModal.vue";
import LibraryShareLinkModal from "@/components/library/LibraryShareLinkModal.vue";
import LibrarySectionAccessModal from "@/components/library/LibrarySectionAccessModal.vue";
import type { DiagramDto } from "@/constants/diagram-library";
import type { ShareResourceRef } from "@/composables/library/useLibraryShareFlow";

type SectionOption = {
  id: string;
  title: string;
  depth: number;
  parentId: string | null;
};

defineProps<{
  isSetupModalOpen: boolean;
  libraryApiUrl: string;
  isSectionModalOpen: boolean;
  editingSection: SectionOption | null;
  sectionOptionsForModal: SectionOption[];
  isShareModalOpen: boolean;
  shareResource: ShareResourceRef | null;
  isPreviewModalOpen: boolean;
  previewTitle: string;
  previewMarkup: string;
  isPreviewRendering: boolean;
  previewError: string;
  watermark: boolean;
  watermarkLabel: string;
  previewCanDownload: boolean;
  previewDownloadsRemaining: number | null;
  isPreviewDownloading: boolean;
  isVersionsModalOpen: boolean;
  selectedDiagram: DiagramDto | null;
  isSectionAccessOpen: boolean;
  sectionAccessId: string | null;
  sectionAccessTitle: string;
  isRegisterModalOpen: boolean;
}>();

const emit = defineEmits<{
  setupCompleted: [];
  setupClose: [];
  closeSectionEditor: [];
  saveSectionEdit: [payload: { title: string; parentId: string | null }];
  closeShareModal: [];
  shareCreated: [url: string];
  closePreviewModal: [];
  previewDownload: [];
  closeVersionsModal: [];
  versionsRestored: [diagram: DiagramDto];
  closeSectionAccess: [];
  closeRegisterModal: [];
  registerCompleted: [];
}>();
</script>

<template>
  <LibrarySetupAdminModal
    :open="isSetupModalOpen"
    :api-url="libraryApiUrl"
    @completed="emit('setupCompleted')"
    @close="emit('setupClose')"
  />

  <SectionEditModal
    :open="isSectionModalOpen"
    :section="editingSection"
    :section-options="sectionOptionsForModal"
    @close="emit('closeSectionEditor')"
    @save="emit('saveSectionEdit', $event)"
  />

  <LibraryShareLinkModal
    v-if="shareResource"
    :open="isShareModalOpen"
    :resource-type="shareResource.type"
    :resource-id="shareResource.id"
    :resource-title="shareResource.title"
    @close="emit('closeShareModal')"
    @created="emit('shareCreated', $event)"
  />

  <LibraryDiagramPreviewModal
    :open="isPreviewModalOpen"
    :title="previewTitle"
    :preview-markup="previewMarkup"
    :is-rendering="isPreviewRendering"
    :error="previewError"
    :watermarked="watermark"
    :watermark-label="watermarkLabel"
    :can-download="previewCanDownload"
    :downloads-remaining="previewDownloadsRemaining"
    :is-downloading="isPreviewDownloading"
    @close="emit('closePreviewModal')"
    @download="emit('previewDownload')"
  />

  <LibraryDiagramVersionsModal
    :open="isVersionsModalOpen"
    :diagram="selectedDiagram"
    :api-url="libraryApiUrl"
    @close="emit('closeVersionsModal')"
    @restored="emit('versionsRestored', $event)"
  />

  <LibrarySectionAccessModal
    :open="isSectionAccessOpen"
    :section-id="sectionAccessId"
    :section-title="sectionAccessTitle"
    @close="emit('closeSectionAccess')"
  />

  <LibraryRegisterModal
    :open="isRegisterModalOpen"
    :api-url="libraryApiUrl"
    @close="emit('closeRegisterModal')"
    @registered="emit('registerCompleted')"
  />
</template>
