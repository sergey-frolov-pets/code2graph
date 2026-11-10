import type { AppLocale } from "@/constants/i18n";
import { arMessages } from "./ar";
import { deMessages } from "./de";
import { enMessages } from "./en";
import { esMessages } from "./es";
import { hiMessages } from "./hi";
import { jaMessages } from "./ja";
import { ptMessages } from "./pt";
import { ruMessages } from "./ru";
import { zhMessages } from "./zh";
import type { LocaleMessages } from "./types";

export type { LocaleMessages } from "./types";

export {
  arMessages,
  deMessages,
  enMessages,
  esMessages,
  hiMessages,
  jaMessages,
  ptMessages,
  ruMessages,
  zhMessages,
};

export const messagesByLocale: Record<AppLocale, LocaleMessages> = {
  en: enMessages,
  ru: ruMessages,
  es: esMessages,
  zh: zhMessages,
  ja: jaMessages,
  hi: hiMessages,
  pt: ptMessages,
  de: deMessages,
  ar: arMessages,
};

export function formatMessage(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}
