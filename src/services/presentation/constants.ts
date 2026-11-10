/** Marker that opens a presentation block inside a diagram comment. */
export const PRESENTATION_MARKER = "@c2g-presentation";

export const PRESENTATION_SCHEMA_VERSION = 1;

/** How long the camera stays on a new viewpoint. */
export const PRESENTATION_DEFAULT_DWELL_MS = 2000;

/** How long a new transition takes. */
export const PRESENTATION_DEFAULT_TRANSITION_MS = 1500;

export const PRESENTATION_MIN_DURATION_MS = 100;

export const PRESENTATION_MAX_DURATION_MS = 120_000;

/** Upper bound for a stored camera scale. */
export const PRESENTATION_MAX_SCALE = 64;

/** Touch devices keep the preview chrome visible after a tap. */
export const PRESENTATION_CHROME_REVEAL_MS = 3000;

export const PRESENTATION_HANDLE_RADIUS = 7;

export const PRESENTATION_HANDLE_RADIUS_COARSE = 14;

export const PRESENTATION_OVERLAY_WIDTH = 0.22;

export const PRESENTATION_OVERLAY_HEIGHT = 0.14;

/** Perpendicular offset used to seed curve handles, in normalized image space. */
export const PRESENTATION_CURVE_OFFSET = 0.08;
