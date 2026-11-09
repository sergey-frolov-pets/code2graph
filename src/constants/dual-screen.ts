/** Канал синхронизации вкладки кода и вкладки превью. */
export const DUAL_SCREEN_CHANNEL_NAME = "code2graph-dual-screen";

/** Имя окна: повторное открытие фокусирует уже существующую вкладку. */
export const DUAL_SCREEN_WINDOW_NAME = "code2graph-preview";

/** Как часто вкладки проверяют, что вторая сторона ещё жива. */
export const DUAL_SCREEN_HEARTBEAT_MS = 2000;

/** Сколько ответов подряд можно пропустить, прежде чем сессия считается потерянной. */
export const DUAL_SCREEN_MISSED_PONG_LIMIT = 3;

const SESSION_ID_PATTERN = /^[a-z0-9-]+$/;

export function createDualScreenSessionId(): string {
  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `s${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
  return generated.toLowerCase();
}

export function isDualScreenSessionId(value: string): boolean {
  return SESSION_ID_PATTERN.test(value);
}

export function dualScreenPreviewHref(sessionId: string): string {
  return `${window.location.pathname}${window.location.search}#/preview/${sessionId}`;
}
