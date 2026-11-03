import type { LocaleKey, TranslateFn } from "@/locales/types";

export class LocalizedAppError extends Error {
  readonly messageKey: LocaleKey;
  readonly messageParams?: Record<string, string | number>;

  constructor(
    messageKey: LocaleKey,
    messageParams?: Record<string, string | number>,
  ) {
    super(messageKey);
    this.name = "LocalizedAppError";
    this.messageKey = messageKey;
    this.messageParams = messageParams;
  }
}

export function resolveLocalizedErrorMessage(
  error: unknown,
  t: TranslateFn,
  fallbackKey: LocaleKey,
): string {
  if (error instanceof LocalizedAppError) {
    return t(error.messageKey, error.messageParams);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return t(fallbackKey);
}
