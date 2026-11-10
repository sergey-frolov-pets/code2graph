import {
  FRAME_EFFECT_DEFAULT_MS,
  PRESENTATION_CURVE_OFFSET,
  PRESENTATION_DEFAULT_DWELL_MS,
  PRESENTATION_DEFAULT_TRANSITION_MS,
  PRESENTATION_MAX_DURATION_MS,
  PRESENTATION_MAX_SCALE,
  PRESENTATION_MIN_DURATION_MS,
  PRESENTATION_MIN_OVERLAY_SIZE,
  PRESENTATION_OVERLAY_HEIGHT,
  PRESENTATION_OVERLAY_WIDTH,
  PRESENTATION_SCHEMA_VERSION,
} from "@/services/presentation/constants";
import { PREVIEW_MIN_ZOOM } from "@/constants/preview-pan-zoom";
import type {
  CameraFrame,
  FrameEffect,
  FrameEffectTargetKind,
  NormPoint,
  OverlayOwner,
  PresentationDocument,
  PresentationOverlay,
  PresentationOverlayKind,
  PresentationPathKind,
  PresentationTrack,
  PresentationTransition,
  Viewpoint,
} from "@/services/presentation/types";
import {
  FRAME_EFFECT_KINDS,
  FRAME_EFFECT_TARGETS,
  PRESENTATION_ARROW_DIRECTIONS,
  PRESENTATION_ARROW_FORMS,
  PRESENTATION_ARROW_HEADS,
  PRESENTATION_ARROW_KINDS,
  PRESENTATION_BUBBLE_SHAPES,
  PRESENTATION_FONTS,
  PRESENTATION_LINE_STYLES,
  PRESENTATION_OVERLAY_KINDS,
  PRESENTATION_PATH_KINDS,
  PRESENTATION_TEXT_BACKINGS,
} from "@/services/presentation/types";

export function createPresentationId(prefix: string): string {
  const uuid = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  return `${prefix}-${uuid}`;
}

export function createTrack(name: string): PresentationTrack {
  return {
    id: createPresentationId("track"),
    name,
    viewpoints: [],
    transitions: [],
    overlays: [],
  };
}

export function createPresentation(name: string): PresentationDocument {
  const track = createTrack(name);
  return {
    version: PRESENTATION_SCHEMA_VERSION,
    activeTrackId: track.id,
    showOverlays: true,
    tracks: [track],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readPoint(value: unknown): NormPoint | null {
  if (!isRecord(value) || !isFiniteNumber(value.x) || !isFiniteNumber(value.y)) {
    return null;
  }
  return { x: value.x, y: value.y };
}

function readPoints(value: unknown): NormPoint[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const point = readPoint(item);
    return point ? [point] : [];
  });
}

function clampDuration(value: unknown, fallback: number): number {
  const numeric = isFiniteNumber(value) ? value : fallback;
  return Math.min(
    PRESENTATION_MAX_DURATION_MS,
    Math.max(PRESENTATION_MIN_DURATION_MS, Math.round(numeric)),
  );
}

function clampScale(value: unknown): number {
  const numeric = isFiniteNumber(value) ? value : 1;
  return Math.min(PRESENTATION_MAX_SCALE, Math.max(PREVIEW_MIN_ZOOM, numeric));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function clampStart(value: unknown): number {
  const numeric = isFiniteNumber(value) ? value : 0;
  return Math.min(PRESENTATION_MAX_DURATION_MS, Math.max(0, Math.round(numeric)));
}

function readEffect(value: unknown): FrameEffect | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) {
    return null;
  }
  const target = oneOf(value.target, FRAME_EFFECT_TARGETS, "diagram");
  const overlayId = typeof value.overlayId === "string" ? value.overlayId : "";
  if (target === "overlay" && !overlayId) {
    return null;
  }
  return {
    id: value.id,
    kind: oneOf(value.kind, FRAME_EFFECT_KINDS, "fade"),
    target,
    overlayId: target === "overlay" ? overlayId : "",
    startMs: clampStart(value.startMs),
    durationMs: clampDuration(value.durationMs, FRAME_EFFECT_DEFAULT_MS),
  };
}

function readEffects(value: unknown): FrameEffect[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    const effect = readEffect(item);
    return effect ? [effect] : [];
  });
}

function readViewpoint(value: unknown): Viewpoint | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) {
    return null;
  }
  const anchor = readPoint(value.anchor);
  if (!anchor) {
    return null;
  }
  return {
    id: value.id,
    anchor,
    scale: clampScale(value.scale),
    dwellMs: clampDuration(value.dwellMs, PRESENTATION_DEFAULT_DWELL_MS),
    effects: readEffects(value.effects),
  };
}

function readTransition(value: unknown): PresentationTransition | null {
  if (
    !isRecord(value)
    || typeof value.id !== "string"
    || typeof value.fromId !== "string"
    || typeof value.toId !== "string"
  ) {
    return null;
  }
  return {
    id: value.id,
    fromId: value.fromId,
    toId: value.toId,
    durationMs: clampDuration(value.durationMs, PRESENTATION_DEFAULT_TRANSITION_MS),
    path: oneOf(value.path, PRESENTATION_PATH_KINDS, "line"),
    points: readPoints(value.points),
    controls: readPoints(value.controls),
  };
}

const OVERLAY_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function readCornerRadius(value: unknown): number {
  if (!isFiniteNumber(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function readOverlayColor(value: unknown): string {
  return typeof value === "string" && OVERLAY_COLOR_PATTERN.test(value) ? value : "";
}

function readOverlay(value: unknown): PresentationOverlay | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) {
    return null;
  }
  if (!isRecord(value.owner) || typeof value.owner.id !== "string") {
    return null;
  }
  if (value.owner.kind !== "viewpoint" && value.owner.kind !== "transition") {
    return null;
  }
  if (
    !isFiniteNumber(value.x)
    || !isFiniteNumber(value.y)
    || !isFiniteNumber(value.width)
    || !isFiniteNumber(value.height)
  ) {
    return null;
  }
  return {
    id: value.id,
    owner: { kind: value.owner.kind, id: value.owner.id },
    shape: oneOf(value.shape, PRESENTATION_OVERLAY_KINDS, "rect"),
    x: value.x,
    y: value.y,
    width: value.width,
    height: value.height,
    text: typeof value.text === "string" ? value.text : "",
    backing: oneOf(value.backing, PRESENTATION_TEXT_BACKINGS, "none"),
    bubbleShape: oneOf(value.bubbleShape, PRESENTATION_BUBBLE_SHAPES, "rectangle"),
    cornerRadius: readCornerRadius(value.cornerRadius),
    arrowKind: oneOf(value.arrowKind, PRESENTATION_ARROW_KINDS, "straight"),
    arrowForm: oneOf(value.arrowForm, PRESENTATION_ARROW_FORMS, "line"),
    arrowDirection: oneOf(value.arrowDirection, PRESENTATION_ARROW_DIRECTIONS, "right"),
    arrowHead: oneOf(value.arrowHead, PRESENTATION_ARROW_HEADS, "end"),
    stroke: readOverlayColor(value.stroke),
    fill: readOverlayColor(value.fill),
    textColor: readOverlayColor(value.textColor),
    font: oneOf(value.font, PRESENTATION_FONTS, "sans"),
    line: oneOf(value.line, PRESENTATION_LINE_STYLES, "solid"),
  };
}

function readTrack(value: unknown): PresentationTrack | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id) {
    return null;
  }
  const viewpoints = Array.isArray(value.viewpoints)
    ? value.viewpoints.flatMap((item) => {
        const viewpoint = readViewpoint(item);
        return viewpoint ? [viewpoint] : [];
      })
    : [];
  const transitions = Array.isArray(value.transitions)
    ? value.transitions.flatMap((item) => {
        const transition = readTransition(item);
        return transition ? [transition] : [];
      })
    : [];
  const overlays = Array.isArray(value.overlays)
    ? value.overlays.flatMap((item) => {
        const overlay = readOverlay(item);
        return overlay ? [overlay] : [];
      })
    : [];
  const syncedTransitions = syncTransitions(viewpoints, transitions);
  const keptOverlays = overlays.filter((overlay) =>
    overlayOwnerExists(overlay.owner, viewpoints, syncedTransitions),
  );
  return {
    id: value.id,
    name: typeof value.name === "string" && value.name.trim() ? value.name : value.id,
    viewpoints: pruneEffects(viewpoints, keptOverlays),
    transitions: syncedTransitions,
    overlays: keptOverlays,
  };
}

function overlayOwnerExists(
  owner: OverlayOwner,
  viewpoints: Viewpoint[],
  transitions: PresentationTransition[],
): boolean {
  if (owner.kind === "viewpoint") {
    return viewpoints.some((viewpoint) => viewpoint.id === owner.id);
  }
  return transitions.some((transition) => transition.id === owner.id);
}

export function sanitizePresentationDocument(value: unknown): PresentationDocument | null {
  if (!isRecord(value) || value.version !== PRESENTATION_SCHEMA_VERSION) {
    return null;
  }
  const tracks = Array.isArray(value.tracks)
    ? value.tracks.flatMap((item) => {
        const track = readTrack(item);
        return track ? [track] : [];
      })
    : [];
  if (tracks.length === 0) {
    return null;
  }
  const activeTrackId = tracks.some((track) => track.id === value.activeTrackId)
    ? String(value.activeTrackId)
    : tracks[0].id;
  return {
    version: PRESENTATION_SCHEMA_VERSION,
    activeTrackId,
    showOverlays: value.showOverlays !== false,
    tracks,
  };
}

function midpoint(from: NormPoint, to: NormPoint): NormPoint {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

function curveControl(from: NormPoint, to: NormPoint, sign: number): NormPoint {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const length = Math.hypot(deltaX, deltaY) || 1;
  const middle = midpoint(from, to);
  return {
    x: middle.x + (-deltaY / length) * PRESENTATION_CURVE_OFFSET * sign,
    y: middle.y + (deltaX / length) * PRESENTATION_CURVE_OFFSET * sign,
  };
}

export function anchorOf(viewpoint: Viewpoint): NormPoint {
  return viewpoint.anchor;
}

function createTransition(from: Viewpoint, to: Viewpoint): PresentationTransition {
  return {
    id: createPresentationId("transition"),
    fromId: from.id,
    toId: to.id,
    durationMs: PRESENTATION_DEFAULT_TRANSITION_MS,
    path: "line",
    points: [],
    controls: [],
  };
}

export function syncTransitions(
  viewpoints: Viewpoint[],
  previous: PresentationTransition[],
): PresentationTransition[] {
  if (viewpoints.length < 2) {
    return [];
  }
  return viewpoints.map((from, index) => {
    const to = viewpoints[(index + 1) % viewpoints.length];
    const existing = previous.find(
      (transition) => transition.fromId === from.id && transition.toId === to.id,
    );
    return existing ?? createTransition(from, to);
  });
}

export function withPathKind(
  transition: PresentationTransition,
  kind: PresentationPathKind,
  from: NormPoint,
  to: NormPoint,
): PresentationTransition {
  if (kind === "line") {
    return { ...transition, path: kind, points: [], controls: [] };
  }
  if (kind === "polyline") {
    const points = transition.points.length > 0 ? transition.points : [midpoint(from, to)];
    return { ...transition, path: kind, points, controls: [] };
  }
  if (kind === "quadratic") {
    const controls = transition.controls.length > 0
      ? [transition.controls[0]]
      : [curveControl(from, to, 1)];
    return { ...transition, path: kind, points: [], controls };
  }
  const controls = transition.controls.length >= 2
    ? [transition.controls[0], transition.controls[1]]
    : [curveControl(from, to, 1), curveControl(from, to, -1)];
  return { ...transition, path: "cubic", points: [], controls };
}

function mapTrack(
  document: PresentationDocument,
  trackId: string,
  update: (track: PresentationTrack) => PresentationTrack,
): PresentationDocument {
  return {
    ...document,
    tracks: document.tracks.map((track) => (track.id === trackId ? update(track) : track)),
  };
}

export function activeTrack(document: PresentationDocument): PresentationTrack | null {
  return (
    document.tracks.find((track) => track.id === document.activeTrackId)
    ?? document.tracks[0]
    ?? null
  );
}

export function addTrack(document: PresentationDocument, name: string): PresentationDocument {
  const track = createTrack(name);
  return {
    ...document,
    activeTrackId: track.id,
    tracks: [...document.tracks, track],
  };
}

export function renameTrack(
  document: PresentationDocument,
  trackId: string,
  name: string,
): PresentationDocument {
  const trimmed = name.trim();
  if (!trimmed) {
    return document;
  }
  return mapTrack(document, trackId, (track) => ({ ...track, name: trimmed }));
}

export function deleteTrack(
  document: PresentationDocument,
  trackId: string,
): PresentationDocument | null {
  const tracks = document.tracks.filter((track) => track.id !== trackId);
  if (tracks.length === 0) {
    return null;
  }
  const activeTrackId = tracks.some((track) => track.id === document.activeTrackId)
    ? document.activeTrackId
    : tracks[0].id;
  return { ...document, tracks, activeTrackId };
}

export function selectTrack(
  document: PresentationDocument,
  trackId: string,
): PresentationDocument {
  if (!document.tracks.some((track) => track.id === trackId)) {
    return document;
  }
  return { ...document, activeTrackId: trackId };
}

export function setShowOverlays(
  document: PresentationDocument,
  showOverlays: boolean,
): PresentationDocument {
  return { ...document, showOverlays };
}

export function viewpointById(track: PresentationTrack, id: string): Viewpoint | undefined {
  return track.viewpoints.find((viewpoint) => viewpoint.id === id);
}

function retargetOverlays(
  overlays: PresentationOverlay[],
  viewpoints: Viewpoint[],
  transitions: PresentationTransition[],
): PresentationOverlay[] {
  return overlays.filter((overlay) => overlayOwnerExists(overlay.owner, viewpoints, transitions));
}

function pruneEffects(viewpoints: Viewpoint[], overlays: PresentationOverlay[]): Viewpoint[] {
  const overlayIds = new Set(overlays.map((overlay) => overlay.id));
  return viewpoints.map((viewpoint) => ({
    ...viewpoint,
    effects: viewpoint.effects.filter(
      (effect) => effect.target !== "overlay" || overlayIds.has(effect.overlayId),
    ),
  }));
}

function withTrackLists(
  track: PresentationTrack,
  viewpoints: Viewpoint[],
  transitions: PresentationTransition[],
  overlays: PresentationOverlay[],
): PresentationTrack {
  const keptOverlays = retargetOverlays(overlays, viewpoints, transitions);
  return {
    ...track,
    viewpoints: pruneEffects(viewpoints, keptOverlays),
    transitions,
    overlays: keptOverlays,
  };
}

export function captureViewpoint(
  document: PresentationDocument,
  trackId: string,
  frame: CameraFrame,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => {
    const viewpoint: Viewpoint = {
      id: createPresentationId("view"),
      anchor: { x: frame.anchorX, y: frame.anchorY },
      scale: clampScale(frame.scale),
      dwellMs: PRESENTATION_DEFAULT_DWELL_MS,
      effects: [],
    };
    const viewpoints = [...track.viewpoints, viewpoint];
    const transitions = syncTransitions(viewpoints, track.transitions);
    return withTrackLists(track, viewpoints, transitions, track.overlays);
  });
}

export function updateViewpointFrame(
  document: PresentationDocument,
  trackId: string,
  viewpointId: string,
  frame: CameraFrame,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => ({
    ...track,
    viewpoints: track.viewpoints.map((viewpoint) =>
      viewpoint.id === viewpointId
        ? {
            ...viewpoint,
            anchor: { x: frame.anchorX, y: frame.anchorY },
            scale: clampScale(frame.scale),
          }
        : viewpoint,
    ),
  }));
}

export function updateViewpointDwell(
  document: PresentationDocument,
  trackId: string,
  viewpointId: string,
  dwellMs: number,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => ({
    ...track,
    viewpoints: track.viewpoints.map((viewpoint) =>
      viewpoint.id === viewpointId
        ? { ...viewpoint, dwellMs: clampDuration(dwellMs, viewpoint.dwellMs) }
        : viewpoint,
    ),
  }));
}

export function removeViewpoint(
  document: PresentationDocument,
  trackId: string,
  viewpointId: string,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => {
    const viewpoints = track.viewpoints.filter((viewpoint) => viewpoint.id !== viewpointId);
    const transitions = syncTransitions(viewpoints, track.transitions);
    return withTrackLists(track, viewpoints, transitions, track.overlays);
  });
}

export function duplicateViewpoint(
  document: PresentationDocument,
  trackId: string,
  viewpointId: string,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => {
    const index = track.viewpoints.findIndex((viewpoint) => viewpoint.id === viewpointId);
    const source = track.viewpoints[index];
    if (!source) {
      return track;
    }

    const copyId = createPresentationId("view");
    const overlayIdMap = new Map<string, string>();
    const overlays = track.overlays.flatMap((overlay) => {
      if (overlay.owner.kind !== "viewpoint" || overlay.owner.id !== source.id) {
        return [overlay];
      }
      const overlayCopyId = createPresentationId("overlay");
      overlayIdMap.set(overlay.id, overlayCopyId);
      return [
        overlay,
        {
          ...overlay,
          id: overlayCopyId,
          owner: { kind: "viewpoint" as const, id: copyId },
        },
      ];
    });

    const outgoing = track.transitions.find((transition) => transition.fromId === source.id);
    const copy: Viewpoint = {
      ...source,
      id: copyId,
      anchor: { ...source.anchor },
      effects: source.effects.flatMap((effect) => {
        if (effect.target !== "overlay") {
          return [{ ...effect, id: createPresentationId("effect") }];
        }
        const copiedOverlayId = overlayIdMap.get(effect.overlayId);
        if (copiedOverlayId) {
          return [{
            ...effect,
            id: createPresentationId("effect"),
            overlayId: copiedOverlayId,
          }];
        }
        if (outgoing && overlayOwnedBy(overlays, effect.overlayId, "transition", outgoing.id)) {
          return [{ ...effect, id: createPresentationId("effect") }];
        }
        return [];
      }),
    };

    const viewpoints = [...track.viewpoints];
    viewpoints.splice(index + 1, 0, copy);
    const movedTransitions = track.transitions.map((transition) =>
      transition.fromId === source.id ? { ...transition, fromId: copyId } : transition,
    );
    return withTrackLists(
      track,
      viewpoints,
      syncTransitions(viewpoints, movedTransitions),
      overlays,
    );
  });
}

function overlayOwnedBy(
  overlays: PresentationOverlay[],
  overlayId: string,
  kind: OverlayOwner["kind"],
  ownerId: string,
): boolean {
  const overlay = overlays.find((item) => item.id === overlayId);
  return overlay?.owner.kind === kind && overlay.owner.id === ownerId;
}

export function moveViewpoint(
  document: PresentationDocument,
  trackId: string,
  viewpointId: string,
  direction: -1 | 1,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => {
    const index = track.viewpoints.findIndex((viewpoint) => viewpoint.id === viewpointId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= track.viewpoints.length) {
      return track;
    }
    const viewpoints = [...track.viewpoints];
    const [moved] = viewpoints.splice(index, 1);
    viewpoints.splice(nextIndex, 0, moved);
    const transitions = syncTransitions(viewpoints, track.transitions);
    return withTrackLists(track, viewpoints, transitions, track.overlays);
  });
}

function effectHostMs(track: PresentationTrack, viewpoint: Viewpoint, effect: FrameEffect): number {
  if (effect.target === "overlay") {
    const overlay = track.overlays.find((item) => item.id === effect.overlayId);
    if (overlay?.owner.kind === "transition") {
      const transition = track.transitions.find((item) => item.id === overlay.owner.id);
      if (transition) {
        return transition.durationMs;
      }
    }
  }
  return viewpoint.dwellMs;
}

function fitEffect(effect: FrameEffect, hostMs: number): FrameEffect {
  const room = Math.max(PRESENTATION_MIN_DURATION_MS, hostMs);
  const startMs = Math.min(effect.startMs, Math.max(0, room - PRESENTATION_MIN_DURATION_MS));
  const durationMs = Math.min(effect.durationMs, room - startMs);
  return {
    ...effect,
    startMs,
    durationMs: clampDuration(durationMs, FRAME_EFFECT_DEFAULT_MS),
  };
}

export function addEffect(
  document: PresentationDocument,
  trackId: string,
  viewpointId: string,
  target: FrameEffectTargetKind,
  overlayId = "",
): PresentationDocument {
  return mapTrack(document, trackId, (track) => {
    const viewpoint = track.viewpoints.find((item) => item.id === viewpointId);
    if (!viewpoint) {
      return track;
    }
    if (target === "overlay" && !track.overlays.some((overlay) => overlay.id === overlayId)) {
      return track;
    }
    const draft: FrameEffect = {
      id: createPresentationId("effect"),
      kind: "fade",
      target,
      overlayId: target === "overlay" ? overlayId : "",
      startMs: 0,
      durationMs: FRAME_EFFECT_DEFAULT_MS,
    };
    const effect = fitEffect(draft, effectHostMs(track, viewpoint, draft));
    return {
      ...track,
      viewpoints: track.viewpoints.map((item) =>
        item.id === viewpointId ? { ...item, effects: [...item.effects, effect] } : item,
      ),
    };
  });
}

export function updateEffect(
  document: PresentationDocument,
  trackId: string,
  viewpointId: string,
  effectId: string,
  patch: Partial<Pick<FrameEffect, "kind" | "target" | "overlayId" | "startMs" | "durationMs">>,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => {
    const viewpoint = track.viewpoints.find((item) => item.id === viewpointId);
    if (!viewpoint) {
      return track;
    }
    return {
      ...track,
      viewpoints: track.viewpoints.map((item) => {
        if (item.id !== viewpointId) {
          return item;
        }
        return {
          ...item,
          effects: item.effects.flatMap((effect) => {
            if (effect.id !== effectId) {
              return [effect];
            }
            const target = patch.target ?? effect.target;
            const overlayId = target === "overlay"
              ? (patch.overlayId ?? effect.overlayId)
              : "";
            if (target === "overlay" && !track.overlays.some((overlay) => overlay.id === overlayId)) {
              return [effect];
            }
            const next = fitEffect(
              {
                ...effect,
                kind: patch.kind ?? effect.kind,
                target,
                overlayId,
                startMs: patch.startMs ?? effect.startMs,
                durationMs: patch.durationMs ?? effect.durationMs,
              },
              effectHostMs(track, viewpoint, { ...effect, target, overlayId }),
            );
            return [next];
          }),
        };
      }),
    };
  });
}

export function duplicateEffect(
  document: PresentationDocument,
  trackId: string,
  viewpointId: string,
  effectId: string,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => {
    const viewpoint = track.viewpoints.find((item) => item.id === viewpointId);
    const index = viewpoint?.effects.findIndex((effect) => effect.id === effectId) ?? -1;
    const source = viewpoint?.effects[index];
    if (!viewpoint || !source) {
      return track;
    }
    const hostMs = effectHostMs(track, viewpoint, source);
    const startMs = source.startMs + source.durationMs;
    if (startMs >= hostMs) {
      return track;
    }
    const copy = fitEffect(
      {
        ...source,
        id: createPresentationId("effect"),
        startMs,
        durationMs: Math.min(source.durationMs, hostMs - startMs),
      },
      hostMs,
    );
    const effects = [...viewpoint.effects];
    effects.splice(index + 1, 0, copy);
    return {
      ...track,
      viewpoints: track.viewpoints.map((item) =>
        item.id === viewpointId ? { ...item, effects } : item,
      ),
    };
  });
}

export function moveEffect(
  document: PresentationDocument,
  trackId: string,
  viewpointId: string,
  effectId: string,
  direction: -1 | 1,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => {
    const viewpoint = track.viewpoints.find((item) => item.id === viewpointId);
    if (!viewpoint) {
      return track;
    }
    const index = viewpoint.effects.findIndex((effect) => effect.id === effectId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= viewpoint.effects.length) {
      return track;
    }
    const effects = [...viewpoint.effects];
    const current = effects[index];
    const neighbor = effects[nextIndex];
    effects[index] = { ...neighbor, startMs: current.startMs };
    effects[nextIndex] = { ...current, startMs: neighbor.startMs };
    return {
      ...track,
      viewpoints: track.viewpoints.map((item) =>
        item.id === viewpointId ? { ...item, effects } : item,
      ),
    };
  });
}

export function removeEffect(
  document: PresentationDocument,
  trackId: string,
  viewpointId: string,
  effectId: string,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => ({
    ...track,
    viewpoints: track.viewpoints.map((viewpoint) =>
      viewpoint.id === viewpointId
        ? { ...viewpoint, effects: viewpoint.effects.filter((effect) => effect.id !== effectId) }
        : viewpoint,
    ),
  }));
}

export function updateTransitionDuration(
  document: PresentationDocument,
  trackId: string,
  transitionId: string,
  durationMs: number,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => ({
    ...track,
    transitions: track.transitions.map((transition) =>
      transition.id === transitionId
        ? { ...transition, durationMs: clampDuration(durationMs, transition.durationMs) }
        : transition,
    ),
  }));
}

export function setTransitionPath(
  document: PresentationDocument,
  trackId: string,
  transitionId: string,
  kind: PresentationPathKind,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => ({
    ...track,
    transitions: track.transitions.map((transition) => {
      if (transition.id !== transitionId) {
        return transition;
      }
      const from = viewpointById(track, transition.fromId);
      const to = viewpointById(track, transition.toId);
      if (!from || !to) {
        return { ...transition, path: kind };
      }
      return withPathKind(transition, kind, from.anchor, to.anchor);
    }),
  }));
}

export function setTransitionPoints(
  document: PresentationDocument,
  trackId: string,
  transitionId: string,
  points: NormPoint[],
): PresentationDocument {
  return mapTrack(document, trackId, (track) => ({
    ...track,
    transitions: track.transitions.map((transition) =>
      transition.id === transitionId ? { ...transition, points } : transition,
    ),
  }));
}

export function setTransitionControls(
  document: PresentationDocument,
  trackId: string,
  transitionId: string,
  controls: NormPoint[],
): PresentationDocument {
  return mapTrack(document, trackId, (track) => ({
    ...track,
    transitions: track.transitions.map((transition) =>
      transition.id === transitionId ? { ...transition, controls } : transition,
    ),
  }));
}

export function insertPolylinePoint(
  points: NormPoint[],
  from: NormPoint,
  to: NormPoint,
  point: NormPoint,
): NormPoint[] {
  const chain = [from, ...points, to];
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < chain.length - 1; index += 1) {
    const distance = distanceToSegment(point, chain[index], chain[index + 1]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  const next = [...points];
  next.splice(bestIndex, 0, point);
  return next;
}

function distanceToSegment(point: NormPoint, start: NormPoint, end: NormPoint): number {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const ratio = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared,
    ),
  );
  return Math.hypot(point.x - (start.x + deltaX * ratio), point.y - (start.y + deltaY * ratio));
}

function defaultOverlay(
  shape: PresentationOverlayKind,
  owner: OverlayOwner,
): PresentationOverlay {
  return {
    id: createPresentationId("overlay"),
    owner,
    shape,
    x: 0.4,
    y: 0.4,
    width: PRESENTATION_OVERLAY_WIDTH,
    height: shape === "arrow" ? 0 : PRESENTATION_OVERLAY_HEIGHT,
    text: "",
    backing: shape === "text" ? "rectangle" : "none",
    bubbleShape: "rectangle",
    cornerRadius: 0,
    arrowKind: "straight",
    arrowForm: "line",
    arrowDirection: "right",
    arrowHead: "end",
    stroke: "",
    fill: "",
    textColor: "",
    font: "sans",
    line: "solid",
  };
}

export function addOverlay(
  document: PresentationDocument,
  trackId: string,
  owner: OverlayOwner,
  shape: PresentationOverlayKind,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => ({
    ...track,
    overlays: [...track.overlays, defaultOverlay(shape, owner)],
  }));
}

export function updateOverlay(
  document: PresentationDocument,
  trackId: string,
  overlayId: string,
  patch: Partial<Omit<PresentationOverlay, "id" | "owner" | "shape">>,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => ({
    ...track,
    overlays: track.overlays.map((overlay) => {
      if (overlay.id !== overlayId) {
        return overlay;
      }
      const next = { ...overlay, ...patch };
      next.cornerRadius = readCornerRadius(next.cornerRadius);
      if (
        next.shape === "arrow"
        && next.arrowForm !== "line"
        && Math.abs(next.height) < PRESENTATION_MIN_OVERLAY_SIZE
      ) {
        next.height = PRESENTATION_OVERLAY_HEIGHT;
      }
      return next;
    }),
  }));
}

export function removeOverlay(
  document: PresentationDocument,
  trackId: string,
  overlayId: string,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => {
    const overlays = track.overlays.filter((overlay) => overlay.id !== overlayId);
    return {
      ...track,
      viewpoints: pruneEffects(track.viewpoints, overlays),
      overlays,
    };
  });
}

export function durationMsToSeconds(durationMs: number): number {
  return Math.round((durationMs / 1000) * 10) / 10;
}

export function durationSecondsToMs(seconds: number): number {
  return clampDuration(Math.round(seconds * 1000), PRESENTATION_DEFAULT_DWELL_MS);
}
