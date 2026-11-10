import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getLibraryApiBaseUrl = vi.fn(() => "");

vi.mock("@/config/library-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/library-api")>();
  return {
    ...actual,
    getLibraryApiBaseUrl: () => getLibraryApiBaseUrl(),
  };
});

import {
  isLlmProxyConfigured,
  resolveLlmChatUrl,
  resolveLlmProxyBaseUrl,
} from "@/utils/llm-proxy";

describe("resolveLlmProxyBaseUrl", () => {
  beforeEach(() => {
    getLibraryApiBaseUrl.mockReturnValue("");
    vi.stubGlobal("window", {
      location: {
        protocol: "https:",
        href: "https://puml.example.com/app/",
      },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("uses library API URL when configured", () => {
    getLibraryApiBaseUrl.mockReturnValue("https://api.example.com/api");

    expect(resolveLlmProxyBaseUrl()).toBe("https://api.example.com/api");
    expect(isLlmProxyConfigured()).toBe(true);
    expect(resolveLlmChatUrl()).toBe("https://api.example.com/api/llm/chat");
  });

  it("does not fall back to same-origin /api in production", () => {
    vi.stubEnv("DEV", false);
    vi.stubEnv("VITE_API_BASE_URL", "");

    expect(resolveLlmProxyBaseUrl()).toBe("");
    expect(isLlmProxyConfigured()).toBe(false);
    expect(resolveLlmChatUrl()).toBe("");
  });

  it("stays empty in dev when the resolved library URL is empty", () => {
    vi.stubEnv("DEV", true);
    vi.stubEnv("VITE_API_BASE_URL", "");

    expect(resolveLlmProxyBaseUrl()).toBe("");
    expect(isLlmProxyConfigured()).toBe(false);
    expect(resolveLlmChatUrl()).toBe("");
  });
});
