<script setup lang="ts">
import { computed, ref, watch } from "vue";
import AppModal from "@/components/AppModal.vue";
import {
  SECTION_ACCESS_PERMISSIONS,
  SUBSCRIPTION_DISTRIBUTION_MODES,
  type DiagramListItemDto,
  type SectionAccessPermission,
  type SubscriptionDistributionMode,
  type SubscriptionDto,
} from "@/constants/diagram-library";
import type { FlatSectionOption } from "@/shared/library/section-tree";
import { useLocale } from "@/composables/useLocale";
import {
  createSubscription,
  updateSubscription,
} from "@/services/library/api/subscriptions";
import { fetchDiagrams } from "@/services/library/api/diagrams";

export interface SectionSelectionState {
  selected: boolean;
  includeDescendants: boolean;
}

const props = defineProps<{
  open: boolean;
  subscription: SubscriptionDto | null;
  flatSectionOptions: FlatSectionOption[];
  libraryApiUrl: string;
}>();

const emit = defineEmits<{
  close: [];
  saved: [subscription: SubscriptionDto];
}>();

const { t } = useLocale();
const titleInput = ref("");
const descriptionInput = ref("");
const permissionInput = ref<SectionAccessPermission>("view");
const distributionModeInput = ref<SubscriptionDistributionMode>("users");
const sectionStates = ref<Record<string, SectionSelectionState>>({});
const selectedDiagramIds = ref<string[]>([]);
const diagramOptions = ref<DiagramListItemDto[]>([]);
const isSaving = ref(false);
const isLoadingDiagrams = ref(false);
const errorMessage = ref("");

const isEditMode = computed(() => Boolean(props.subscription));

const selectedSectionCount = computed(
  () => Object.values(sectionStates.value).filter((entry) => entry.selected).length,
);

const selectedTargetCount = computed(
  () => selectedSectionCount.value + selectedDiagramIds.value.length,
);

async function loadDiagramOptions(): Promise<void> {
  isLoadingDiagrams.value = true;
  try {
    const collected = new Map<string, DiagramListItemDto>();
    for (const section of props.flatSectionOptions) {
      const response = await fetchDiagrams(
        { sectionId: section.id },
        props.libraryApiUrl,
      );
      for (const diagram of response.diagrams) {
        collected.set(diagram.id, diagram);
      }
    }
    diagramOptions.value = [...collected.values()].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  } catch {
    diagramOptions.value = [];
  } finally {
    isLoadingDiagrams.value = false;
  }
}

function resetForm(): void {
  titleInput.value = props.subscription?.title ?? "";
  descriptionInput.value = props.subscription?.description ?? "";
  permissionInput.value = props.subscription?.permission ?? "view";
  distributionModeInput.value = props.subscription?.distributionMode ?? "users";

  const next: Record<string, SectionSelectionState> = {};
  for (const section of props.flatSectionOptions) {
    const existing = props.subscription?.sections.find(
      (entry) => entry.sectionId === section.id,
    );
    next[section.id] = {
      selected: Boolean(existing),
      includeDescendants: existing?.includeDescendants ?? false,
    };
  }
  sectionStates.value = next;
  selectedDiagramIds.value =
    props.subscription?.diagrams.map((entry) => entry.diagramId) ?? [];
  errorMessage.value = "";
}

function toggleSection(sectionId: string): void {
  const current = sectionStates.value[sectionId] ?? {
    selected: false,
    includeDescendants: false,
  };
  sectionStates.value = {
    ...sectionStates.value,
    [sectionId]: {
      ...current,
      selected: !current.selected,
      includeDescendants: !current.selected ? current.includeDescendants : false,
    },
  };
}

function toggleDescendants(sectionId: string): void {
  const current = sectionStates.value[sectionId];
  if (!current?.selected) {
    return;
  }
  sectionStates.value = {
    ...sectionStates.value,
    [sectionId]: {
      ...current,
      includeDescendants: !current.includeDescendants,
    },
  };
}

function toggleDiagram(diagramId: string): void {
  if (selectedDiagramIds.value.includes(diagramId)) {
    selectedDiagramIds.value = selectedDiagramIds.value.filter(
      (entry) => entry !== diagramId,
    );
    return;
  }
  selectedDiagramIds.value = [...selectedDiagramIds.value, diagramId];
}

function buildSectionsPayload() {
  return Object.entries(sectionStates.value)
    .filter(([, state]) => state.selected)
    .map(([sectionId, state]) => ({
      sectionId,
      includeDescendants: state.includeDescendants,
    }));
}

function buildDiagramsPayload() {
  return selectedDiagramIds.value.map((diagramId) => ({ diagramId }));
}

async function onSave(): Promise<void> {
  const title = titleInput.value.trim();
  if (!title) {
    errorMessage.value = t("library.subscriptionTitleRequired");
    return;
  }

  const sections = buildSectionsPayload();
  const diagrams = buildDiagramsPayload();
  if (sections.length === 0 && diagrams.length === 0) {
    errorMessage.value = t("library.subscriptionTargetsRequired");
    return;
  }

  isSaving.value = true;
  errorMessage.value = "";
  try {
    const payload = {
      title,
      description: descriptionInput.value,
      permission: permissionInput.value,
      distributionMode: distributionModeInput.value,
      sections,
      diagrams,
    };

    if (props.subscription) {
      const response = await updateSubscription(
        props.subscription.id,
        payload,
        props.libraryApiUrl,
      );
      emit("saved", response.subscription);
    } else {
      const response = await createSubscription(payload, props.libraryApiUrl);
      emit("saved", response.subscription);
    }
    emit("close");
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : t("library.subscriptionSaveError");
  } finally {
    isSaving.value = false;
  }
}

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      resetForm();
      void loadDiagramOptions();
    }
  },
);
</script>

<template>
  <AppModal
    :open="open"
    :title="
      isEditMode
        ? t('library.subscriptionEditTitle', { title: subscription?.title ?? '' })
        : t('library.subscriptionAddTitle')
    "
    layer="above-library"
    @close="emit('close')"
  >
    <p class="settings-field__hint">{{ t("library.subscriptionFormHint") }}</p>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.subscriptionName") }}</span>
      <input v-model="titleInput" class="select" type="text" />
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.description") }}</span>
      <textarea v-model="descriptionInput" class="textarea" rows="3" />
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.accessPermission") }}</span>
      <select v-model="permissionInput" class="select">
        <option
          v-for="permission in SECTION_ACCESS_PERMISSIONS"
          :key="permission"
          :value="permission"
        >
          {{ t(`library.accessPermission.${permission}`) }}
        </option>
      </select>
      <span class="settings-field__hint">
        {{ t(`library.accessPermission.${permissionInput}Desc`) }}
      </span>
      <span class="settings-field__hint">{{ t("library.subscriptionPermissionMergeHint") }}</span>
    </label>

    <label class="settings-field">
      <span class="settings-field__label">{{ t("library.subscriptionDistributionMode") }}</span>
      <select v-model="distributionModeInput" class="select">
        <option
          v-for="mode in SUBSCRIPTION_DISTRIBUTION_MODES"
          :key="mode"
          :value="mode"
        >
          {{ t(`library.subscriptionDistributionMode.${mode}`) }}
        </option>
      </select>
      <span class="settings-field__hint">
        {{ t(`library.subscriptionDistributionMode.${distributionModeInput}Desc`) }}
      </span>
    </label>

    <div class="settings-field">
      <span class="settings-field__label">
        {{ t("library.subscriptionSections") }}
        ({{ selectedSectionCount }})
      </span>
      <ul class="subscription-section-list">
        <li
          v-for="section in flatSectionOptions"
          :key="section.id"
          class="subscription-section-list__item"
          :style="{ paddingLeft: `${8 + section.depth * 16}px` }"
        >
          <label class="subscription-section-list__row">
            <input
              type="checkbox"
              :checked="sectionStates[section.id]?.selected"
              @change="toggleSection(section.id)"
            />
            <span>{{ section.title }}</span>
          </label>
          <label
            v-if="sectionStates[section.id]?.selected"
            class="subscription-section-list__nested"
          >
            <input
              type="checkbox"
              :checked="sectionStates[section.id]?.includeDescendants"
              @change="toggleDescendants(section.id)"
            />
            <span>{{ t("library.subscriptionIncludeDescendants") }}</span>
          </label>
        </li>
      </ul>
    </div>

    <div class="settings-field">
      <span class="settings-field__label">
        {{ t("library.subscriptionDiagrams") }}
        ({{ selectedDiagramIds.length }})
      </span>
      <p v-if="isLoadingDiagrams" class="settings-field__hint">{{ t("app.loading") }}</p>
      <p v-else-if="diagramOptions.length === 0" class="settings-field__hint">
        {{ t("library.subscriptionDiagramsEmpty") }}
      </p>
      <ul v-else class="subscription-section-list">
        <li
          v-for="diagram in diagramOptions"
          :key="diagram.id"
          class="subscription-section-list__item"
        >
          <label class="subscription-section-list__row">
            <input
              type="checkbox"
              :checked="selectedDiagramIds.includes(diagram.id)"
              @change="toggleDiagram(diagram.id)"
            />
            <span>{{ diagram.title }}</span>
          </label>
        </li>
      </ul>
      <span class="settings-field__hint">
        {{ t("library.subscriptionTargetsHint", { count: selectedTargetCount }) }}
      </span>
    </div>

    <button
      class="btn btn-primary"
      type="button"
      :disabled="isSaving"
      @click="onSave()"
    >
      {{ isSaving ? t("app.loading") : t("library.saveChanges") }}
    </button>

    <p v-if="errorMessage" class="settings-field__error">{{ errorMessage }}</p>
  </AppModal>
</template>

<style scoped>
.subscription-section-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
}

.subscription-section-list__item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #eee);
}

.subscription-section-list__item:last-child {
  border-bottom: none;
}

.subscription-section-list__row,
.subscription-section-list__nested {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
}

.subscription-section-list__nested {
  margin-top: 6px;
  margin-left: 24px;
  color: var(--text-muted, #666);
  font-size: 0.85rem;
}
</style>
