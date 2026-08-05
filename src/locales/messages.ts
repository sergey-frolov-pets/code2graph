import type { AppLocale } from "@/constants/i18n";
import { enMessages } from "./en";
import { ruMessages } from "./ru";
import type { LocaleMessages } from "./types";

export type { LocaleMessages } from "./types";

export { ruMessages, enMessages };

export const messagesByLocale: Record<AppLocale, LocaleMessages> = {
  ru: ruMessages,
  en: enMessages,
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
