<script setup lang="ts">
import { computed, ref } from "vue";
import ActionIcon from "@/components/icons/ActionIcon.vue";
import { useLocale } from "@/composables/useLocale";
import { sanitizeDiagramId } from "@/services/conversion/diagram-ir";
import {
  getDiagramBuilderSchema,
  GRAPH_EDGE_KIND_OPTIONS,
  GRAPH_NODE_KIND_OPTIONS,
  parseRawTextToGrid,
  serializeGridToClipboardTsv,
  transposeMatrixData,
  type DiagramBuilderState,
} from "@/services/diagram-builder";
import { applyTableFromClipboardText } from "@/services/table-paste";
import type { TablePasteErrorInfo } from "@/services/table-paste/types";

const builderState = defineModel<DiagramBuilderState>("builderState", {
  required: true,
});

const props = defineProps<{
  currentSource: string;
}>();

const emit = defineEmits<{
  change: [];
  pasteAppliedSource: [source: string];
  pasteError: [error: TablePasteErrorInfo];
}>();

const { t } = useLocale();

const schema = computed(() =>
  getDiagramBuilderSchema(
    builderState.value.format,
    builderState.value.diagramType,
  ),
);

const isGraphNodesOpen = ref(false);
const copyFeedback = ref(false);

function notifyChange(): void {
  emit("change");
}

function syncGraphNodesFromEdges(): void {
  const nodes = builderState.value.graphNodes;
  const knownKeys = new Set<string>();
  for (const n of nodes) {
    if (n.id.trim()) knownKeys.add(n.id.trim().toLowerCase());
    if (n.label.trim()) knownKeys.add(n.label.trim().toLowerCase());
  }

  for (const edge of builderState.value.graphEdges) {
    for (const endpoint of [edge.source, edge.target]) {
      const trimmed = endpoint.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (knownKeys.has(key)) continue;
      const safeId = sanitizeDiagramId(trimmed || `N${nodes.length + 1}`);
      if (knownKeys.has(safeId.toLowerCase())) continue;
      nodes.push({
        id: safeId,
        label: trimmed,
        kind: "default",
        group: "",
        color: "",
      });
      knownKeys.add(key);
      knownKeys.add(safeId.toLowerCase());
    }
  }
}

function onGraphEdgeEndpointChange(): void {
  syncGraphNodesFromEdges();
  notifyChange();
}

function addFlatRow(): void {
  const colCount = schema.value.columns.length;
  const newRow = schema.value.columns.map((col) => {
    if (col.type === "select" && col.options && col.options.length > 0) {
      return builderState.value.rows.length > 0 && col.id === "kind"
        ? "+"
        : col.options[0].value;
    }
    return "";
  });
  builderState.value.rows.push(
    newRow.length === colCount ? newRow : Array.from({ length: colCount }, () => ""),
  );
  notifyChange();
}

function removeFlatRow(rowIndex: number): void {
  if (builderState.value.rows.length <= 1) return;
  builderState.value.rows.splice(rowIndex, 1);
  notifyChange();
}

function moveFlatRow(rowIndex: number, delta: -1 | 1): void {
  const target = rowIndex + delta;
  if (target < 0 || target >= builderState.value.rows.length) return;
  const rows = builderState.value.rows;
  const [moved] = rows.splice(rowIndex, 1);
  rows.splice(target, 0, moved);
  notifyChange();
}

function addMatrixRow(): void {
  const colCount = builderState.value.matrixHeaders.length;
  const newRow = ["", ...Array.from({ length: colCount }, () => "")];
  builderState.value.matrixRows.push(newRow);
  notifyChange();
}

function removeMatrixRow(rowIndex: number): void {
  if (builderState.value.matrixRows.length <= 1) return;
  builderState.value.matrixRows.splice(rowIndex, 1);
  notifyChange();
}

function moveMatrixRow(rowIndex: number, delta: -1 | 1): void {
  const target = rowIndex + delta;
  if (target < 0 || target >= builderState.value.matrixRows.length) return;
  const rows = builderState.value.matrixRows;
  const [moved] = rows.splice(rowIndex, 1);
  rows.splice(target, 0, moved);
  notifyChange();
}

function addMatrixColumn(): void {
  builderState.value.matrixHeaders.push("");
  for (const row of builderState.value.matrixRows) {
    row.push("");
  }
  notifyChange();
}

function removeMatrixColumn(colIndex: number): void {
  const minCols = builderState.value.diagramType === "radar" ? 3 : 1;
  if (builderState.value.matrixHeaders.length <= minCols) return;
  builderState.value.matrixHeaders.splice(colIndex, 1);
  for (const row of builderState.value.matrixRows) {
    row.splice(colIndex + 1, 1);
  }
  notifyChange();
}

function handleTransposeMatrix(): void {
  const transposed = transposeMatrixData(
    builderState.value.matrixHeaders,
    builderState.value.matrixRows,
  );
  builderState.value.matrixHeaders = transposed.headers;
  builderState.value.matrixRows = transposed.rows;
  notifyChange();
}

function addGraphNode(): void {
  const nextIdx = builderState.value.graphNodes.length + 1;
  builderState.value.graphNodes.push({
    id: `N${nextIdx}`,
    label: "",
    kind: "default",
    group: "",
    color: "",
  });
  notifyChange();
}

function removeGraphNode(index: number): void {
  if (builderState.value.graphNodes.length <= 1) return;
  builderState.value.graphNodes.splice(index, 1);
  notifyChange();
}

function addGraphEdge(): void {
  builderState.value.graphEdges.push({
    source: "",
    target: "",
    kind: "arrow",
    label: "",
  });
  notifyChange();
}

function moveGraphEdge(index: number, delta: -1 | 1): void {
  const target = index + delta;
  if (target < 0 || target >= builderState.value.graphEdges.length) return;
  const edges = builderState.value.graphEdges;
  const [moved] = edges.splice(index, 1);
  edges.splice(target, 0, moved);
  notifyChange();
}

function removeGraphEdge(index: number): void {
  if (builderState.value.graphEdges.length <= 1) return;
  builderState.value.graphEdges.splice(index, 1);
  notifyChange();
}

function buildCopyTsv(): string {
  const mode = schema.value.tableMode;
  if (mode === "rows") {
    const headers = schema.value.columns.map((col) => t(col.labelKey));
    return serializeGridToClipboardTsv(builderState.value.rows, {
      includeHeaders: true,
      headers,
    });
  }

  if (mode === "matrix") {
    const rowHeaderTitle = schema.value.matrixRowHeaderLabelKey
      ? t(schema.value.matrixRowHeaderLabelKey)
      : "Item";
    const headers = [rowHeaderTitle, ...builderState.value.matrixHeaders];
    return serializeGridToClipboardTsv(builderState.value.matrixRows, {
      includeHeaders: true,
      headers,
    });
  }

  const headers = [
    t("builder.col.source"),
    t("builder.col.target"),
    t("builder.col.label"),
    t("builder.col.edgeStyle"),
  ];
  const rows = builderState.value.graphEdges.map((e) => [
    e.source,
    e.target,
    e.label,
    e.kind,
  ]);
  return serializeGridToClipboardTsv(rows, {
    includeHeaders: true,
    headers,
  });
}

async function handleCopyToClipboard(): Promise<void> {
  const tsv = buildCopyTsv();
  if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
    return;
  }
  await navigator.clipboard.writeText(tsv);
  copyFeedback.value = true;
  setTimeout(() => {
    copyFeedback.value = false;
  }, 1800);
}

function applyRawTextPaste(clipboardText: string): void {
  if (!clipboardText.trim()) return;

  if (schema.value.tableMode === "graph-ir") {
    const grid = parseRawTextToGrid(clipboardText);
    if (!grid) return;
    builderState.value.graphEdges = grid.rows.map((r) => ({
      source: (r[0] ?? "").trim(),
      target: (r[1] ?? "").trim(),
      label: (r[2] ?? "").trim(),
      kind: (r[3] ?? "arrow").trim() || "arrow",
    }));
    syncGraphNodesFromEdges();
    notifyChange();
    return;
  }

  const pasteResult = applyTableFromClipboardText({
    clipboardText,
    source: props.currentSource,
    format: builderState.value.format,
  });

  if (pasteResult.ok) {
    emit("pasteAppliedSource", pasteResult.fullSource);
    return;
  }

  const grid = parseRawTextToGrid(clipboardText, true);
  if (grid && schema.value.tableMode === "matrix" && grid.colCount >= 2 && grid.rowCount >= 2) {
    builderState.value.matrixHeaders = grid.rows[0]
      .slice(1)
      .map((c, idx) => c.trim() || `Col ${idx + 1}`);
    builderState.value.matrixRows = grid.rows.slice(1).map((r, idx) => [
      (r[0] ?? "").trim() || `Row ${idx + 1}`,
      ...r.slice(1, builderState.value.matrixHeaders.length + 1),
    ]);
    notifyChange();
    return;
  }

  if (grid && schema.value.tableMode === "rows") {
    const colCount = schema.value.columns.length;
    builderState.value.rows = grid.rows.map((r) =>
      Array.from({ length: colCount }, (_, idx) => (r[idx] ?? "").trim()),
    );
    notifyChange();
    return;
  }

  emit("pasteError", pasteResult.error);
}

async function handlePasteFromClipboard(): Promise<void> {
  if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") {
    return;
  }
  try {
    const text = await navigator.clipboard.readText();
    applyRawTextPaste(text);
  } catch {
    // Ignore permission error if user cancelled
  }
}
</script>

<template>
  <div class="builder-step" data-testid="builder-data-table-step">
    <div class="builder-table-toolbar">
      <div class="builder-table-toolbar__group">
        <button
          type="button"
          class="btn builder-btn"
          data-testid="builder-paste-clipboard-btn"
          @click="handlePasteFromClipboard"
        >
          <ActionIcon name="table-paste" />
          <span>{{ t("builder.table.pasteClipboard") }}</span>
        </button>

        <button
          type="button"
          class="btn builder-btn"
          data-testid="builder-copy-clipboard-btn"
          @click="handleCopyToClipboard"
        >
          <ActionIcon :name="copyFeedback ? 'check' : 'clipboard-copy'" />
          <span>
            {{
              copyFeedback
                ? t("builder.table.copied")
                : t("builder.table.copyClipboard")
            }}
          </span>
        </button>
      </div>

      <div class="builder-table-toolbar__group">
        <template v-if="schema.tableMode === 'rows'">
          <button
            type="button"
            class="btn builder-btn"
            data-testid="builder-add-row-btn"
            @click="addFlatRow"
          >
            <ActionIcon name="plus" />
            <span>{{ t("builder.table.addRow") }}</span>
          </button>
        </template>

        <template v-else-if="schema.tableMode === 'matrix'">
          <button
            type="button"
            class="btn builder-btn"
            data-testid="builder-add-row-btn"
            @click="addMatrixRow"
          >
            <ActionIcon name="plus" />
            <span>{{ t("builder.table.addRow") }}</span>
          </button>
          <button
            type="button"
            class="btn builder-btn"
            data-testid="builder-add-col-btn"
            @click="addMatrixColumn"
          >
            <ActionIcon name="plus" />
            <span>{{ t("builder.table.addColumn") }}</span>
          </button>
          <button
            type="button"
            class="btn builder-btn"
            data-testid="builder-transpose-btn"
            @click="handleTransposeMatrix"
          >
            <ActionIcon name="transfer" />
            <span>{{ t("builder.table.transpose") }}</span>
          </button>
        </template>

        <template v-else-if="schema.tableMode === 'graph-ir'">
          <button
            type="button"
            class="btn builder-btn"
            data-testid="builder-add-edge-btn"
            @click="addGraphEdge"
          >
            <ActionIcon name="plus" />
            <span>{{ t("builder.graph.addEdge") }}</span>
          </button>
        </template>
      </div>
    </div>

    <!-- MODE 1: FLAT TYPED ROWS -->
    <div
      v-if="schema.tableMode === 'rows'"
      class="builder-table-scroll"
    >
      <table class="builder-data-table" data-testid="builder-flat-table">
        <thead>
          <tr>
            <th class="builder-data-table__idx">#</th>
            <th
              v-for="col in schema.columns"
              :key="col.id"
              :class="{ 'builder-data-table__color-col': col.type === 'color' }"
            >
              {{ t(col.labelKey) }}
            </th>
            <th class="builder-data-table__actions" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIndex) in builderState.rows"
            :key="rowIndex"
          >
            <td class="builder-data-table__idx">{{ rowIndex + 1 }}</td>
            <td
              v-for="(col, colIndex) in schema.columns"
              :key="col.id"
              :class="{ 'builder-data-table__color-col': col.type === 'color' }"
            >
              <select
                v-if="col.type === 'select'"
                v-model="row[colIndex]"
                class="select builder-cell-input"
                @change="notifyChange"
              >
                <option
                  v-for="opt in col.options"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ t(opt.labelKey) }}
                </option>
              </select>

              <div
                v-else-if="col.type === 'color'"
                class="builder-color-cell"
              >
                <input
                  type="color"
                  class="builder-color-picker"
                  :value="row[colIndex] && /^#[0-9a-fA-F]{6}$/.test(row[colIndex]) ? row[colIndex] : '#0969da'"
                  :title="row[colIndex] || t('builder.option.auto')"
                  @input="
                    row[colIndex] = ($event.target as HTMLInputElement).value;
                    notifyChange();
                  "
                >
                <button
                  v-if="row[colIndex]"
                  type="button"
                  class="builder-icon-mini"
                  :title="t('builder.option.reset')"
                  @click="
                    row[colIndex] = '';
                    notifyChange();
                  "
                >
                  ×
                </button>
              </div>

              <input
                v-else-if="col.type === 'date'"
                v-model="row[colIndex]"
                type="date"
                class="builder-cell-input"
                @input="notifyChange"
              >

              <input
                v-else-if="col.type === 'number'"
                v-model="row[colIndex]"
                type="number"
                :step="col.step ?? 'any'"
                :min="col.min"
                :max="col.max"
                :placeholder="t(col.labelKey)"
                class="builder-cell-input builder-cell-input--num"
                :disabled="builderState.diagramType === 'waterfall' && row[1] === '=subtotal'"
                @input="notifyChange"
              >

              <input
                v-else
                v-model="row[colIndex]"
                type="text"
                :placeholder="t(col.labelKey)"
                class="builder-cell-input"
                @input="notifyChange"
              >
            </td>
            <td class="builder-data-table__actions">
              <div class="builder-row-actions">
                <button
                  type="button"
                  class="builder-icon-mini"
                  :disabled="rowIndex === 0"
                  :title="t('builder.table.moveUp')"
                  @click="moveFlatRow(rowIndex, -1)"
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="builder-icon-mini"
                  :disabled="rowIndex === builderState.rows.length - 1"
                  :title="t('builder.table.moveDown')"
                  @click="moveFlatRow(rowIndex, 1)"
                >
                  ↓
                </button>
                <button
                  type="button"
                  class="builder-icon-mini builder-icon-mini--danger"
                  :disabled="builderState.rows.length <= 1"
                  :title="t('builder.table.removeRow')"
                  @click="removeFlatRow(rowIndex)"
                >
                  ×
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODE 2: 2D MATRIX -->
    <div
      v-else-if="schema.tableMode === 'matrix'"
      class="builder-table-scroll"
    >
      <table class="builder-data-table" data-testid="builder-matrix-table">
        <thead>
          <tr>
            <th class="builder-data-table__idx">#</th>
            <th>
              {{
                schema.matrixRowHeaderLabelKey
                  ? t(schema.matrixRowHeaderLabelKey)
                  : t("builder.col.category")
              }}
            </th>
            <th
              v-for="(_, colIdx) in builderState.matrixHeaders"
              :key="colIdx"
            >
              <div class="builder-matrix-col-header">
                <input
                  v-model="builderState.matrixHeaders[colIdx]"
                  type="text"
                  :placeholder="`${schema.matrixColHeaderPrefix ?? 'Col'} ${colIdx + 1}`"
                  class="builder-cell-input builder-cell-input--header"
                  @input="notifyChange"
                >
                <button
                  type="button"
                  class="builder-icon-mini builder-icon-mini--danger"
                  :disabled="builderState.matrixHeaders.length <= (builderState.diagramType === 'radar' ? 3 : 1)"
                  :title="t('builder.table.removeColumn')"
                  @click="removeMatrixColumn(colIdx)"
                >
                  ×
                </button>
              </div>
            </th>
            <th class="builder-data-table__actions" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIdx) in builderState.matrixRows"
            :key="rowIdx"
          >
            <td class="builder-data-table__idx">{{ rowIdx + 1 }}</td>
            <td>
              <input
                v-model="row[0]"
                type="text"
                :placeholder="
                  schema.matrixRowHeaderLabelKey
                    ? t(schema.matrixRowHeaderLabelKey)
                    : t('builder.col.category')
                "
                class="builder-cell-input"
                @input="notifyChange"
              >
            </td>
            <td
              v-for="(_, colIdx) in builderState.matrixHeaders"
              :key="colIdx"
            >
              <input
                v-model="row[colIdx + 1]"
                :type="builderState.diagramType === 'wireframe' ? 'text' : 'number'"
                step="any"
                class="builder-cell-input builder-cell-input--num"
                placeholder="—"
                @input="notifyChange"
              >
            </td>
            <td class="builder-data-table__actions">
              <div class="builder-row-actions">
                <button
                  type="button"
                  class="builder-icon-mini"
                  :disabled="rowIdx === 0"
                  :title="t('builder.table.moveUp')"
                  @click="moveMatrixRow(rowIdx, -1)"
                >
                  ↑
                </button>
                <button
                  type="button"
                  class="builder-icon-mini"
                  :disabled="rowIdx === builderState.matrixRows.length - 1"
                  :title="t('builder.table.moveDown')"
                  @click="moveMatrixRow(rowIdx, 1)"
                >
                  ↓
                </button>
                <button
                  type="button"
                  class="builder-icon-mini builder-icon-mini--danger"
                  :disabled="builderState.matrixRows.length <= 1"
                  :title="t('builder.table.removeRow')"
                  @click="removeMatrixRow(rowIdx)"
                >
                  ×
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- MODE 3: GRAPH EDGES FIRST + COLLAPSIBLE NODES & GROUPS -->
    <template v-else-if="schema.tableMode === 'graph-ir'">
      <datalist id="builder-graph-node-datalist">
        <option
          v-for="node in builderState.graphNodes"
          :key="node.id"
          :value="node.label || node.id"
        />
      </datalist>

      <div class="builder-table-scroll">
        <table
          class="builder-data-table"
          data-testid="builder-graph-edges-table"
        >
          <thead>
            <tr>
              <th class="builder-data-table__idx">#</th>
              <th>{{ t("builder.col.source") }}</th>
              <th>{{ t("builder.col.target") }}</th>
              <th>{{ t("builder.col.label") }}</th>
              <th>{{ t("builder.col.edgeStyle") }}</th>
              <th class="builder-data-table__actions" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(edge, idx) in builderState.graphEdges"
              :key="idx"
            >
              <td class="builder-data-table__idx">{{ idx + 1 }}</td>
              <td>
                <input
                  v-model="edge.source"
                  type="text"
                  list="builder-graph-node-datalist"
                  :placeholder="t('builder.col.source')"
                  class="builder-cell-input"
                  @input="onGraphEdgeEndpointChange"
                >
              </td>
              <td>
                <input
                  v-model="edge.target"
                  type="text"
                  list="builder-graph-node-datalist"
                  :placeholder="t('builder.col.target')"
                  class="builder-cell-input"
                  @input="onGraphEdgeEndpointChange"
                >
              </td>
              <td>
                <input
                  v-model="edge.label"
                  type="text"
                  :placeholder="t('builder.col.label')"
                  class="builder-cell-input"
                  @input="notifyChange"
                >
              </td>
              <td>
                <select
                  v-model="edge.kind"
                  class="select builder-cell-input"
                  @change="notifyChange"
                >
                  <option
                    v-for="opt in GRAPH_EDGE_KIND_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ t(opt.labelKey) }}
                  </option>
                </select>
              </td>
              <td class="builder-data-table__actions">
                <div class="builder-row-actions">
                  <button
                    type="button"
                    class="builder-icon-mini"
                    :disabled="idx === 0"
                    :title="t('builder.table.moveUp')"
                    @click="moveGraphEdge(idx, -1)"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class="builder-icon-mini"
                    :disabled="idx === builderState.graphEdges.length - 1"
                    :title="t('builder.table.moveDown')"
                    @click="moveGraphEdge(idx, 1)"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    class="builder-icon-mini builder-icon-mini--danger"
                    :disabled="builderState.graphEdges.length <= 1"
                    @click="removeGraphEdge(idx)"
                  >
                    ×
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- COLLAPSIBLE NODES & GROUPS SECTION -->
      <section class="builder-card builder-card--collapsible">
        <div class="builder-card__header-row">
          <button
            type="button"
            class="builder-card__toggle"
            :aria-expanded="isGraphNodesOpen"
            data-testid="builder-graph-nodes-toggle"
            @click="isGraphNodesOpen = !isGraphNodesOpen"
          >
            <span class="builder-card__title">
              {{ t("builder.graph.nodesSection", { count: builderState.graphNodes.length }) }}
            </span>
            <span class="builder-card__chevron" aria-hidden="true">
              {{ isGraphNodesOpen ? "▾" : "▸" }}
            </span>
          </button>

          <button
            v-if="isGraphNodesOpen"
            type="button"
            class="btn builder-btn"
            data-testid="builder-add-node-btn"
            @click="addGraphNode"
          >
            <ActionIcon name="plus" />
            <span>{{ t("builder.graph.addNode") }}</span>
          </button>
        </div>

        <div
          v-if="isGraphNodesOpen"
          class="builder-table-scroll"
        >
          <table
            class="builder-data-table"
            data-testid="builder-graph-nodes-table"
          >
            <thead>
              <tr>
                <th class="builder-data-table__idx">#</th>
                <th>{{ t("builder.col.id") }}</th>
                <th>{{ t("builder.col.label") }}</th>
                <th>{{ t("builder.col.nodeType") }}</th>
                <th>{{ t("builder.col.group") }}</th>
                <th class="builder-data-table__color-col">{{ t("builder.col.color") }}</th>
                <th class="builder-data-table__actions" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(node, idx) in builderState.graphNodes"
                :key="idx"
              >
                <td class="builder-data-table__idx">{{ idx + 1 }}</td>
                <td>
                  <input
                    v-model="node.id"
                    type="text"
                    class="builder-cell-input"
                    @input="notifyChange"
                  >
                </td>
                <td>
                  <input
                    v-model="node.label"
                    type="text"
                    :placeholder="t('builder.col.label')"
                    class="builder-cell-input"
                    @input="notifyChange"
                  >
                </td>
                <td>
                  <select
                    v-model="node.kind"
                    class="select builder-cell-input"
                    @change="notifyChange"
                  >
                    <option
                      v-for="opt in GRAPH_NODE_KIND_OPTIONS"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ t(opt.labelKey) }}
                    </option>
                  </select>
                </td>
                <td>
                  <input
                    v-model="node.group"
                    type="text"
                    :placeholder="t('builder.col.group')"
                    class="builder-cell-input"
                    @input="notifyChange"
                  >
                </td>
                <td class="builder-data-table__color-col">
                  <div class="builder-color-cell">
                    <input
                      type="color"
                      class="builder-color-picker"
                      :value="node.color && /^#[0-9a-fA-F]{6}$/.test(node.color) ? node.color : '#0969da'"
                      :title="node.color || t('builder.option.auto')"
                      @input="
                        node.color = ($event.target as HTMLInputElement).value;
                        notifyChange();
                      "
                    >
                    <button
                      v-if="node.color"
                      type="button"
                      class="builder-icon-mini"
                      :title="t('builder.option.reset')"
                      @click="
                        node.color = '';
                        notifyChange();
                      "
                    >
                      ×
                    </button>
                  </div>
                </td>
                <td class="builder-data-table__actions">
                  <button
                    type="button"
                    class="builder-icon-mini builder-icon-mini--danger"
                    :disabled="builderState.graphNodes.length <= 1"
                    @click="removeGraphNode(idx)"
                  >
                    ×
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
