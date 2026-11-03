/** Minimum zoom level (no maximum limit). */
export const PREVIEW_MIN_ZOOM = 0.05;

/** Multiplicative zoom step for buttons and discrete mouse wheel ticks. */
export const PREVIEW_ZOOM_STEP = 1.15;

/** Wheel zoom sensitivity multiplier for `exp(-deltaY * sensitivity)`. */
export const PREVIEW_ZOOM_SENSITIVITY = 0.006;

/** Pixels per line when normalizing `WheelEvent.deltaMode`. */
export const PREVIEW_WHEEL_LINE_PIXELS = 16;

/** Fraction of the viewport used when fitting the diagram on load. */
export const PREVIEW_FIT_MARGIN_RATIO = 0.95;

/** Maximum delay between taps to treat as double-tap fit gesture. */
export const PREVIEW_DOUBLE_TAP_MS = 300;
