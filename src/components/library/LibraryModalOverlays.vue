<script setup lang="ts">
import SectionEditModal from "@/components/SectionEditModal.vue";
import LibraryMoveDiagramModal from "@/components/library/LibraryMoveDiagramModal.vue";
import LibraryRegisterModal from "@/components/library/LibraryRegisterModal.vue";
import DiagramVersionsDialog from "@/components/editor/DiagramVersionsDialog.vue";
import LibraryDiagramPreviewModal from "@/components/library/LibraryDiagramPreviewModal.vue";
import LibraryShareLinkModal from "@/components/library/LibraryShareLinkModal.vue";
import LibrarySectionAccessModal from "@/components/library/LibrarySectionAccessModal.vue";
import type { DiagramDto } from "@/constants/diagram-library";
import type { FlatSectionOption } from "@/shared/library/section-tree";
import type { ShareResourceRef } from "@/composables/library/useLibraryShareFlow";
import type { MoveDiagramRequest } from "@/utils/library-move-targets";

type SectionOption = {
  id: string;
  title: string;
  depth: number;
  parentId: string | null;
};

defineProps<{
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
  moveDiagramTarget: MoveDiagramRequest | null;
  moveDiagramSectionTitle: string;
  moveSectionOptions: FlatSectionOption[];
  isMovingDiagram: boolean;
}>();

const emit = defineEmits<{
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
  closeMoveDiagram: [];
  saveMoveDiagram: [sectionId: string | null];
}>();
</script>

<template>
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

  <DiagramVersionsDialog
    source="server"
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

  <LibraryMoveDiagramModal
    :open="moveDiagramTarget !== null"
    :diagram-title="moveDiagramTarget?.title ?? ''"
    :current-section-id="moveDiagramTarget?.sectionId ?? null"
    :current-section-title="moveDiagramSectionTitle"
    :sections="moveSectionOptions"
    :is-saving="isMovingDiagram"
    @close="emit('closeMoveDiagram')"
    @save="emit('saveMoveDiagram', $event)"
  />

  <LibraryRegisterModal
    :open="isRegisterModalOpen"
    :api-url="libraryApiUrl"
    @close="emit('closeRegisterModal')"
    @registered="emit('registerCompleted')"
  />
</template>
