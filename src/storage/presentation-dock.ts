import { readStorageJson, writeStorageJson } from "@/core/safe-storage";

export const STORAGE_KEY_PRESENTATION_DOCK_POSITION =
  "code2graph-presentation-dock-position";

/** Positions are viewport coordinates, not offsets inside the preview frame. */
const PRESENTATION_DOCK_POSITION_SPACE = "window";

/** Gap kept between the presentation panel and the application window. */
export const PRESENTATION_DOCK_MARGIN = 8;

/**
 * Above the status bar (910) and the fullscreen panels (900), below modals (1000).
 */
export const PRESENTATION_DOCK_Z_INDEX = 950;

/** Effect menu is portaled to the document, so it must paint over the dock. */
export const PRESENTATION_EFFECT_MENU_Z_INDEX = PRESENTATION_DOCK_Z_INDEX + 1;

export interface PresentationDockPosition {
  x: number;
  y: number;
}

export function loadPresentationDockPosition(): PresentationDockPosition | null {
  return readStorageJson(STORAGE_KEY_PRESENTATION_DOCK_POSITION, (parsed) => {
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    if (
      record.space !== PRESENTATION_DOCK_POSITION_SPACE ||
      typeof record.x !== "number" ||
      typeof record.y !== "number" ||
      !Number.isFinite(record.x) ||
      !Number.isFinite(record.y)
    ) {
      return null;
    }

    return { x: record.x, y: record.y };
  });
}

export function savePresentationDockPosition(position: PresentationDockPosition): void {
  writeStorageJson(STORAGE_KEY_PRESENTATION_DOCK_POSITION, {
    ...position,
    space: PRESENTATION_DOCK_POSITION_SPACE,
  });
}

export function clampPresentationDockPosition(
  position: PresentationDockPosition,
  panelWidth: number,
  panelHeight: number,
  containerWidth: number,
  containerHeight: number,
  margin = PRESENTATION_DOCK_MARGIN,
): PresentationDockPosition {
  const maxX = Math.max(margin, containerWidth - panelWidth - margin);
  const maxY = Math.max(margin, containerHeight - panelHeight - margin);

  return {
    x: Math.min(Math.max(margin, position.x), maxX),
    y: Math.min(Math.max(margin, position.y), maxY),
  };
}
