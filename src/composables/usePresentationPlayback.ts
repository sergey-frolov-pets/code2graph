import { onUnmounted, ref } from "vue";
import { PRESENTATION_DEFAULT_TRANSITION_MS } from "@/services/presentation/constants";
import { easeInOut, lerpScale, sampleTransitionPoint } from "@/services/presentation/path";
import type { CameraFrame, PresentationTrack } from "@/services/presentation/types";

export type PresentationPhase = "dwell" | "travel";

/** One pass ends after the dwell on the last viewpoint. Repeat keeps the cycle going. */
export function shouldStopAfterDwell(repeat: boolean, index: number, count: number): boolean {
  return !repeat && count > 0 && index >= count - 1;
}

export function usePresentationPlayback(options: {
  getTrack: () => PresentationTrack | null;
  setFrame: (frame: CameraFrame) => void;
  setLocked: (locked: boolean) => void;
  getRepeat: () => boolean;
}) {
  const playing = ref(false);
  const animating = ref(false);
  const viewpointIndex = ref(0);
  const phase = ref<PresentationPhase>("dwell");
  const travelAmount = ref(0);
  const travelOrigin = ref(0);

  let frameId = 0;
  let phaseStarted = 0;
  let reverse = false;

  function stopRaf(): void {
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    }
  }

  function syncLock(): void {
    options.setLocked(playing.value || animating.value);
  }

  function trackOrNull(): PresentationTrack | null {
    return options.getTrack();
  }

  function showViewpoint(index: number): void {
    const viewpoint = trackOrNull()?.viewpoints[index];
    if (!viewpoint) {
      return;
    }
    options.setFrame({
      anchorX: viewpoint.anchor.x,
      anchorY: viewpoint.anchor.y,
      scale: viewpoint.scale,
    });
  }

  function resumeStamp(duration: number): void {
    const raw = reverse ? 1 - travelAmount.value : travelAmount.value;
    phaseStarted = performance.now() - raw * duration;
  }

  function tick(now: number): void {
    const track = trackOrNull();
    if (!track || track.viewpoints.length === 0) {
      playing.value = false;
      animating.value = false;
      phase.value = "dwell";
      stopRaf();
      syncLock();
      return;
    }

    if (viewpointIndex.value >= track.viewpoints.length) {
      viewpointIndex.value = 0;
    }

    if (phase.value === "dwell" || track.viewpoints.length < 2) {
      showViewpoint(viewpointIndex.value);
      travelAmount.value = 0;
      const dwell = track.viewpoints[viewpointIndex.value]?.dwellMs ?? 0;
      if (playing.value && now - phaseStarted >= dwell) {
        if (shouldStopAfterDwell(options.getRepeat(), viewpointIndex.value, track.viewpoints.length)) {
          playing.value = false;
          animating.value = false;
          stopRaf();
          syncLock();
          return;
        }
        if (track.viewpoints.length > 1) {
          phase.value = "travel";
          reverse = false;
          travelOrigin.value = viewpointIndex.value;
          phaseStarted = now;
          travelAmount.value = 0;
        }
      }
    } else {
      const origin = travelOrigin.value;
      const from = track.viewpoints[origin];
      const destination = (origin + 1) % track.viewpoints.length;
      const to = track.viewpoints[destination];
      const transition = track.transitions[origin];
      const duration = transition?.durationMs ?? PRESENTATION_DEFAULT_TRANSITION_MS;
      const raw = Math.min(1, (now - phaseStarted) / Math.max(duration, 1));
      const directed = reverse ? 1 - raw : raw;
      travelAmount.value = directed;
      if (from && to) {
        const eased = easeInOut(directed);
        const point = sampleTransitionPoint(
          from.anchor,
          to.anchor,
          transition ?? { path: "line", points: [], controls: [] },
          eased,
        );
        options.setFrame({
          anchorX: point.x,
          anchorY: point.y,
          scale: lerpScale(from.scale, to.scale, eased),
        });
      }
      if (raw >= 1) {
        viewpointIndex.value = reverse ? origin : destination;
        phase.value = "dwell";
        reverse = false;
        phaseStarted = now;
        showViewpoint(viewpointIndex.value);
        if (!playing.value) {
          animating.value = false;
          stopRaf();
          syncLock();
          return;
        }
      }
    }

    if (playing.value || animating.value) {
      frameId = requestAnimationFrame(tick);
    } else {
      stopRaf();
    }
    syncLock();
  }

  function ensureLoop(): void {
    stopRaf();
    animating.value = true;
    syncLock();
    frameId = requestAnimationFrame(tick);
  }

  function pause(): void {
    playing.value = false;
    animating.value = false;
    stopRaf();
    syncLock();
  }

  function togglePlay(): void {
    const track = trackOrNull();
    if (!track || track.viewpoints.length === 0) {
      return;
    }
    if (playing.value) {
      pause();
      return;
    }
    playing.value = true;
    if (phase.value === "travel") {
      const duration =
        track.transitions[travelOrigin.value]?.durationMs
        ?? PRESENTATION_DEFAULT_TRANSITION_MS;
      resumeStamp(duration);
    } else {
      phaseStarted = performance.now();
    }
    ensureLoop();
  }

  function step(direction: 1 | -1): void {
    const track = trackOrNull();
    if (!track || track.viewpoints.length < 2) {
      showViewpoint(0);
      return;
    }
    if (viewpointIndex.value >= track.viewpoints.length) {
      viewpointIndex.value = 0;
    }
    reverse = direction < 0;
    travelOrigin.value = reverse
      ? (viewpointIndex.value - 1 + track.viewpoints.length) % track.viewpoints.length
      : viewpointIndex.value;
    phase.value = "travel";
    travelAmount.value = reverse ? 1 : 0;
    phaseStarted = performance.now();
    ensureLoop();
  }

  function goToViewpoint(index: number): void {
    const track = trackOrNull();
    if (!track || !track.viewpoints[index]) {
      return;
    }
    viewpointIndex.value = index;
    phase.value = "dwell";
    reverse = false;
    travelAmount.value = 0;
    phaseStarted = performance.now();
    showViewpoint(index);
    if (playing.value) {
      ensureLoop();
    }
  }

  onUnmounted(() => {
    stopRaf();
    options.setLocked(false);
  });

  return {
    playing,
    animating,
    viewpointIndex,
    phase,
    travelAmount,
    travelOrigin,
    togglePlay,
    pause,
    step,
    goToViewpoint,
    showViewpoint,
  };
}
