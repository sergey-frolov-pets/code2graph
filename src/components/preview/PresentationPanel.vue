<script setup lang="ts">
import { computed, inject } from "vue";
import { presentationSessionKey } from "@/components/preview/presentation-session";
import { durationMsToSeconds } from "@/services/presentation/model";
import {
  PRESENTATION_ARROW_HEADS,
  PRESENTATION_ARROW_KINDS,
  PRESENTATION_PATH_KINDS,
  PRESENTATION_TEXT_BACKINGS,
} from "@/services/presentation/types";
import type { LocaleKey, TranslateFn } from "@/locales/types";
import type {
  PresentationArrowHead,
  PresentationArrowKind,
  PresentationPathKind,
  PresentationTextBacking,
} from "@/services/presentation/types";

defineProps<{
  t: TranslateFn;
}>();

const session = inject(presentationSessionKey);
if (!session) {
  throw new Error("Presentation panel requires a session");
}

const {
  enabled,
  canEdit,
  open,
  mode,
  document: presentation,
  toggleOpen,
  onSelectTrack,
  onCreateTrack,
  onDeleteTrack,
  onToggleOverlays,
  onRenameTrack,
  onCapture,
  onUpdateFrame,
  onRemoveViewpoint,
  onDwellSeconds,
  onTransitionSeconds,
  onPathKind,
  onRemovePoint,
  onAddOverlay,
  onChangeOverlay,
  onRemoveOverlay,
  selectViewpoint,
  addPointArmed,
  attachTarget,
  selectedOverlayId,
} = session;
const { playing, viewpointIndex, togglePlay, step } = session.playback;

const track = computed(() => session.currentTrack.value);
const viewpoint = computed(
  () => track.value?.viewpoints[session.playback.viewpointIndex.value] ?? null,
);
const transition = computed(
  () => track.value?.transitions[session.playback.viewpointIndex.value] ?? null,
);
const selectedOverlay = computed(
  () => track.value?.overlays.find((item) => item.id === selectedOverlayId.value) ?? null,
);
const canStep = computed(() => (track.value?.viewpoints.length ?? 0) > 1);

function trackLabel(index: number): string {
  return String(index + 1);
}

function pathLabel(kind: PresentationPathKind): LocaleKey {
  switch (kind) {
    case "line":
      return "presentation.path.line";
    case "polyline":
      return "presentation.path.polyline";
    case "quadratic":
      return "presentation.path.quadratic";
    case "cubic":
      return "presentation.path.cubic";
  }
}

function backingLabel(backing: PresentationTextBacking): LocaleKey {
  switch (backing) {
    case "none":
      return "presentation.backing.none";
    case "rectangle":
      return "presentation.backing.rectangle";
    case "bubble":
      return "presentation.backing.bubble";
  }
}

function arrowKindLabel(kind: PresentationArrowKind): LocaleKey {
  switch (kind) {
    case "straight":
      return "presentation.arrow.straight";
    case "elbow":
      return "presentation.arrow.elbow";
    case "curve":
      return "presentation.arrow.curve";
  }
}

function arrowHeadLabel(head: PresentationArrowHead): LocaleKey {
  switch (head) {
    case "none":
      return "presentation.arrowHead.none";
    case "end":
      return "presentation.arrowHead.end";
    case "start":
      return "presentation.arrowHead.start";
    case "both":
      return "presentation.arrowHead.both";
  }
}
</script>

<template>
  <div
    v-if="enabled"
    class="presentation-dock"
  >
    <div class="presentation-dock__bar">
      <button
        type="button"
        class="btn presentation-dock__toggle"
        :aria-expanded="open"
        @click="toggleOpen()"
      >
        {{ open ? t("presentation.collapse") : t("presentation.expand") }}
      </button>
      <button
        type="button"
        class="btn"
        :disabled="!track || track.viewpoints.length === 0"
        @click="togglePlay()"
      >
        {{ playing ? t("presentation.pause") : t("presentation.play") }}
      </button>
      <button
        type="button"
        class="btn"
        :disabled="!canStep"
        @click="step(-1)"
      >
        {{ t("presentation.prev") }}
      </button>
      <button
        type="button"
        class="btn"
        :disabled="!canStep"
        @click="step(1)"
      >
        {{ t("presentation.next") }}
      </button>
      <span
        v-if="track && track.viewpoints.length"
        class="presentation-dock__index"
      >
        {{ trackLabel(viewpointIndex) }} / {{ track.viewpoints.length }}
      </span>
    </div>

    <div
      v-if="open"
      class="presentation-dock__body"
    >
      <div class="presentation-dock__row">
        <label class="presentation-field">
          <span>{{ t("presentation.tracks") }}</span>
          <select
            :value="presentation?.activeTrackId ?? ''"
            @change="onSelectTrack(($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="item in presentation?.tracks ?? []"
              :key="item.id"
              :value="item.id"
            >
              {{ item.name }}
            </option>
          </select>
        </label>
        <button
          v-if="canEdit"
          type="button"
          class="btn"
          @click="onCreateTrack(t('presentation.trackDefault', { n: (presentation?.tracks.length ?? 0) + 1 }))"
        >
          {{ t("presentation.trackNew") }}
        </button>
        <button
          v-if="canEdit && track"
          type="button"
          class="btn"
          @click="onDeleteTrack()"
        >
          {{ t("presentation.trackDelete") }}
        </button>
      </div>

      <div
        v-if="canEdit"
        class="presentation-dock__row"
      >
        <button
          type="button"
          class="btn"
          :class="{ 'btn-primary': mode === 'view' }"
          @click="mode = 'view'"
        >
          {{ t("presentation.view") }}
        </button>
        <button
          type="button"
          class="btn"
          :class="{ 'btn-primary': mode === 'edit' }"
          @click="mode = 'edit'"
        >
          {{ t("presentation.edit") }}
        </button>
        <label class="presentation-check">
          <input
            type="checkbox"
            :checked="presentation?.showOverlays !== false"
            @change="onToggleOverlays(($event.target as HTMLInputElement).checked)"
          >
          {{ t("presentation.overlaysShow") }}
        </label>
      </div>
      <label
        v-else
        class="presentation-check"
      >
        <input
          type="checkbox"
          :checked="presentation?.showOverlays !== false"
          @change="onToggleOverlays(($event.target as HTMLInputElement).checked)"
        >
        {{ t("presentation.overlaysShow") }}
      </label>

      <p
        v-if="!track || track.viewpoints.length === 0"
        class="presentation-empty"
      >
        {{ t("presentation.empty") }}
      </p>

      <template v-if="mode === 'edit' && canEdit && track">
        <label class="presentation-field">
          <span>{{ t("presentation.trackRename") }}</span>
          <input
            :value="track.name"
            type="text"
            @change="onRenameTrack(($event.target as HTMLInputElement).value)"
          >
        </label>

        <div class="presentation-dock__row">
          <button
            type="button"
            class="btn btn-primary"
            @click="onCapture()"
          >
            {{ t("presentation.capture") }}
          </button>
          <button
            type="button"
            class="btn"
            :disabled="!viewpoint"
            @click="onUpdateFrame()"
          >
            {{ t("presentation.updateFrame") }}
          </button>
          <button
            type="button"
            class="btn"
            :disabled="!viewpoint"
            @click="onRemoveViewpoint()"
          >
            {{ t("presentation.removeViewpoint") }}
          </button>
        </div>

        <ol
          v-if="track.viewpoints.length"
          class="presentation-points"
        >
          <li
            v-for="(item, index) in track.viewpoints"
            :key="item.id"
          >
            <button
              type="button"
              class="btn"
              :class="{ 'btn-primary': index === viewpointIndex }"
              @click="selectViewpoint(index)"
            >
              {{ trackLabel(index) }}
            </button>
          </li>
        </ol>

        <div
          v-if="viewpoint"
          class="presentation-dock__row"
        >
          <label class="presentation-field">
            <span>{{ t("presentation.dwell") }}</span>
            <input
              type="number"
              min="0.1"
              max="120"
              step="0.1"
              :value="durationMsToSeconds(viewpoint.dwellMs)"
              @change="onDwellSeconds(Number(($event.target as HTMLInputElement).value))"
            >
          </label>
          <label
            v-if="transition"
            class="presentation-field"
          >
            <span>{{ t("presentation.duration") }}</span>
            <input
              type="number"
              min="0.1"
              max="120"
              step="0.1"
              :value="durationMsToSeconds(transition.durationMs)"
              @change="onTransitionSeconds(Number(($event.target as HTMLInputElement).value))"
            >
          </label>
          <label
            v-if="transition"
            class="presentation-field"
          >
            <span>{{ t("presentation.path") }}</span>
            <select
              :value="transition.path"
              @change="onPathKind(($event.target as HTMLSelectElement).value as typeof PRESENTATION_PATH_KINDS[number])"
            >
              <option
                v-for="kind in PRESENTATION_PATH_KINDS"
                :key="kind"
                :value="kind"
              >
                {{ t(pathLabel(kind)) }}
              </option>
            </select>
          </label>
          <button
            v-if="transition && transition.path === 'polyline'"
            type="button"
            class="btn"
            :class="{ 'btn-primary': addPointArmed }"
            @click="addPointArmed = !addPointArmed"
          >
            {{ t("presentation.addPoint") }}
          </button>
          <button
            v-if="transition && transition.path === 'polyline' && transition.points.length"
            type="button"
            class="btn"
            @click="onRemovePoint(transition.points.length - 1)"
          >
            {{ t("presentation.removePoint") }}
          </button>
        </div>

        <div
          v-if="viewpoint"
          class="presentation-dock__row"
        >
          <label class="presentation-field">
            <span>{{ t("presentation.overlayAttach") }}</span>
            <select v-model="attachTarget">
              <option value="viewpoint">
                {{ t("presentation.attachViewpoint") }}
              </option>
              <option
                value="transition"
                :disabled="!transition"
              >
                {{ t("presentation.attachTransition") }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="btn"
            @click="onAddOverlay('rect')"
          >
            {{ t("presentation.overlay.rect") }}
          </button>
          <button
            type="button"
            class="btn"
            @click="onAddOverlay('ellipse')"
          >
            {{ t("presentation.overlay.ellipse") }}
          </button>
          <button
            type="button"
            class="btn"
            @click="onAddOverlay('text')"
          >
            {{ t("presentation.overlay.text") }}
          </button>
          <button
            type="button"
            class="btn"
            @click="onAddOverlay('arrow')"
          >
            {{ t("presentation.overlay.arrow") }}
          </button>
        </div>

        <div
          v-if="selectedOverlay"
          class="presentation-dock__row"
        >
          <template v-if="selectedOverlay.shape === 'text'">
            <label class="presentation-field presentation-field--grow">
              <span>{{ t("presentation.text") }}</span>
              <input
                :value="selectedOverlay.text"
                type="text"
                @change="onChangeOverlay(selectedOverlay.id, { text: ($event.target as HTMLInputElement).value })"
              >
            </label>
            <label class="presentation-field">
              <span>{{ t("presentation.backing") }}</span>
              <select
                :value="selectedOverlay.backing"
                @change="onChangeOverlay(selectedOverlay.id, { backing: ($event.target as HTMLSelectElement).value as typeof PRESENTATION_TEXT_BACKINGS[number] })"
              >
                <option
                  v-for="backing in PRESENTATION_TEXT_BACKINGS"
                  :key="backing"
                  :value="backing"
                >
                  {{ t(backingLabel(backing)) }}
                </option>
              </select>
            </label>
          </template>
          <template v-if="selectedOverlay.shape === 'arrow'">
            <label class="presentation-field">
              <span>{{ t("presentation.arrowKind") }}</span>
              <select
                :value="selectedOverlay.arrowKind"
                @change="onChangeOverlay(selectedOverlay.id, { arrowKind: ($event.target as HTMLSelectElement).value as typeof PRESENTATION_ARROW_KINDS[number] })"
              >
                <option
                  v-for="kind in PRESENTATION_ARROW_KINDS"
                  :key="kind"
                  :value="kind"
                >
                  {{ t(arrowKindLabel(kind)) }}
                </option>
              </select>
            </label>
            <label class="presentation-field">
              <span>{{ t("presentation.arrowHead") }}</span>
              <select
                :value="selectedOverlay.arrowHead"
                @change="onChangeOverlay(selectedOverlay.id, { arrowHead: ($event.target as HTMLSelectElement).value as typeof PRESENTATION_ARROW_HEADS[number] })"
              >
                <option
                  v-for="head in PRESENTATION_ARROW_HEADS"
                  :key="head"
                  :value="head"
                >
                  {{ t(arrowHeadLabel(head)) }}
                </option>
              </select>
            </label>
          </template>
          <button
            type="button"
            class="btn"
            @click="onRemoveOverlay(selectedOverlay.id)"
          >
            {{ t("presentation.deleteOverlay") }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.presentation-dock {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 46%;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface) 92%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--text) 12%, transparent);
}

.presentation-dock__bar,
.presentation-dock__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.presentation-dock__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: auto;
}

.presentation-dock__toggle {
  margin-right: auto;
}

.presentation-dock__index {
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.presentation-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 120px;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.presentation-field--grow {
  flex: 1;
}

.presentation-field input,
.presentation-field select {
  min-height: 36px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 4px 8px;
}

.presentation-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.presentation-points {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.presentation-empty {
  margin: 0;
  color: var(--text-muted);
}

.presentation-dock .btn {
  min-height: 36px;
  padding: 6px 10px;
}
</style>
