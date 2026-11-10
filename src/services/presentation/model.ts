import {
  PRESENTATION_CURVE_OFFSET,
  PRESENTATION_DEFAULT_DWELL_MS,
  PRESENTATION_DEFAULT_TRANSITION_MS,
  PRESENTATION_MAX_DURATION_MS,
  PRESENTATION_MAX_SCALE,
  PRESENTATION_MIN_DURATION_MS,
  PRESENTATION_OVERLAY_HEIGHT,
  PRESENTATION_OVERLAY_WIDTH,
  PRESENTATION_SCHEMA_VERSION,
} from "@/services/presentation/constants";
import { PREVIEW_MIN_ZOOM } from "@/constants/preview-pan-zoom";
import type {
  CameraFrame,
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
  PRESENTATION_ARROW_HEADS,
  PRESENTATION_ARROW_KINDS,
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
    arrowKind: oneOf(value.arrowKind, PRESENTATION_ARROW_KINDS, "straight"),
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
  return {
    id: value.id,
    name: typeof value.name === "string" && value.name.trim() ? value.name : value.id,
    viewpoints,
    transitions: syncedTransitions,
    overlays: overlays.filter((overlay) =>
      overlayOwnerExists(overlay.owner, viewpoints, syncedTransitions),
    ),
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
    };
    const viewpoints = [...track.viewpoints, viewpoint];
    const transitions = syncTransitions(viewpoints, track.transitions);
    return {
      ...track,
      viewpoints,
      transitions,
      overlays: retargetOverlays(track.overlays, viewpoints, transitions),
    };
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
    return {
      ...track,
      viewpoints,
      transitions,
      overlays: retargetOverlays(track.overlays, viewpoints, transitions),
    };
  });
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
    arrowKind: "straight",
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
    overlays: track.overlays.map((overlay) =>
      overlay.id === overlayId ? { ...overlay, ...patch } : overlay,
    ),
  }));
}

export function removeOverlay(
  document: PresentationDocument,
  trackId: string,
  overlayId: string,
): PresentationDocument {
  return mapTrack(document, trackId, (track) => ({
    ...track,
    overlays: track.overlays.filter((overlay) => overlay.id !== overlayId),
  }));
}

export function durationMsToSeconds(durationMs: number): number {
  return Math.round((durationMs / 1000) * 10) / 10;
}

export function durationSecondsToMs(seconds: number): number {
  return clampDuration(Math.round(seconds * 1000), PRESENTATION_DEFAULT_DWELL_MS);
}
