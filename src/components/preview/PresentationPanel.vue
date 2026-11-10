<script setup lang="ts">
import { computed, inject } from "vue";
import { presentationSessionKey } from "@/components/preview/presentation-session";
import { durationMsToSeconds } from "@/services/presentation/model";
import {
  PRESENTATION_ARROW_DIRECTIONS,
  PRESENTATION_ARROW_FORMS,
  PRESENTATION_ARROW_HEADS,
  PRESENTATION_ARROW_KINDS,
  PRESENTATION_BUBBLE_SHAPES,
  PRESENTATION_FONTS,
  PRESENTATION_LINE_STYLES,
  PRESENTATION_PATH_KINDS,
  PRESENTATION_TEXT_BACKINGS,
} from "@/services/presentation/types";
import type { LocaleKey, TranslateFn } from "@/locales/types";
import type {
  PresentationArrowDirection,
  PresentationArrowForm,
  PresentationArrowHead,
  PresentationArrowKind,
  PresentationBubbleShape,
  PresentationFont,
  PresentationLineStyle,
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
  mode,
  document: presentation,
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
  exportingGif,
  onExportGif,
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

const showsCornerRadius = computed(() => {
  const overlay = selectedOverlay.value;
  if (!overlay) {
    return false;
  }
  if (overlay.shape === "rect") {
    return true;
  }
  if (overlay.shape !== "text") {
    return false;
  }
  if (overlay.backing === "rectangle") {
    return true;
  }
  return overlay.backing === "bubble" && overlay.bubbleShape === "rectangle";
});

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

function bubbleLabel(shape: PresentationBubbleShape): LocaleKey {
  switch (shape) {
    case "rectangle":
      return "presentation.bubble.rectangle";
    case "oval":
      return "presentation.bubble.oval";
    case "cloud":
      return "presentation.bubble.cloud";
  }
}

function arrowFormLabel(form: PresentationArrowForm): LocaleKey {
  switch (form) {
    case "line":
      return "presentation.arrowForm.line";
    case "shape":
      return "presentation.arrowForm.shape";
    case "pointer":
      return "presentation.arrowForm.pointer";
  }
}

function directionLabel(direction: PresentationArrowDirection): LocaleKey {
  switch (direction) {
    case "right":
      return "presentation.direction.right";
    case "left":
      return "presentation.direction.left";
    case "down":
      return "presentation.direction.down";
    case "up":
      return "presentation.direction.up";
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

const COLOR_PICKER_FALLBACK = "#0f6cbd";
const FILL_PICKER_FALLBACK = "#ffffff";
const TEXT_COLOR_PICKER_FALLBACK = "#1a1f24";

function fontLabel(font: PresentationFont): LocaleKey {
  switch (font) {
    case "sans":
      return "presentation.font.sans";
    case "serif":
      return "presentation.font.serif";
    case "mono":
      return "presentation.font.mono";
  }
}

function lineLabel(line: PresentationLineStyle): LocaleKey {
  switch (line) {
    case "solid":
      return "presentation.line.solid";
    case "dashed":
      return "presentation.line.dashed";
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
    :class="{ 'is-editing': mode === 'edit' && canEdit }"
    role="toolbar"
    :aria-label="t('presentation.expand')"
  >
    <div class="presentation-dock__bar">
      <button
        v-if="canEdit"
        type="button"
        class="btn"
        :class="{ 'btn-primary': mode === 'edit' }"
        @click="mode = mode === 'edit' ? 'view' : 'edit'"
      >
        {{ mode === "edit" ? t("presentation.view") : t("presentation.edit") }}
      </button>
      <button
        type="button"
        class="btn"
        :disabled="!canStep"
        :aria-label="t('presentation.prev')"
        @click="step(-1)"
      >
        {{ t("presentation.prev") }}
      </button>
      <span
        v-if="track && track.viewpoints.length"
        class="presentation-dock__index"
      >
        {{ trackLabel(viewpointIndex) }} / {{ track.viewpoints.length }}
      </span>
      <button
        type="button"
        class="btn"
        :disabled="!canStep"
        :aria-label="t('presentation.next')"
        @click="step(1)"
      >
        {{ t("presentation.next") }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!track || track.viewpoints.length === 0"
        @click="togglePlay()"
      >
        {{ playing ? t("presentation.pause") : t("presentation.play") }}
      </button>
      <button
        type="button"
        class="btn"
        :disabled="!track || track.viewpoints.length === 0 || exportingGif"
        @click="onExportGif()"
      >
        {{ exportingGif ? t("presentation.exportGifBusy") : t("presentation.exportGif") }}
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

    <div
      v-if="mode === 'edit' && canEdit"
      class="presentation-dock__body"
    >
      <section class="presentation-section">
        <div class="presentation-dock__row">
          <label class="presentation-field presentation-field--grow">
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
            type="button"
            class="btn"
            @click="onCreateTrack(t('presentation.trackDefault', { n: (presentation?.tracks.length ?? 0) + 1 }))"
          >
            {{ t("presentation.trackNew") }}
          </button>
          <button
            type="button"
            class="btn"
            :disabled="!track"
            @click="onDeleteTrack()"
          >
            {{ t("presentation.trackDelete") }}
          </button>
        </div>
        <label
          v-if="track"
          class="presentation-field"
        >
          <span>{{ t("presentation.trackRename") }}</span>
          <input
            :value="track.name"
            type="text"
            @change="onRenameTrack(($event.target as HTMLInputElement).value)"
          >
        </label>
      </section>

      <p
        v-if="!track || track.viewpoints.length === 0"
        class="presentation-empty"
      >
        {{ t("presentation.empty") }}
      </p>

      <template v-if="track">
        <section class="presentation-section">
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
        </section>

        <section
          v-if="viewpoint"
          class="presentation-section"
        >
          <div class="presentation-dock__row">
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
        </section>

        <section
          v-if="selectedOverlay"
          class="presentation-section"
        >
          <h3 class="presentation-section__title">
            {{ t("presentation.style") }}
          </h3>
          <label
            v-if="selectedOverlay.shape === 'text'"
            class="presentation-field"
          >
            <span>{{ t("presentation.text") }}</span>
            <input
              :value="selectedOverlay.text"
              type="text"
              @change="onChangeOverlay(selectedOverlay.id, { text: ($event.target as HTMLInputElement).value })"
            >
          </label>
          <div class="presentation-dock__row">
            <label class="presentation-field">
              <span>{{ t("presentation.stroke") }}</span>
              <input
                type="color"
                :value="selectedOverlay.stroke || COLOR_PICKER_FALLBACK"
                @change="onChangeOverlay(selectedOverlay.id, { stroke: ($event.target as HTMLInputElement).value })"
              >
            </label>
            <label
              v-if="selectedOverlay.shape !== 'arrow'"
              class="presentation-field"
            >
              <span>{{ t("presentation.fill") }}</span>
              <input
                type="color"
                :value="selectedOverlay.fill || FILL_PICKER_FALLBACK"
                @change="onChangeOverlay(selectedOverlay.id, { fill: ($event.target as HTMLInputElement).value })"
              >
            </label>
            <label
              v-if="selectedOverlay.shape === 'text'"
              class="presentation-field"
            >
              <span>{{ t("presentation.textColor") }}</span>
              <input
                type="color"
                :value="selectedOverlay.textColor || TEXT_COLOR_PICKER_FALLBACK"
                @change="onChangeOverlay(selectedOverlay.id, { textColor: ($event.target as HTMLInputElement).value })"
              >
            </label>
            <button
              type="button"
              class="btn"
              @click="onChangeOverlay(selectedOverlay.id, { stroke: '', fill: '', textColor: '' })"
            >
              {{ t("presentation.styleReset") }}
            </button>
          </div>
          <div class="presentation-dock__row">
            <label
              v-if="selectedOverlay.shape === 'text'"
              class="presentation-field"
            >
              <span>{{ t("presentation.font") }}</span>
              <select
                :value="selectedOverlay.font"
                @change="onChangeOverlay(selectedOverlay.id, { font: ($event.target as HTMLSelectElement).value as typeof PRESENTATION_FONTS[number] })"
              >
                <option
                  v-for="font in PRESENTATION_FONTS"
                  :key="font"
                  :value="font"
                >
                  {{ t(fontLabel(font)) }}
                </option>
              </select>
            </label>
            <label
              v-if="selectedOverlay.shape === 'text'"
              class="presentation-field"
            >
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
            <label
              v-if="selectedOverlay.shape === 'text' && selectedOverlay.backing === 'bubble'"
              class="presentation-field"
            >
              <span>{{ t("presentation.bubbleShape") }}</span>
              <select
                :value="selectedOverlay.bubbleShape"
                @change="onChangeOverlay(selectedOverlay.id, { bubbleShape: ($event.target as HTMLSelectElement).value as typeof PRESENTATION_BUBBLE_SHAPES[number] })"
              >
                <option
                  v-for="shape in PRESENTATION_BUBBLE_SHAPES"
                  :key="shape"
                  :value="shape"
                >
                  {{ t(bubbleLabel(shape)) }}
                </option>
              </select>
            </label>
            <label
              v-if="showsCornerRadius"
              class="presentation-field"
            >
              <span>{{ t("presentation.cornerRadius") }}</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                :value="selectedOverlay.cornerRadius"
                @input="onChangeOverlay(selectedOverlay.id, { cornerRadius: Number(($event.target as HTMLInputElement).value) })"
              >
            </label>
            <label class="presentation-field">
              <span>{{ t("presentation.line") }}</span>
              <select
                :value="selectedOverlay.line"
                @change="onChangeOverlay(selectedOverlay.id, { line: ($event.target as HTMLSelectElement).value as typeof PRESENTATION_LINE_STYLES[number] })"
              >
                <option
                  v-for="line in PRESENTATION_LINE_STYLES"
                  :key="line"
                  :value="line"
                >
                  {{ t(lineLabel(line)) }}
                </option>
              </select>
            </label>
            <label
              v-if="selectedOverlay.shape === 'arrow'"
              class="presentation-field"
            >
              <span>{{ t("presentation.arrowForm") }}</span>
              <select
                :value="selectedOverlay.arrowForm"
                @change="onChangeOverlay(selectedOverlay.id, { arrowForm: ($event.target as HTMLSelectElement).value as typeof PRESENTATION_ARROW_FORMS[number] })"
              >
                <option
                  v-for="form in PRESENTATION_ARROW_FORMS"
                  :key="form"
                  :value="form"
                >
                  {{ t(arrowFormLabel(form)) }}
                </option>
              </select>
            </label>
            <label
              v-if="selectedOverlay.shape === 'arrow' && selectedOverlay.arrowForm !== 'line'"
              class="presentation-field"
            >
              <span>{{ t("presentation.arrowDirection") }}</span>
              <select
                :value="selectedOverlay.arrowDirection"
                @change="onChangeOverlay(selectedOverlay.id, { arrowDirection: ($event.target as HTMLSelectElement).value as typeof PRESENTATION_ARROW_DIRECTIONS[number] })"
              >
                <option
                  v-for="direction in PRESENTATION_ARROW_DIRECTIONS"
                  :key="direction"
                  :value="direction"
                >
                  {{ t(directionLabel(direction)) }}
                </option>
              </select>
            </label>
            <label
              v-if="selectedOverlay.shape === 'arrow' && selectedOverlay.arrowForm === 'line'"
              class="presentation-field"
            >
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
            <label
              v-if="selectedOverlay.shape === 'arrow' && selectedOverlay.arrowForm === 'line'"
              class="presentation-field"
            >
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
            <button
              type="button"
              class="btn"
              @click="onRemoveOverlay(selectedOverlay.id)"
            >
              {{ t("presentation.deleteOverlay") }}
            </button>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.presentation-dock {
  position: absolute;
  left: 50%;
  bottom: 8px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: max-content;
  max-width: calc(100% - 16px);
  max-height: 70%;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--text) 16%, transparent);
  transform: translateX(-50%);
}

.presentation-dock.is-editing {
  width: min(420px, calc(100% - 16px));
  border-radius: 16px;
}

.presentation-dock__bar,
.presentation-dock__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.presentation-dock__body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
  padding: 4px 4px 2px;
}

.presentation-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
}

.presentation-section__title {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 650;
  color: var(--text-muted);
}

.presentation-dock__index {
  min-width: 3.2rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  text-align: center;
}

.presentation-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.presentation-field--grow {
  flex: 1;
}

.presentation-field input,
.presentation-field select {
  min-height: 32px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  padding: 4px 8px;
}

.presentation-field input[type="color"] {
  width: 44px;
  min-height: 32px;
  padding: 2px;
}

.presentation-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 0.8rem;
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
