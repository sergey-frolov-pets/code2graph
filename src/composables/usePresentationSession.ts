import { computed, onUnmounted, ref, watch, type Ref } from "vue";
import type { DiagramFormat } from "@/constants/diagram-format-ids";
import { useAppDialog } from "@/composables/useAppDialog";
import { useLocale } from "@/composables/useLocale";
import { usePresentationPlayback } from "@/composables/usePresentationPlayback";
import { localeDirection } from "@/constants/i18n";
import { PRESENTATION_CHROME_REVEAL_MS } from "@/services/presentation/constants";
import { readPresentation, writePresentation } from "@/services/presentation/codec";
import { readFrameHref } from "@/services/presentation/frame";
import { renderPresentationGif, type PresentationGifTheme } from "@/services/presentation/gif-export";
import { presentationGifFileName } from "@/services/presentation/gif-timeline";
import {
  PRESENTATION_HTML_MIME,
  presentationHtmlFileName,
  renderPresentationHtml,
} from "@/services/presentation/html-export";
import {
  activeTrack,
  addEffect,
  addOverlay,
  addTrack,
  captureViewpoint,
  createPresentation,
  deleteTrack,
  duplicateEffect,
  duplicateTrack,
  duplicateViewpoint,
  durationSecondsToMs,
  insertPolylinePoint,
  moveEffect,
  moveViewpoint,
  placeTransitionControl,
  removeEffect,
  removeOverlay,
  removeViewpoint,
  renameTrack,
  selectTrack,
  setShowOverlays,
  setTransitionPath,
  setTransitionPoints,
  updateEffect,
  updateOverlay,
  updateTransitionDuration,
  updateViewpointDwell,
  updateViewpointFrame,
} from "@/services/presentation/model";
import { downloadBlob, downloadTextFile } from "@/services/export/file-download";
import type {
  CameraFrame,
  FrameEffectKind,
  FrameEffectTargetKind,
  NormPoint,
  PresentationDocument,
  PresentationMark,
  PresentationOverlay,
  PresentationOverlayKind,
  PresentationPathKind,
  PresentationTrack,
} from "@/services/presentation/types";
import { resolveLocalizedErrorMessage } from "@/utils/localized-app-error";

export interface PresentationGifContext {
  svg: string;
  frameHref: string | null;
  imageWidth: number;
  imageHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  theme: PresentationGifTheme;
}

export type PresentationMode = "view" | "edit";
export type OverlayAttachTarget = "viewpoint" | "transition";

export function usePresentationSession(options: {
  source: Ref<string | undefined>;
  format: Ref<DiagramFormat | undefined>;
  canEdit: Ref<boolean>;
  readFrame: () => CameraFrame | null;
  setFrame: (frame: CameraFrame) => void;
  setLocked: (locked: boolean) => void;
  onSource: (source: string) => void;
  getGifContext: () => PresentationGifContext | null;
}) {
  const open = ref(false);
  const panelOpen = ref(false);
  const mode = ref<PresentationMode>("view");
  const document = ref<PresentationDocument | null>(null);
  const selectedOverlayId = ref<string | null>(null);
  const addPointArmed = ref(false);
  const attachTarget = ref<OverlayAttachTarget>("viewpoint");
  const chromeRevealed = ref(false);
  const exportingGif = ref(false);
  const exportingHtml = ref(false);
  const repeat = ref(false);
  const { alert } = useAppDialog();
  const { t, locale } = useLocale();
  let suppressParse = false;
  let revealTimer: ReturnType<typeof setTimeout> | undefined;

  const playback = usePresentationPlayback({
    getTrack: () => currentTrack.value,
    setFrame: options.setFrame,
    setLocked: options.setLocked,
    getRepeat: () => repeat.value,
  });

  const enabled = computed(
    () => options.source.value !== undefined && options.format.value !== undefined,
  );

  const currentTrack = computed<PresentationTrack | null>(() =>
    document.value ? activeTrack(document.value) : null,
  );

  const hasFrame = computed(() => readFrameHref(options.source.value ?? "") !== null);

  const headerDimHeld = ref(false);

  const dimChrome = computed(() => enabled.value && playback.playing.value);

  function commit(next: PresentationDocument | null): void {
    const format = options.format.value;
    const source = options.source.value;
    if (format === undefined || source === undefined) {
      return;
    }
    document.value = next;
    const written = writePresentation(source, format, next);
    if (written === source) {
      return;
    }
    suppressParse = true;
    options.onSource(written);
  }

  watch(
    () => options.source.value,
    (value) => {
      if (suppressParse) {
        suppressParse = false;
        return;
      }
      document.value = value ? readPresentation(value) : null;
      playback.viewpointIndex.value = 0;
      playback.phase.value = "dwell";
      selectedOverlayId.value = null;
    },
    { immediate: true },
  );

  watch(mode, (value) => {
    if (value === "edit") {
      playback.pause();
      addPointArmed.value = false;
    }
  });

  watch(
    () => options.canEdit.value,
    (value) => {
      if (!value) {
        mode.value = "view";
      }
    },
  );

  function revealChrome(event: PointerEvent): void {
    if (!dimChrome.value || event.pointerType === "mouse") {
      return;
    }
    chromeRevealed.value = true;
    if (revealTimer) {
      clearTimeout(revealTimer);
    }
    revealTimer = setTimeout(() => {
      chromeRevealed.value = false;
    }, PRESENTATION_CHROME_REVEAL_MS);
  }

  function toggleOpen(): void {
    open.value = !open.value;
  }

  watch(
    () => playback.playing.value,
    (value) => {
      if (!value) {
        headerDimHeld.value = false;
      }
    },
  );

  function holdHeaderDim(): void {
    headerDimHeld.value = true;
  }

  function releaseHeaderDim(): void {
    headerDimHeld.value = false;
  }

  function togglePanel(): void {
    panelOpen.value = !panelOpen.value;
  }

  function onCreateTrack(name: string): void {
    if (!options.canEdit.value) {
      return;
    }
    const current = document.value;
    if (!current) {
      commit(createPresentation(name));
      playback.goToViewpoint(0);
      return;
    }
    commit(addTrack(current, name));
    playback.goToViewpoint(0);
  }

  function onRenameTrack(name: string): void {
    const current = document.value;
    const track = currentTrack.value;
    if (!current || !track || !options.canEdit.value) {
      return;
    }
    commit(renameTrack(current, track.id, name));
  }

  function onDeleteTrack(): void {
    const current = document.value;
    const track = currentTrack.value;
    if (!current || !track || !options.canEdit.value) {
      return;
    }
    commit(deleteTrack(current, track.id));
    playback.goToViewpoint(0);
  }

  function onDuplicateTrack(name: string): void {
    const current = document.value;
    const track = currentTrack.value;
    if (!current || !track || !options.canEdit.value) {
      return;
    }
    commit(duplicateTrack(current, track.id, name));
    selectedOverlayId.value = null;
    playback.pause();
    playback.goToViewpoint(0);
  }

  function onSelectTrack(trackId: string): void {
    if (!document.value) {
      return;
    }
    commit(selectTrack(document.value, trackId));
    playback.pause();
    playback.goToViewpoint(0);
  }

  function onToggleOverlays(show: boolean): void {
    if (!document.value || !options.canEdit.value) {
      if (document.value) {
        document.value = { ...document.value, showOverlays: show };
      }
      return;
    }
    commit(setShowOverlays(document.value, show));
  }

  function onCapture(): void {
    const track = currentTrack.value;
    const frame = options.readFrame();
    if (!track || !frame || !document.value || !options.canEdit.value) {
      return;
    }
    commit(captureViewpoint(document.value, track.id, frame));
    const updated = currentTrack.value;
    if (updated) {
      playback.goToViewpoint(updated.viewpoints.length - 1);
    }
  }

  function onUpdateFrame(): void {
    const track = currentTrack.value;
    const frame = options.readFrame();
    const viewpoint = track?.viewpoints[playback.viewpointIndex.value];
    if (!track || !frame || !viewpoint || !document.value || !options.canEdit.value) {
      return;
    }
    commit(updateViewpointFrame(document.value, track.id, viewpoint.id, frame));
    playback.showViewpoint(playback.viewpointIndex.value);
  }

  function onDwellSeconds(seconds: number): void {
    const track = currentTrack.value;
    const viewpoint = track?.viewpoints[playback.viewpointIndex.value];
    if (!track || !viewpoint || !document.value) {
      return;
    }
    commit(
      updateViewpointDwell(
        document.value,
        track.id,
        viewpoint.id,
        durationSecondsToMs(seconds),
      ),
    );
  }

  function onTransitionSeconds(seconds: number): void {
    const track = currentTrack.value;
    const transition = track?.transitions[playback.viewpointIndex.value];
    if (!track || !transition || !document.value) {
      return;
    }
    commit(
      updateTransitionDuration(
        document.value,
        track.id,
        transition.id,
        durationSecondsToMs(seconds),
      ),
    );
  }

  function onPathKind(kind: PresentationPathKind): void {
    const track = currentTrack.value;
    const transition = track?.transitions[playback.viewpointIndex.value];
    if (!track || !transition || !document.value) {
      return;
    }
    addPointArmed.value = false;
    commit(setTransitionPath(document.value, track.id, transition.id, kind));
  }

  function onDuplicateViewpoint(): void {
    const track = currentTrack.value;
    const viewpoint = track?.viewpoints[playback.viewpointIndex.value];
    if (!track || !viewpoint || !document.value) {
      return;
    }
    const nextIndex = playback.viewpointIndex.value + 1;
    commit(duplicateViewpoint(document.value, track.id, viewpoint.id));
    playback.goToViewpoint(nextIndex);
  }

  function onMoveViewpoint(direction: -1 | 1): void {
    const track = currentTrack.value;
    const viewpoint = track?.viewpoints[playback.viewpointIndex.value];
    if (!track || !viewpoint || !document.value) {
      return;
    }
    const nextIndex = playback.viewpointIndex.value + direction;
    if (nextIndex < 0 || nextIndex >= track.viewpoints.length) {
      return;
    }
    commit(moveViewpoint(document.value, track.id, viewpoint.id, direction));
    playback.goToViewpoint(nextIndex);
  }

  function onAddEffect(target: FrameEffectTargetKind, overlayId = ""): void {
    const track = currentTrack.value;
    const viewpoint = track?.viewpoints[playback.viewpointIndex.value];
    if (!track || !viewpoint || !document.value) {
      return;
    }
    commit(addEffect(document.value, track.id, viewpoint.id, target, overlayId));
  }

  function onUpdateEffect(
    effectId: string,
    patch: Partial<{
      kind: FrameEffectKind;
      target: FrameEffectTargetKind;
      overlayId: string;
      startMs: number;
      durationMs: number;
    }>,
  ): void {
    const track = currentTrack.value;
    const viewpoint = track?.viewpoints[playback.viewpointIndex.value];
    if (!track || !viewpoint || !document.value) {
      return;
    }
    commit(updateEffect(document.value, track.id, viewpoint.id, effectId, patch));
  }

  function onDuplicateEffect(effectId: string): void {
    const track = currentTrack.value;
    const viewpoint = track?.viewpoints[playback.viewpointIndex.value];
    if (!track || !viewpoint || !document.value) {
      return;
    }
    commit(duplicateEffect(document.value, track.id, viewpoint.id, effectId));
  }

  function onMoveEffect(effectId: string, direction: -1 | 1): void {
    const track = currentTrack.value;
    const viewpoint = track?.viewpoints[playback.viewpointIndex.value];
    if (!track || !viewpoint || !document.value) {
      return;
    }
    commit(moveEffect(document.value, track.id, viewpoint.id, effectId, direction));
  }

  function onRemoveEffect(effectId: string): void {
    const track = currentTrack.value;
    const viewpoint = track?.viewpoints[playback.viewpointIndex.value];
    if (!track || !viewpoint || !document.value) {
      return;
    }
    commit(removeEffect(document.value, track.id, viewpoint.id, effectId));
  }

  function onRemoveViewpoint(): void {
    const track = currentTrack.value;
    const viewpoint = track?.viewpoints[playback.viewpointIndex.value];
    if (!track || !viewpoint || !document.value) {
      return;
    }
    const nextIndex = Math.max(0, playback.viewpointIndex.value - 1);
    commit(removeViewpoint(document.value, track.id, viewpoint.id));
    playback.goToViewpoint(nextIndex);
  }

  function onInsertPoint(point: NormPoint): void {
    const track = currentTrack.value;
    const transition = track?.transitions[playback.viewpointIndex.value];
    const from = track?.viewpoints[playback.viewpointIndex.value];
    const to = track && from
      ? track.viewpoints[(playback.viewpointIndex.value + 1) % track.viewpoints.length]
      : undefined;
    if (!track || !transition || !from || !to || !document.value || transition.path !== "polyline") {
      addPointArmed.value = false;
      return;
    }
    commit(
      setTransitionPoints(
        document.value,
        track.id,
        transition.id,
        insertPolylinePoint(transition.points, from.anchor, to.anchor, point),
      ),
    );
    addPointArmed.value = false;
  }

  function onMovePoint(index: number, point: NormPoint): void {
    const track = currentTrack.value;
    const transition = track?.transitions[playback.viewpointIndex.value];
    if (!track || !transition || !document.value) {
      return;
    }
    const points = transition.points.map((item, itemIndex) => (itemIndex === index ? point : item));
    commit(setTransitionPoints(document.value, track.id, transition.id, points));
  }

  function onRemovePoint(index: number): void {
    const track = currentTrack.value;
    const transition = track?.transitions[playback.viewpointIndex.value];
    if (!track || !transition || !document.value) {
      return;
    }
    commit(
      setTransitionPoints(
        document.value,
        track.id,
        transition.id,
        transition.points.filter((_, itemIndex) => itemIndex !== index),
      ),
    );
  }

  function onMoveControl(index: number, point: NormPoint): void {
    const track = currentTrack.value;
    const transition = track?.transitions[playback.viewpointIndex.value];
    if (!track || !transition || !document.value) {
      return;
    }
    commit(placeTransitionControl(document.value, track.id, transition.id, index, point));
  }

  function onAddOverlay(shape: PresentationOverlayKind, mark?: PresentationMark): void {
    const track = currentTrack.value;
    if (!track || !document.value) {
      return;
    }
    const viewpoint = track.viewpoints[playback.viewpointIndex.value];
    const transition = track.transitions[playback.viewpointIndex.value];
    const owner = attachTarget.value === "transition" && transition
      ? { kind: "transition" as const, id: transition.id }
      : viewpoint
        ? { kind: "viewpoint" as const, id: viewpoint.id }
        : null;
    if (!owner) {
      return;
    }
    commit(addOverlay(document.value, track.id, owner, shape, mark));
    const created = currentTrack.value?.overlays.at(-1);
    selectedOverlayId.value = created?.id ?? null;
  }

  function onChangeOverlay(
    overlayId: string,
    patch: Partial<Omit<PresentationOverlay, "id" | "owner" | "shape">>,
  ): void {
    const track = currentTrack.value;
    if (!track || !document.value) {
      return;
    }
    commit(updateOverlay(document.value, track.id, overlayId, patch));
  }

  function onRemoveOverlay(overlayId: string): void {
    const track = currentTrack.value;
    if (!track || !document.value) {
      return;
    }
    commit(removeOverlay(document.value, track.id, overlayId));
    if (selectedOverlayId.value === overlayId) {
      selectedOverlayId.value = null;
    }
  }

  async function onExportGif(): Promise<void> {
    const track = currentTrack.value;
    const gifContext = options.getGifContext();
    if (!track || track.viewpoints.length === 0 || !gifContext || exportingGif.value) {
      return;
    }
    exportingGif.value = true;
    try {
      const blob = await renderPresentationGif({
        svg: gifContext.svg,
        frameHref: gifContext.frameHref,
        track,
        showOverlays: document.value?.showOverlays !== false,
        imageWidth: gifContext.imageWidth,
        imageHeight: gifContext.imageHeight,
        viewportWidth: gifContext.viewportWidth,
        viewportHeight: gifContext.viewportHeight,
        theme: gifContext.theme,
      });
      downloadBlob(blob, presentationGifFileName(track.name));
    } catch (error) {
      const message = resolveLocalizedErrorMessage(error, t, "app.exportGifFailed");
      void alert({
        title: t("app.exportError"),
        message,
        variant: "error",
      });
    } finally {
      exportingGif.value = false;
    }
  }

  function onExportHtml(): void {
    const track = currentTrack.value;
    const gifContext = options.getGifContext();
    if (!track || track.viewpoints.length === 0 || !gifContext || exportingHtml.value) {
      return;
    }
    exportingHtml.value = true;
    try {
      const html = renderPresentationHtml({
        svg: gifContext.svg,
        frameHref: gifContext.frameHref,
        track,
        showOverlays: document.value?.showOverlays !== false,
        imageWidth: gifContext.imageWidth,
        imageHeight: gifContext.imageHeight,
        theme: gifContext.theme,
        lang: locale.value,
        dir: localeDirection(locale.value),
        labels: {
          first: t("presentation.first"),
          prev: t("presentation.prev"),
          next: t("presentation.next"),
          play: t("presentation.play"),
          pause: t("presentation.pause"),
          repeat: t("presentation.repeat"),
        },
      });
      downloadTextFile(html, presentationHtmlFileName(track.name), PRESENTATION_HTML_MIME);
    } catch (error) {
      const message = resolveLocalizedErrorMessage(error, t, "app.exportHtmlFailed");
      void alert({
        title: t("app.exportError"),
        message,
        variant: "error",
      });
    } finally {
      exportingHtml.value = false;
    }
  }

  function selectViewpoint(index: number): void {
    playback.pause();
    playback.goToViewpoint(index);
    selectedOverlayId.value = null;
  }

  onUnmounted(() => {
    if (revealTimer) {
      clearTimeout(revealTimer);
    }
  });

  return {
    enabled,
    canEdit: options.canEdit,
    open,
    panelOpen,
    mode,
    document,
    currentTrack,
    dimChrome,
    headerDimHeld,
    chromeRevealed,
    holdHeaderDim,
    releaseHeaderDim,
    selectedOverlayId,
    exportingGif,
    exportingHtml,
    repeat,
    addPointArmed,
    attachTarget,
    playback,
    hasFrame,
    revealChrome,
    toggleOpen,
    togglePanel,
    onCreateTrack,
    onRenameTrack,
    onDeleteTrack,
    onDuplicateTrack,
    onSelectTrack,
    onToggleOverlays,
    onCapture,
    onUpdateFrame,
    onDwellSeconds,
    onTransitionSeconds,
    onPathKind,
    onDuplicateViewpoint,
    onMoveViewpoint,
    onAddEffect,
    onUpdateEffect,
    onDuplicateEffect,
    onMoveEffect,
    onRemoveEffect,
    onRemoveViewpoint,
    onInsertPoint,
    onMovePoint,
    onRemovePoint,
    onMoveControl,
    onAddOverlay,
    onChangeOverlay,
    onRemoveOverlay,
    onExportGif,
    onExportHtml,
    selectViewpoint,
  };
}
