export class LocalizedAppError extends Error {
  readonly messageKey: string;
  readonly messageParams?: Record<string, string | number>;

  constructor(
    messageKey: string,
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
  t: (key: string, params?: Record<string, string | number>) => string,
  fallbackKey: string,
): string {
  if (error instanceof LocalizedAppError) {
    return t(error.messageKey, error.messageParams);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return t(fallbackKey);
}
