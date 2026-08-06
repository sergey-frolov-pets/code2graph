<script setup lang="ts">
import ActionIcon from "@/components/icons/ActionIcon.vue";
import IconButton from "@/components/IconButton.vue";
import { useLocale } from "@/composables/useLocale";
import type { SectionDto } from "@/constants/diagram-library";
import type { FlatSectionOption } from "@/shared/library/section-tree";

const props = defineProps<{
  flatSectionOptions: FlatSectionOption[];
  flatSections: SectionDto[];
  selectedSectionId: string | null;
  isOnline: boolean;
  isSectionsEditMode: boolean;
  canCreateSharedSection: boolean;
}>();

const emit = defineEmits<{
  "all-sections-click": [];
  "section-row-click": [sectionId: string];
  "toggle-edit-mode": [];
  "create-section": [parentId: string | null];
  "delete-section": [sectionId: string, title: string];
  "share-section": [sectionId: string, title: string];
  "manage-access": [sectionId: string, title: string];
}>();

const { t } = useLocale();

function canAdminSection(sectionId: string): boolean {
  const section = props.flatSections.find((entry) => entry.id === sectionId);
  return Boolean(section?.canAdmin);
}
</script>

<template>
  <div class="library-step">
    <div class="library-step__toolbar">
      <span class="status-pill" :class="isOnline ? 'is-ready' : 'is-error'">
        {{ isOnline ? t("app.online") : t("app.offline") }}
      </span>
      <div class="library-step__toolbar-actions">
        <IconButton
          :label="t('library.edit')"
          :pressed="isSectionsEditMode"
          @click="emit('toggle-edit-mode')"
        >
          <ActionIcon name="edit" />
        </IconButton>
        <IconButton
          v-if="isSectionsEditMode && canCreateSharedSection"
          :label="t('library.addSection')"
          @click="emit('create-section', null)"
        >
          <ActionIcon name="plus" />
        </IconButton>
      </div>
    </div>

    <div class="library-step__content">
      <button
        class="library-row"
        :class="{ 'is-active': selectedSectionId === null }"
        type="button"
        @click="emit('all-sections-click')"
      >
        <span class="library-row__title">{{ t("library.allSections") }}</span>
        <span class="library-row__chevron">›</span>
      </button>

      <div
        v-for="section in flatSectionOptions"
        :key="section.id"
        class="library-section-row"
      >
        <button
          class="library-row"
          :class="{ 'is-active': selectedSectionId === section.id }"
          type="button"
          :style="{ paddingLeft: `${16 + section.depth * 16}px` }"
          @click="emit('section-row-click', section.id)"
        >
          <span class="library-row__title">{{ section.title }}</span>
          <span v-if="!isSectionsEditMode" class="library-row__chevron">›</span>
        </button>
        <div
          v-if="!isSectionsEditMode"
          class="library-section-row__actions library-section-row__actions--inline"
        >
          <IconButton
            :label="t('library.shareLink')"
            @click.stop="emit('share-section', section.id, section.title)"
          >
            <ActionIcon name="export" />
          </IconButton>
          <IconButton
            v-if="canAdminSection(section.id)"
            :label="t('library.sectionAccess')"
            @click.stop="emit('manage-access', section.id, section.title)"
          >
            <ActionIcon name="edit" />
          </IconButton>
        </div>
        <div v-if="isSectionsEditMode" class="library-section-row__actions">
          <IconButton
            :label="t('library.shareLink')"
            @click.stop="emit('share-section', section.id, section.title)"
          >
            <ActionIcon name="export" />
          </IconButton>
          <IconButton
            v-if="canAdminSection(section.id)"
            :label="t('library.sectionAccess')"
            @click.stop="emit('manage-access', section.id, section.title)"
          >
            <ActionIcon name="edit" />
          </IconButton>
          <IconButton
            v-if="canAdminSection(section.id)"
            :label="t('library.addSubsection')"
            @click.stop="emit('create-section', section.id)"
          >
            <ActionIcon name="plus" />
          </IconButton>
          <IconButton
            v-if="canAdminSection(section.id)"
            :label="t('app.delete')"
            @click.stop="emit('delete-section', section.id, section.title)"
          >
            <ActionIcon name="trash" />
          </IconButton>
        </div>
      </div>
    </div>
  </div>
</template>
