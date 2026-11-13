/** Marker that opens a presentation block inside a diagram comment. */
export const PRESENTATION_MARKER = "@c2g-presentation";

/** Marker of a dropped picture used as the diagram frame. */
export const FRAME_MARKER = "@c2g-frame";

/** Largest picture accepted as a diagram frame. */
export const FRAME_MAX_BYTES = 4_000_000;

/** Default length of a new picture or overlay effect. */
export const FRAME_EFFECT_DEFAULT_MS = 1000;

/** Extra scale at the peak of a pulse. */
export const FRAME_EFFECT_PULSE_AMOUNT = 0.06;

/** Extra scale at the end of a zoom. */
export const FRAME_EFFECT_ZOOM_AMOUNT = 0.12;

/** How far a fly effect travels, as a fraction of the target size. */
export const FRAME_EFFECT_FLY_DISTANCE = 1.1;

/** Teeth along one edge of a paper tear. */
export const FRAME_EFFECT_TEAR_TEETH = 8;

/** Jag height of a paper tear, as a fraction of the target height. */
export const FRAME_EFFECT_TEAR_AMPLITUDE = 0.045;

/** Starting turn of a spin, in degrees. */
export const FRAME_EFFECT_SPIN_DEGREES = 90;

/** Opacity at the start of a spin. The effect ends fully visible. */
export const FRAME_EFFECT_SPIN_MIN_OPACITY = 0.35;

/** Scale at the start of a pop. */
export const FRAME_EFFECT_POP_START = 0.2;

/** Extra scale at the middle of a pop. The effect ends at scale 1. */
export const FRAME_EFFECT_POP_OVERSHOOT = 0.45;

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

/** Default horizontal place of a bubble tip, as a fraction of the body width. */
export const PRESENTATION_DEFAULT_TAIL_X = 0.08;

/** How far a bubble tip may sit outside the body, in body widths or heights. */
export const PRESENTATION_TAIL_LIMIT = 4;

/** Tail length as a fraction of the shorter side of a bubble body. */
export const PRESENTATION_CALLOUT_TAIL_RATIO = 0.34;

/** Smallest width or height a resized overlay may keep, as a fraction of the image. */
export const PRESENTATION_MIN_OVERLAY_SIZE = 0.012;

export const PRESENTATION_RESIZE_HANDLE = 10;

export const PRESENTATION_RESIZE_HANDLE_COARSE = 18;

/** Shape arrows and the pointing hand turn by this many degrees. */
export const PRESENTATION_ROTATION_STEP = 45;

export const PRESENTATION_FULL_CIRCLE = 360;

/** Degrees in a half turn. Dividing by this converts degrees to radians with π. */
export const PRESENTATION_HALF_CIRCLE = 180;

/** Perpendicular offset used to seed curve handles, in normalized image space. */
export const PRESENTATION_CURVE_OFFSET = 0.08;

/** Time between samples while a transition is written into a GIF. */
export const PRESENTATION_GIF_FRAME_MS = 100;

/** Longest side of an exported GIF, in pixels. */
export const PRESENTATION_GIF_MAX_SIDE = 960;

/** GIF frame delay is stored in centiseconds and cannot exceed this value. */
export const PRESENTATION_GIF_MAX_DELAY_CS = 65_535;

/** Milliseconds in one GIF centisecond. gifenc writes round(delay / this) into the file. */
export const PRESENTATION_GIF_CENTISECOND_MS = 10;

/** Colors kept in each GIF frame palette. */
export const PRESENTATION_GIF_PALETTE_SIZE = 256;

export const PRESENTATION_GIF_FALLBACK_BACKGROUND = "#ffffff";

/** Smallest note text, in pixels. */
export const PRESENTATION_OVERLAY_TEXT_MIN_PX = 12;

/** Largest note text, in pixels. */
export const PRESENTATION_OVERLAY_TEXT_MAX_PX = 28;

/** Note text size as a fraction of the overlay height. */
export const PRESENTATION_OVERLAY_TEXT_HEIGHT_RATIO = 0.45;

/** Line box of note text, as a multiple of the font size. */
export const PRESENTATION_OVERLAY_TEXT_LINE_HEIGHT = 1.2;

/** Rows in the note text field when a text overlay is edited. */
export const PRESENTATION_NOTE_TEXT_ROWS = 3;
