import { enMessages } from "./en/index";

export type LocaleMessages = Record<string, string>;

export type LocaleKey = Extract<keyof typeof enMessages, string>;

export type TranslateFn = (
  key: LocaleKey,
  params?: Record<string, string | number>,
) => string;

export function isLocaleKey(key: string): key is LocaleKey {
  return Object.prototype.hasOwnProperty.call(enMessages, key);
}
