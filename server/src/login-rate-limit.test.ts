import { beforeEach, describe, expect, it } from "vitest";
import {
  buildLoginAttemptKey,
  checkLoginAttempt,
  clearLoginAttempts,
  recordLoginFailure,
  resetLoginAttemptsForTests,
} from "./login-rate-limit.js";
import { LOGIN_LOCKOUT_MS, LOGIN_MAX_ATTEMPTS } from "./config.js";

describe("login rate limit", () => {
  beforeEach(() => {
    resetLoginAttemptsForTests();
  });

  it("does not block before the attempt limit", () => {
    const key = buildLoginAttemptKey("10.0.0.1", "alice");

    for (let i = 0; i < LOGIN_MAX_ATTEMPTS - 1; i += 1) {
      expect(recordLoginFailure(key).blocked).toBe(false);
    }

    expect(checkLoginAttempt(key).blocked).toBe(false);
  });

  it("locks out after the attempt limit", () => {
    const key = buildLoginAttemptKey("10.0.0.1", "alice");

    let last = { blocked: false, retryAfterSeconds: 0 };
    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i += 1) {
      last = recordLoginFailure(key);
    }

    expect(last.blocked).toBe(true);
    expect(checkLoginAttempt(key).blocked).toBe(true);
  });

  it("unlocks after the lockout window", () => {
    const key = buildLoginAttemptKey("10.0.0.1", "alice");
    const now = Date.now();

    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i += 1) {
      recordLoginFailure(key, now);
    }

    expect(checkLoginAttempt(key, now).blocked).toBe(true);
    expect(checkLoginAttempt(key, now + LOGIN_LOCKOUT_MS + 1).blocked).toBe(false);
  });

  it("keeps counters per ip and username", () => {
    const alice = buildLoginAttemptKey("10.0.0.1", "alice");
    const bob = buildLoginAttemptKey("10.0.0.1", "bob");

    for (let i = 0; i < LOGIN_MAX_ATTEMPTS; i += 1) {
      recordLoginFailure(alice);
    }

    expect(checkLoginAttempt(alice).blocked).toBe(true);
    expect(checkLoginAttempt(bob).blocked).toBe(false);
  });

  it("clears counters after a successful login", () => {
    const key = buildLoginAttemptKey("10.0.0.1", "alice");

    recordLoginFailure(key);
    recordLoginFailure(key);
    clearLoginAttempts(key);

    expect(checkLoginAttempt(key).blocked).toBe(false);
    expect(recordLoginFailure(key).blocked).toBe(false);
  });
});
