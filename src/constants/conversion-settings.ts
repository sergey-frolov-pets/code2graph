export const CONVERSION_IR_VERSION = 1 as const;

export const SVG_METADATA_ID = "code2graph-ir";
/** Legacy vuePlantUML exports before Code2Graph rename. */
export const LEGACY_SVG_METADATA_ID = "vueplantuml-ir";

export const SVG_METADATA_ENCODING_PLAIN = "base64" as const;

export const SVG_METADATA_ENCODING_GZIP = "gzip-base64" as const;

export type SvgMetadataEncoding =
  | typeof SVG_METADATA_ENCODING_PLAIN
  | typeof SVG_METADATA_ENCODING_GZIP;

export const CONVERSION_MAX_NODES = 200;

export const CONVERSION_MAX_EDGES = 400;

export const MERGE_CONFIDENCE_THRESHOLD = 0.5;

export const MERGE_LABEL_FUZZY_MAX_DISTANCE = 2;
