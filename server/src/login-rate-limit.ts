import {
  LOGIN_LOCKOUT_MS,
  LOGIN_MAX_ATTEMPTS,
  LOGIN_WINDOW_MS,
} from "./config.js";

/**
 * In-memory brute-force protection for login / setup / register.
 *
 * Keyed by client IP + username so one attacker cannot lock out everyone,
 * and a distributed attack on one account is still throttled per IP.
 * State is per-process; a restart clears it (acceptable for one instance).
 */
interface AttemptEntry {
  failures: number;
  windowStartMs: number;
  lockedUntilMs: number;
}

const attempts = new Map<string, AttemptEntry>();

const MAX_TRACKED_KEYS = 10_000;

function sweep(now: number): void {
  if (attempts.size < MAX_TRACKED_KEYS) {
    return;
  }

  for (const [key, entry] of attempts) {
    if (entry.lockedUntilMs <= now && now - entry.windowStartMs >= LOGIN_WINDOW_MS) {
      attempts.delete(key);
    }
  }
}

export function buildLoginAttemptKey(ip: string, username: string): string {
  return `${ip}::${username.trim().toLowerCase()}`;
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return headers.get("x-real-ip") ?? "unknown";
}

export interface LoginAttemptState {
  blocked: boolean;
  retryAfterSeconds: number;
}

export function checkLoginAttempt(key: string, now = Date.now()): LoginAttemptState {
  const entry = attempts.get(key);
  if (!entry) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  if (entry.lockedUntilMs > now) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((entry.lockedUntilMs - now) / 1000),
    };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

export function recordLoginFailure(key: string, now = Date.now()): LoginAttemptState {
  sweep(now);

  const entry = attempts.get(key);
  if (!entry || now - entry.windowStartMs >= LOGIN_WINDOW_MS) {
    attempts.set(key, { failures: 1, windowStartMs: now, lockedUntilMs: 0 });
    return { blocked: false, retryAfterSeconds: 0 };
  }

  entry.failures += 1;

  if (entry.failures >= LOGIN_MAX_ATTEMPTS) {
    entry.lockedUntilMs = now + LOGIN_LOCKOUT_MS;
    entry.failures = 0;
    entry.windowStartMs = now;
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil(LOGIN_LOCKOUT_MS / 1000),
    };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

export function clearLoginAttempts(key: string): void {
  attempts.delete(key);
}

/** Test helper: drop all tracked counters. */
export function resetLoginAttemptsForTests(): void {
  attempts.clear();
}
