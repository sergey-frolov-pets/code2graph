import type { AppLocale } from "@/constants/i18n";
import type { LocaleKey } from "@/locales/types";

/**
 * Short public cheat sheet for the language page.
 * Types are the diagrams a reader meets first. Keywords are the words
 * inside those diagrams, each with a snippet that can be pasted.
 */

export interface LocalizedExample {
  readonly ru: string;
  readonly en: string;
}

export interface LanguagePrimerType {
  readonly id: string;
  readonly titleKey: LocaleKey;
  readonly summaryKey: LocaleKey;
  /** Одна строка: ключевые слова этого типа и как их писать. */
  readonly syntaxKey: LocaleKey;
  readonly example: LocalizedExample;
}

export interface LanguagePrimerKeyword {
  readonly id: string;
  readonly token: string;
  readonly hintKey: LocaleKey;
  readonly example: LocalizedExample;
}

export interface LanguagePrimer {
  readonly types: readonly LanguagePrimerType[];
  readonly keywords: readonly LanguagePrimerKeyword[];
  /**
   * Типы расширения (Mermaid Ext): на странице языка идут отдельным
   * разделом, чтобы не смешиваться со штатными типами языка.
   */
  readonly extTypes?: readonly LanguagePrimerType[];
}

export function lines(...rows: readonly string[]): string {
  return rows.join("\n");
}

export function same(text: string): LocalizedExample {
  return { ru: text, en: text };
}

export function both(ru: string, en: string): LocalizedExample {
  return { ru, en };
}

export function primerExample(
  snippet: LocalizedExample,
  locale: AppLocale,
): string {
  return snippet[locale];
}
