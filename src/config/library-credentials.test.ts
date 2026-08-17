/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLibraryApiCredentials,
  getLibraryAuthToken,
  setLibraryAuthToken,
  setRememberLogin,
} from "@/config/library-credentials";
import { STORAGE_KEY_LIBRARY_AUTH_TOKEN } from "@/constants/diagram-library";

describe("library-credentials remember login", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearLibraryApiCredentials();
  });

  it("stores token in localStorage when remember is enabled", () => {
    setRememberLogin(true);
    setLibraryAuthToken("token-local");
    expect(getLibraryAuthToken()).toBe("token-local");
    expect(localStorage.getItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN)).toBe("token-local");
    expect(sessionStorage.getItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN)).toBeNull();
  });

  it("stores token in sessionStorage when remember is disabled", () => {
    setRememberLogin(false);
    setLibraryAuthToken("token-session");
    expect(getLibraryAuthToken()).toBe("token-session");
    expect(sessionStorage.getItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN)).toBe("token-session");
    expect(localStorage.getItem(STORAGE_KEY_LIBRARY_AUTH_TOKEN)).toBeNull();
  });
});
