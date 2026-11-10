import { describe, expect, it } from "vitest";
import {
  addEffect,
  addOverlay,
  captureViewpoint,
  createPresentation,
  duplicateViewpoint,
  moveEffect,
  moveViewpoint,
  removeOverlay,
} from "@/services/presentation/model";
import { activeTrack } from "@/services/presentation/model";

function twoPointDocument() {
  const created = createPresentation("Tour");
  const first = captureViewpoint(created, created.activeTrackId, {
    anchorX: 0.2,
    anchorY: 0.2,
    scale: 1,
  });
  return captureViewpoint(first, first.activeTrackId, {
    anchorX: 0.8,
    anchorY: 0.8,
    scale: 2,
  });
}

describe("viewpoint order and effects", () => {
  it("duplicates a viewpoint after the original and keeps its outgoing path on the copy", () => {
    const document = twoPointDocument();
    const track = activeTrack(document);
    const original = track?.viewpoints[0];
    const outgoing = track?.transitions[0];
    if (!track || !original || !outgoing) {
      throw new Error("fixture");
    }
    const withOverlay = addOverlay(
      document,
      track.id,
      { kind: "viewpoint", id: original.id },
      "text",
    );
    const withEffect = addEffect(withOverlay, track.id, original.id, "diagram");
    const duplicated = duplicateViewpoint(withEffect, track.id, original.id);
    const next = activeTrack(duplicated);
    expect(next?.viewpoints.map((viewpoint) => viewpoint.anchor.x)).toEqual([0.2, 0.2, 0.8]);
    const copy = next?.viewpoints[1];
    expect(copy?.id).not.toBe(original.id);
    expect(copy?.effects).toHaveLength(1);
    expect(copy?.effects[0]?.id).not.toBe(next?.viewpoints[0]?.effects[0]?.id);
    expect(next?.transitions.find((transition) => transition.id === outgoing.id)?.fromId).toBe(
      copy?.id,
    );
    expect(next?.transitions.some((transition) => transition.fromId === original.id && transition.toId === copy?.id)).toBe(true);
    expect(next?.overlays.filter((overlay) => overlay.owner.kind === "viewpoint")).toHaveLength(2);
  });

  it("swaps neighboring viewpoints and effect start times", () => {
    const document = twoPointDocument();
    const track = activeTrack(document);
    const first = track?.viewpoints[0];
    if (!track || !first) {
      throw new Error("fixture");
    }
    const withFirst = addEffect(document, track.id, first.id, "diagram");
    const withSecond = addEffect(withFirst, track.id, first.id, "frame");
    const edited = activeTrack(withSecond);
    const [earlier, later] = edited?.viewpoints[0]?.effects ?? [];
    if (!earlier || !later) {
      throw new Error("effects");
    }
    const movedEffects = moveEffect(withSecond, track.id, first.id, later.id, -1);
    const swapped = activeTrack(movedEffects)?.viewpoints[0]?.effects ?? [];
    expect(swapped.map((effect) => effect.id)).toEqual([later.id, earlier.id]);
    expect(swapped[0]?.startMs).toBe(earlier.startMs);
    expect(swapped[1]?.startMs).toBe(later.startMs);

    const reordered = moveViewpoint(movedEffects, track.id, first.id, 1);
    expect(activeTrack(reordered)?.viewpoints.map((viewpoint) => viewpoint.id)).toEqual([
      track.viewpoints[1].id,
      first.id,
    ]);
  });

  it("drops an effect when its overlay is deleted", () => {
    const document = twoPointDocument();
    const track = activeTrack(document);
    const viewpoint = track?.viewpoints[0];
    if (!track || !viewpoint) {
      throw new Error("fixture");
    }
    const withOverlay = addOverlay(document, track.id, { kind: "viewpoint", id: viewpoint.id }, "arrow");
    const overlayId = activeTrack(withOverlay)?.overlays[0]?.id ?? "";
    const withEffect = addEffect(withOverlay, track.id, viewpoint.id, "overlay", overlayId);
    const removed = removeOverlay(withEffect, track.id, overlayId);
    expect(activeTrack(removed)?.viewpoints[0]?.effects).toEqual([]);
  });
});
