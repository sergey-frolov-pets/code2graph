import { describe, expect, it } from "vitest";
import {
  addEffect,
  addOverlay,
  addTrack,
  captureViewpoint,
  createPresentation,
  duplicateTrack,
  setTransitionPath,
  setTransitionPoints,
} from "@/services/presentation/model";
import type { PresentationDocument } from "@/services/presentation/types";

function sourceTrack(document: PresentationDocument, trackId: string) {
  const track = document.tracks.find((item) => item.id === trackId);
  if (!track) {
    throw new Error("fixture");
  }
  return track;
}

function tourWithNeighbors() {
  const created = createPresentation("Tour");
  const first = captureViewpoint(created, created.activeTrackId, {
    anchorX: 0.2,
    anchorY: 0.3,
    scale: 1,
  });
  const second = captureViewpoint(first, first.activeTrackId, {
    anchorX: 0.8,
    anchorY: 0.7,
    scale: 2,
  });
  return addTrack(second, "Other");
}

describe("duplicateTrack", () => {
  it("inserts an independent copy after the source and makes it active", () => {
    const document = tourWithNeighbors();
    const source = document.tracks[0];
    const viewpoint = source.viewpoints[0];
    const transition = source.transitions[0];
    if (!viewpoint || !transition) {
      throw new Error("fixture");
    }

    const withViewpointOverlay = addOverlay(
      document,
      source.id,
      { kind: "viewpoint", id: viewpoint.id },
      "text",
    );
    const viewpointOverlayId = sourceTrack(withViewpointOverlay, source.id).overlays[0]?.id ?? "";
    const withTransitionOverlay = addOverlay(
      withViewpointOverlay,
      source.id,
      { kind: "transition", id: transition.id },
      "arrow",
    );
    const transitionOverlayId = sourceTrack(withTransitionOverlay, source.id).overlays.find(
      (overlay) => overlay.owner.kind === "transition",
    )?.id ?? "";
    const withEffects = addEffect(
      addEffect(withTransitionOverlay, source.id, viewpoint.id, "diagram"),
      source.id,
      viewpoint.id,
      "overlay",
      viewpointOverlayId,
    );
    const bend = { x: 0.4, y: 0.9 };
    const withPath = setTransitionPoints(
      setTransitionPath(withEffects, source.id, transition.id, "polyline"),
      source.id,
      transition.id,
      [bend],
    );

    const duplicated = duplicateTrack(withPath, source.id, "  Tour copy  ");
    const copy = duplicated.tracks[1];
    const original = duplicated.tracks[0];

    expect(duplicated.activeTrackId).toBe(copy?.id);
    expect(duplicated.tracks.map((track) => track.name)).toEqual(["Tour", "Tour copy", "Other"]);
    expect(copy?.id).not.toBe(source.id);
    expect(original.viewpoints.map((item) => item.id)).toEqual(source.viewpoints.map((item) => item.id));

    expect(copy?.viewpoints).toHaveLength(source.viewpoints.length);
    expect(copy?.viewpoints.map((item) => item.anchor)).toEqual(source.viewpoints.map((item) => item.anchor));
    expect(copy?.viewpoints[0]?.anchor).not.toBe(original.viewpoints[0]?.anchor);
    expect(copy?.viewpoints.every((item) => !source.viewpoints.some((origin) => origin.id === item.id))).toBe(true);

    const copiedTransition = copy?.transitions[0];
    expect(copiedTransition?.fromId).toBe(copy?.viewpoints[0]?.id);
    expect(copiedTransition?.toId).toBe(copy?.viewpoints[1]?.id);
    expect(copiedTransition?.points).toEqual([bend]);
    expect(copiedTransition?.points[0]).not.toBe(original.transitions[0]?.points[0]);
    expect(copiedTransition?.id).not.toBe(transition.id);

    const copiedViewpointOverlay = copy?.overlays.find((overlay) => overlay.owner.kind === "viewpoint");
    const copiedTransitionOverlay = copy?.overlays.find((overlay) => overlay.owner.kind === "transition");
    expect(copiedViewpointOverlay?.owner.id).toBe(copy?.viewpoints[0]?.id);
    expect(copiedTransitionOverlay?.owner.id).toBe(copiedTransition?.id);
    expect(copiedViewpointOverlay?.id).not.toBe(viewpointOverlayId);
    expect(copiedTransitionOverlay?.id).not.toBe(transitionOverlayId);

    const copiedEffects = copy?.viewpoints[0]?.effects ?? [];
    expect(copiedEffects).toHaveLength(2);
    expect(copiedEffects.map((effect) => effect.id)).not.toEqual(
      original.viewpoints[0]?.effects.map((effect) => effect.id),
    );
    expect(copiedEffects.find((effect) => effect.target === "overlay")?.overlayId).toBe(
      copiedViewpointOverlay?.id,
    );
    expect(original.overlays.map((overlay) => overlay.id)).toEqual([
      viewpointOverlayId,
      transitionOverlayId,
    ]);
  });

  it("keeps the source name when the copy name is blank and ignores an unknown track", () => {
    const document = createPresentation("Tour");
    const same = duplicateTrack(document, "missing", "Copy");
    expect(same).toBe(document);

    const copy = duplicateTrack(document, document.activeTrackId, "   ");
    expect(copy.tracks.map((track) => track.name)).toEqual(["Tour", "Tour"]);
    expect(copy.activeTrackId).toBe(copy.tracks[1]?.id);
  });
});
