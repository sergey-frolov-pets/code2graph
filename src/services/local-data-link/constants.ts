/** How far «until an empty row» may scan past the first row of the range. */
export const MAX_DATA_LINK_SCAN_ROWS = 5000;

/** Link name in `https://www.code2graph.ru/local/<slug>`. */
export const DATA_LINK_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PUBLIC_DATA_LINK_ORIGIN = "https://www.code2graph.ru";

/** Sample slug in the local-data hint: `https://www.code2graph.ru/local/w`. */
export const DATA_LINK_EXAMPLE_SLUG = "w";

export const DATA_LINK_EXAMPLE_URL = `${PUBLIC_DATA_LINK_ORIGIN}/local/${DATA_LINK_EXAMPLE_SLUG}`;

export const DATA_LINK_CHANGED_EVENT = "code2graph-data-link-changed";

export const DATA_LINK_SETUP_HINT_KEY = "code2graph-data-link-setup-hint";

export const DATA_LINK_SETUP_HINT_EVENT = "code2graph-data-link-setup-hint";
