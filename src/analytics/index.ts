export {
  diagramAnalyticsKind,
  resolveDiagramTypeSlug,
  resolveTypedDiagramKind,
  trackClipboardImageCopy,
  trackClipboardPaste,
  trackDiagramExport,
  trackDiagramOpen,
} from "./diagram-type";
export {
  resolveOpenKind,
  trackEvent,
  trackOpen,
  trackPageview,
  trackSave,
} from "./goatcounter";
export {
  DEFAULT_GOATCOUNTER_ORIGIN,
  isAnalyticsEnabled,
  resolveGoatCounterCountUrl,
  resolveGoatCounterOrigin,
} from "./config";
export type { GoatCounterApi, GoatCounterCountOptions } from "./goatcounter";
