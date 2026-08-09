export function createFetchTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }

  const controller = new AbortController();
  const schedule =
    typeof window !== "undefined"
      ? window.setTimeout.bind(window)
      : setTimeout;
  const clear =
    typeof window !== "undefined"
      ? window.clearTimeout.bind(window)
      : clearTimeout;

  const timerId = schedule(() => controller.abort(), timeoutMs);
  controller.signal.addEventListener(
    "abort",
    () => clear(timerId),
    { once: true },
  );

  return controller.signal;
}
