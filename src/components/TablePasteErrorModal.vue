<script setup lang="ts">
import { computed } from "vue";
import AppModal from "@/components/AppModal.vue";
import { useLocale } from "@/composables/useLocale";
import type { TablePasteErrorInfo } from "@/services/table-paste";

const props = defineProps<{
  open: boolean;
  error: TablePasteErrorInfo | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { t } = useLocale();

const reasonText = computed(() => {
  if (!props.error) {
    return "";
  }
  return t(props.error.reasonKey, props.error.reasonParams);
});

const diagramTypeTitle = computed(() => {
  if (!props.error) {
    return "";
  }
  return t(props.error.expected.titleKey);
});

const expectedSectionTitle = computed(() =>
  t("tablePaste.expectedLabel", { type: diagramTypeTitle.value }),
);

const columnsText = computed(() => {
  if (!props.error) {
    return "";
  }
  return t(props.error.expected.columnsKey);
});

const rulesText = computed(() => {
  if (!props.error) {
    return "";
  }
  return t(props.error.expected.rulesKey);
});

const sampleHeaders = computed(() => {
  if (!props.error) {
    return [];
  }
  return t(props.error.expected.sampleHeadersKey)
    .split("|")
    .map((h) => h.trim());
});

const sampleRows = computed(() => props.error?.expected.sampleRows ?? []);
</script>

<template>
  <AppModal
    :open="open"
    :title="t('tablePaste.modalTitle')"
    variant="error"
    test-id="table-paste-error-modal"
    @close="emit('close')"
  >
    <div v-if="error" class="table-paste-modal">
      <div class="table-paste-reason" data-testid="table-paste-error-reason">
        <strong class="table-paste-section-label">
          {{ t("tablePaste.reasonLabel") }}
        </strong>
        <p class="table-paste-reason__text">{{ reasonText }}</p>
      </div>

      <div class="table-paste-expected" data-testid="table-paste-expected-hint">
        <h3 class="table-paste-expected__title">{{ expectedSectionTitle }}</h3>

        <div class="table-paste-detail">
          <span class="table-paste-detail__label">{{ t("tablePaste.columnsLabel") }}</span>
          <span>{{ columnsText }}</span>
        </div>

        <div class="table-paste-detail">
          <span class="table-paste-detail__label">{{ t("tablePaste.rulesLabel") }}</span>
          <span>{{ rulesText }}</span>
        </div>

        <div class="table-paste-sample">
          <div class="table-paste-sample__caption">
            {{ t("tablePaste.sampleLabel") }}
          </div>
          <div class="table-paste-sample__scroll">
            <table class="table-paste-sample__table">
              <thead v-if="sampleHeaders.length > 0">
                <tr>
                  <th v-for="(header, idx) in sampleHeaders" :key="idx">
                    {{ header }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rowIdx) in sampleRows" :key="rowIdx">
                  <td
                    v-for="(cell, cellIdx) in row"
                    :key="cellIdx"
                    :class="{ 'is-empty-cell': cell === '' }"
                  >
                    {{ cell === "" ? "—" : cell }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="btn btn-primary"
        type="button"
        data-testid="table-paste-modal-close"
        @click="emit('close')"
      >
        {{ t("app.close") }}
      </button>
    </template>
  </AppModal>
</template>

<style scoped>
.table-paste-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
  font-size: 0.92rem;
  line-height: 1.5;
}

.table-paste-section-label {
  display: block;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--danger);
  margin-bottom: 4px;
}

.table-paste-reason {
  padding: 10px 12px;
  border-radius: 8px;
  border-left: 3px solid var(--danger);
  background: var(--surface-muted);
}

.table-paste-reason__text {
  margin: 0;
  color: var(--text);
}

.table-paste-expected {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
}

.table-paste-expected__title {
  margin: 0 0 2px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.table-paste-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.table-paste-detail__label {
  font-weight: 600;
  font-size: 0.84rem;
  color: var(--text-muted);
}

.table-paste-sample {
  margin-top: 4px;
}

.table-paste-sample__caption {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.table-paste-sample__scroll {
  overflow-x: auto;
}

.table-paste-sample__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.table-paste-sample__table th,
.table-paste-sample__table td {
  padding: 6px 10px;
  border: 1px solid var(--border);
  text-align: left;
}

.table-paste-sample__table th {
  background: var(--surface-muted);
  font-weight: 600;
}

.table-paste-sample__table td.is-empty-cell {
  color: var(--text-muted);
  font-style: italic;
}
</style>
