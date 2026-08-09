<script setup lang="ts">
import LibraryTransferTab from "@/components/LibraryTransferTab.vue";
import LibrarySubscriptionsPanel from "@/components/library/LibrarySubscriptionsPanel.vue";
import LibraryBrowseRatings from "@/components/library/LibraryBrowseRatings.vue";
import LibraryBrowseSections from "@/components/library/LibraryBrowseSections.vue";
import LibraryBrowseDiagrams from "@/components/library/LibraryBrowseDiagrams.vue";
import LibraryDiagramDetail from "@/components/library/LibraryDiagramDetail.vue";
import LibraryAdminUsersPanel from "@/components/library/LibraryAdminUsersPanel.vue";
import LibrarySetupAdminPanel from "@/components/library/LibrarySetupAdminPanel.vue";
import LibraryUploadForm from "@/components/library/LibraryUploadForm.vue";
import type { BrowseStep, LibraryTab } from "@/composables/library/useLibraryBrowseFlow";
import type {
  DiagramDto,
  DiagramLanguage,
  DiagramListItemDto,
  DiagramSortOption,
  DiagramVisibility,
  LibraryExportBundle,
  SectionDto,
} from "@/constants/diagram-library";
import type { FlatSectionOption } from "@/shared/library/section-tree";
import { RATINGS_SECTION_ID } from "@/constants/diagram-library";

defineProps<{
  isOnlineSetupPending: boolean;
  libraryApiUrl: string;
  uploadError: string;
  errorMessage: string;
  activeTab: LibraryTab;
  browseStep: BrowseStep;
  flatSectionOptions: FlatSectionOption[];
  flatSections: SectionDto[];
  selectedSectionId: string | null;
  isSectionsEditMode: boolean;
  isAdmin: boolean;
  canManageSubscriptions: boolean;
  personalAdminSectionOptions: FlatSectionOption[];
  diagrams: DiagramListItemDto[];
  allTags: string[];
  isLoading: boolean;
  searchQuery: string;
  tagFilter: string;
  minRatingFilter: number;
  minVotesFilter: number;
  sortByFilter: DiagramSortOption;
  selectedDiagram: DiagramDto | null;
  editTitle: string;
  editDescription: string;
  editTags: string;
  editSectionId: string;
  editVisibility: DiagramVisibility;
  editLanguage: DiagramLanguage;
  editContentLocale: string;
  isEditing: boolean;
  isSaving: boolean;
  uploadTitle: string;
  uploadDescription: string;
  uploadTags: string;
  uploadSectionId: string;
  uploadVisibility: DiagramVisibility;
  uploadFile: File | null;
  maxSizeKb: number;
  isUploading: boolean;
  transferSections: SectionDto[];
  transferDiagrams: DiagramDto[];
  serverTransferSections: SectionDto[];
  serverTransferDiagrams: DiagramDto[];
  canSyncOnline: boolean;
  importBundle: LibraryExportBundle | null;
  isTransferProcessing: boolean;
  showAdminTab: boolean;
}>();

const emit = defineEmits<{
  "setup-completed": [];
  "all-sections-click": [];
  "section-row-click": [sectionId: string];
  "toggle-edit-mode": [];
  "create-section": [parentId: string | null];
  "delete-section": [sectionId: string, title: string];
  "share-section": [sectionId: string, title: string];
  "manage-access": [sectionId: string, title: string];
  "ratings-click": [];
  "subscriptions-click": [];
  "diagram-pick": [diagramId: string];
  "filters-change": [];
  "save-edit": [];
  "cancel-edit": [];
  "start-edit": [];
  "open-in-editor": [];
  share: [];
  preview: [];
  delete: [];
  "toggle-favorite": [];
  "rating-updated": [diagram: DiagramDto];
  "open-versions": [];
  "file-change": [event: Event];
  "submit-upload": [];
  export: [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  import: [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  "load-import-file": [file: File];
  "push-to-server": [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  "pull-from-server": [payload: { sectionIds: Set<string>; diagramIds: Set<string> }];
  "ratings-diagram-pick": [diagramId: string];
  "ratings-section-pick": [sectionId: string];
  "update:search-query": [value: string];
  "update:tag-filter": [value: string];
  "update:min-rating-filter": [value: number];
  "update:min-votes-filter": [value: number];
  "update:sort-by-filter": [value: DiagramSortOption];
  "update:edit-title": [value: string];
  "update:edit-description": [value: string];
  "update:edit-tags": [value: string];
  "update:edit-section-id": [value: string];
  "update:edit-visibility": [value: DiagramVisibility];
  "update:edit-language": [value: DiagramLanguage];
  "update:edit-content-locale": [value: string];
  "update:upload-title": [value: string];
  "update:upload-description": [value: string];
  "update:upload-tags": [value: string];
  "update:upload-section-id": [value: string];
  "update:upload-visibility": [value: DiagramVisibility];
}>();
</script>

<template>
  <div class="library-body">
    <p v-if="uploadError" class="library-error">{{ uploadError }}</p>
    <p v-if="errorMessage" class="library-error">{{ errorMessage }}</p>

    <LibrarySetupAdminPanel
      v-if="isOnlineSetupPending"
      :api-url="libraryApiUrl"
      @completed="emit('setup-completed')"
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
        @all-sections-click="emit('all-sections-click')"
        @section-row-click="emit('section-row-click', $event)"
        @toggle-edit-mode="emit('toggle-edit-mode')"
        @create-section="emit('create-section', $event)"
        @delete-section="(id, title) => emit('delete-section', id, title)"
        @share-section="(id, title) => emit('share-section', id, title)"
        @manage-access="(id, title) => emit('manage-access', id, title)"
        @ratings-click="emit('ratings-click')"
        @subscriptions-click="emit('subscriptions-click')"
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
        @diagram-pick="emit('ratings-diagram-pick', $event)"
        @section-pick="emit('ratings-section-pick', $event)"
      />

      <LibraryBrowseDiagrams
        v-else-if="activeTab === 'browse' && browseStep === 'diagrams'"
        :search-query="searchQuery"
        :tag-filter="tagFilter"
        :min-rating-filter="minRatingFilter"
        :min-votes-filter="minVotesFilter"
        :sort-by-filter="sortByFilter"
        :diagrams="diagrams"
        :all-tags="allTags"
        :is-loading="isLoading"
        @update:search-query="emit('update:search-query', $event)"
        @update:tag-filter="emit('update:tag-filter', $event)"
        @update:min-rating-filter="emit('update:min-rating-filter', $event)"
        @update:min-votes-filter="emit('update:min-votes-filter', $event)"
        @update:sort-by-filter="emit('update:sort-by-filter', $event)"
        @diagram-pick="emit('diagram-pick', $event)"
        @filters-change="emit('filters-change')"
      />

      <LibraryDiagramDetail
        v-else-if="activeTab === 'browse' && browseStep === 'detail' && selectedDiagram"
        :edit-title="editTitle"
        :edit-description="editDescription"
        :edit-tags="editTags"
        :edit-section-id="editSectionId"
        :edit-visibility="editVisibility"
        :edit-language="editLanguage"
        :edit-content-locale="editContentLocale"
        :diagram="selectedDiagram"
        :flat-section-options="flatSectionOptions"
        :is-editing="isEditing"
        :is-saving="isSaving"
        :library-api-url="libraryApiUrl"
        @update:edit-title="emit('update:edit-title', $event)"
        @update:edit-description="emit('update:edit-description', $event)"
        @update:edit-tags="emit('update:edit-tags', $event)"
        @update:edit-section-id="emit('update:edit-section-id', $event)"
        @update:edit-visibility="emit('update:edit-visibility', $event)"
        @update:edit-language="emit('update:edit-language', $event)"
        @update:edit-content-locale="emit('update:edit-content-locale', $event)"
        @save="emit('save-edit')"
        @cancel="emit('cancel-edit')"
        @start-edit="emit('start-edit')"
        @open-in-editor="emit('open-in-editor')"
        @share="emit('share')"
        @preview="emit('preview')"
        @delete="emit('delete')"
        @toggle-favorite="emit('toggle-favorite')"
        @rating-updated="emit('rating-updated', $event)"
        @open-versions="emit('open-versions')"
      />

      <LibraryUploadForm
        v-else-if="activeTab === 'upload'"
        :upload-title="uploadTitle"
        :upload-description="uploadDescription"
        :upload-tags="uploadTags"
        :upload-section-id="uploadSectionId"
        :upload-visibility="uploadVisibility"
        :flat-section-options="flatSectionOptions"
        :upload-file="uploadFile"
        :max-size-kb="maxSizeKb"
        :is-uploading="isUploading"
        @update:upload-title="emit('update:upload-title', $event)"
        @update:upload-description="emit('update:upload-description', $event)"
        @update:upload-tags="emit('update:upload-tags', $event)"
        @update:upload-section-id="emit('update:upload-section-id', $event)"
        @update:upload-visibility="emit('update:upload-visibility', $event)"
        @file-change="emit('file-change', $event)"
        @submit="emit('submit-upload')"
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
          @export="emit('export', $event)"
          @import="emit('import', $event)"
          @load-import-file="emit('load-import-file', $event)"
          @push-to-server="emit('push-to-server', $event)"
          @pull-from-server="emit('pull-from-server', $event)"
        />
      </div>

      <LibraryAdminUsersPanel
        v-else-if="activeTab === 'admin' && showAdminTab"
        embedded
      />
    </template>
  </div>
</template>
