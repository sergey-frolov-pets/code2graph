/** How far «until an empty row» may scan past the first row of the range. */
export const MAX_DATA_LINK_SCAN_ROWS = 5000;

/** Link name in `#/diagram/<slug>`. */
export const DATA_LINK_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const DIAGRAM_DATA_LINK_ROUTE = /^diagram\/([a-z0-9]+(?:-[a-z0-9]+)*)$/;

export const DATA_LINK_CHANGED_EVENT = "code2graph-data-link-changed";

export const DATA_LINK_SETUP_HINT_KEY = "code2graph-data-link-setup-hint";

export const DATA_LINK_SETUP_HINT_EVENT = "code2graph-data-link-setup-hint";
