import type { AppLocale } from "@/constants/i18n";

/** Localized example sources for one diagram language. */
export interface SampleCatalog {
  readonly ids: readonly string[];
  getSource(id: string, locale: AppLocale): string;
  findId(source: string, locale: AppLocale): string | null;
  isSampleSource(source: string): boolean;
}
