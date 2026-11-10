<script setup lang="ts">
import { computed, inject } from "vue";
import IconButton from "@/components/IconButton.vue";
import PresentationGlyph from "@/components/preview/PresentationGlyph.vue";
import { presentationSessionKey } from "@/components/preview/presentation-session";
import { durationMsToSeconds } from "@/services/presentation/model";
import { stepRotation } from "@/services/presentation/overlay-geometry";
import {
  PRESENTATION_ARROW_FORMS,
  PRESENTATION_MARKS,
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
  PresentationArrowForm,
  PresentationMark,
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
  panelOpen,
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
  repeat,
} = session;
const { playing, viewpointIndex, togglePlay, step, pause, goToViewpoint } = session.playback;

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

function goToFirst(): void {
  pause();
  goToViewpoint(0);
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

function markLabel(mark: PresentationMark): LocaleKey {
  switch (mark) {
    case "warning":
      return "presentation.mark.warning";
    case "stop":
      return "presentation.mark.stop";
    case "flag-red":
      return "presentation.mark.flagRed";
    case "flag-green":
      return "presentation.mark.flagGreen";
    case "check":
      return "presentation.mark.check";
    case "cross":
      return "presentation.mark.cross";
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
    v-if="enabled && panelOpen"
    class="presentation-dock"
    :class="{ 'is-editing': mode === 'edit' && canEdit }"
    role="toolbar"
    :aria-label="t('presentation.expand')"
  >
    <div class="presentation-dock__bar">
      <div class="presentation-dock__title">
        <IconButton
          v-if="canEdit"
          :label="mode === 'edit' ? t('presentation.view') : t('presentation.edit')"
          :pressed="mode === 'edit'"
          @click="mode = mode === 'edit' ? 'view' : 'edit'"
        >
          <PresentationGlyph :name="mode === 'edit' ? 'view' : 'edit'" />
        </IconButton>
        <input
          v-if="mode === 'edit' && canEdit && track"
          class="presentation-dock__rename"
          :value="track.name"
          type="text"
          :aria-label="t('presentation.trackRename')"
          @change="onRenameTrack(($event.target as HTMLInputElement).value)"
        >
        <span
          v-else-if="track"
          class="presentation-dock__name"
        >
          {{ track.name }}
        </span>
        <IconButton
          :label="exportingGif ? t('presentation.exportGifBusy') : t('presentation.exportGif')"
          :disabled="!track || track.viewpoints.length === 0 || exportingGif"
          @click="onExportGif()"
        >
          <PresentationGlyph
            :name="exportingGif ? 'loader' : 'gif'"
            :spin="exportingGif"
          />
        </IconButton>
      </div>
      <label
        v-if="track"
        class="presentation-check"
      >
        <input
          type="checkbox"
          :checked="repeat"
          @change="repeat = ($event.target as HTMLInputElement).checked"
        >
        {{ t("presentation.repeat") }}
      </label>
      <div class="presentation-dock__transport">
        <IconButton
          :label="t('presentation.first')"
          :disabled="!track || track.viewpoints.length === 0"
          @click="goToFirst()"
        >
          <PresentationGlyph name="first" />
        </IconButton>
        <IconButton
          :label="t('presentation.prev')"
          :disabled="!canStep"
          @click="step(-1)"
        >
          <PresentationGlyph name="prev" />
        </IconButton>
        <span
          v-if="track && track.viewpoints.length"
          class="presentation-dock__index"
        >
          {{ trackLabel(viewpointIndex) }} / {{ track.viewpoints.length }}
        </span>
        <IconButton
          :label="t('presentation.next')"
          :disabled="!canStep"
          @click="step(1)"
        >
          <PresentationGlyph name="next" />
        </IconButton>
        <IconButton
          :label="playing ? t('presentation.pause') : t('presentation.play')"
          primary
          :disabled="!track || track.viewpoints.length === 0"
          @click="togglePlay()"
        >
          <PresentationGlyph :name="playing ? 'pause' : 'play'" />
        </IconButton>
        <IconButton
          :label="t('presentation.overlaysShow')"
          :pressed="presentation?.showOverlays !== false"
          @click="onToggleOverlays(presentation?.showOverlays === false)"
        >
          <PresentationGlyph :name="presentation?.showOverlays === false ? 'eye-off' : 'eye'" />
        </IconButton>
      </div>
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
          <IconButton
            :label="t('presentation.trackNew')"
            @click="onCreateTrack(t('presentation.trackDefault', { n: (presentation?.tracks.length ?? 0) + 1 }))"
          >
            <PresentationGlyph name="plus" />
          </IconButton>
          <IconButton
            :label="t('presentation.trackDelete')"
            :disabled="!track"
            @click="onDeleteTrack()"
          >
            <PresentationGlyph name="trash" />
          </IconButton>
        </div>
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
            <IconButton
              :label="t('presentation.capture')"
              primary
              @click="onCapture()"
            >
              <PresentationGlyph name="camera" />
            </IconButton>
            <IconButton
              :label="t('presentation.updateFrame')"
              :disabled="!viewpoint"
              @click="onUpdateFrame()"
            >
              <PresentationGlyph name="refresh" />
            </IconButton>
            <IconButton
              :label="t('presentation.removeViewpoint')"
              :disabled="!viewpoint"
              @click="onRemoveViewpoint()"
            >
              <PresentationGlyph name="trash" />
            </IconButton>
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
            <IconButton
              v-if="transition && transition.path === 'polyline'"
              :label="t('presentation.addPoint')"
              :pressed="addPointArmed"
              @click="addPointArmed = !addPointArmed"
            >
              <PresentationGlyph name="plus" />
            </IconButton>
            <IconButton
              v-if="transition && transition.path === 'polyline' && transition.points.length"
              :label="t('presentation.removePoint')"
              @click="onRemovePoint(transition.points.length - 1)"
            >
              <PresentationGlyph name="minus" />
            </IconButton>
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
            <IconButton
              :label="t('presentation.overlay.rect')"
              @click="onAddOverlay('rect')"
            >
              <PresentationGlyph name="rect" />
            </IconButton>
            <IconButton
              :label="t('presentation.overlay.ellipse')"
              @click="onAddOverlay('ellipse')"
            >
              <PresentationGlyph name="ellipse" />
            </IconButton>
            <IconButton
              :label="t('presentation.overlay.text')"
              @click="onAddOverlay('text')"
            >
              <PresentationGlyph name="text" />
            </IconButton>
            <IconButton
              :label="t('presentation.overlay.arrow')"
              @click="onAddOverlay('arrow')"
            >
              <PresentationGlyph name="arrow" />
            </IconButton>
            <IconButton
              v-for="mark in PRESENTATION_MARKS"
              :key="mark"
              :label="t(markLabel(mark))"
              @click="onAddOverlay('mark', mark)"
            >
              <PresentationGlyph :name="mark" />
            </IconButton>
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
            <IconButton
              :label="t('presentation.styleReset')"
              @click="onChangeOverlay(selectedOverlay.id, { stroke: '', fill: '', textColor: '' })"
            >
              <PresentationGlyph name="palette" />
            </IconButton>
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
            <template v-if="selectedOverlay.shape === 'arrow' && selectedOverlay.arrowForm !== 'line'">
              <IconButton
                :label="t('presentation.rotateLeft')"
                @click="onChangeOverlay(selectedOverlay.id, { rotation: stepRotation(selectedOverlay.rotation, -1) })"
              >
                <PresentationGlyph name="rotate-left" />
              </IconButton>
              <span class="presentation-dock__index">{{ selectedOverlay.rotation }}°</span>
              <IconButton
                :label="t('presentation.rotateRight')"
                @click="onChangeOverlay(selectedOverlay.id, { rotation: stepRotation(selectedOverlay.rotation, 1) })"
              >
                <PresentationGlyph name="rotate-right" />
              </IconButton>
            </template>
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
            <IconButton
              :label="t('presentation.deleteOverlay')"
              @click="onRemoveOverlay(selectedOverlay.id)"
            >
              <PresentationGlyph name="trash" />
            </IconButton>
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
  border-radius: 16px;
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  box-shadow: 0 8px 24px color-mix(in srgb, var(--text) 16%, transparent);
  transform: translateX(-50%);
}

.presentation-dock.is-editing {
  width: min(420px, calc(100% - 16px));
  border-radius: 16px;
}

.presentation-dock__bar,
.presentation-dock__row,
.presentation-dock__title,
.presentation-dock__transport {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.presentation-dock__bar {
  flex-direction: column;
  align-items: stretch;
}

.presentation-dock__title {
  flex-wrap: nowrap;
}

.presentation-dock__name,
.presentation-dock__rename {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--text);
  font-size: 0.85rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.presentation-dock__rename {
  min-height: 32px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-weight: 650;
}

.presentation-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--text-muted);
  font-size: 0.8rem;
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

.presentation-dock :deep(.btn-icon) {
  width: 36px;
  min-width: 36px;
  height: 36px;
  min-height: 36px;
  padding: 0;
}
</style>
