import { describe, expect, it } from "vitest";
import { DEPLOYMENT_API_SAME_ORIGIN } from "@/constants/deployment";
import {
  isImplicitSameOriginApiUrl,
  resolveActiveProfileApiUrl,
  resolveConfiguredLibraryApiUrl,
} from "@/config/library-api";

const PAGE_ORIGIN = "https://puml.example.com";
const PAGE_PROTOCOL = "https:";

describe("resolveConfiguredLibraryApiUrl", () => {
  it("stays local on a static build even when the page is https", () => {
    expect(
      resolveConfiguredLibraryApiUrl({
        storedUrl: null,
        envUrl: "",
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toBe("");
  });

  it("ignores a saved same-origin URL on a static build", () => {
    expect(
      isImplicitSameOriginApiUrl(
        `${PAGE_ORIGIN}/api`,
        "",
        PAGE_ORIGIN,
        PAGE_PROTOCOL,
      ),
    ).toBe(true);

    expect(
      resolveConfiguredLibraryApiUrl({
        storedUrl: `${PAGE_ORIGIN}/api`,
        envUrl: undefined,
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toBe("");
  });

  it("keeps an explicitly saved remote server on a static build", () => {
    expect(
      resolveConfiguredLibraryApiUrl({
        storedUrl: "https://library.example.com",
        envUrl: "",
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toBe("https://library.example.com/api");
  });

  it("uses same-origin when the server build asks for it", () => {
    expect(
      resolveConfiguredLibraryApiUrl({
        storedUrl: null,
        envUrl: DEPLOYMENT_API_SAME_ORIGIN,
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toBe(`${PAGE_ORIGIN}/api`);
  });

  it("uses an absolute API URL from the environment", () => {
    expect(
      resolveConfiguredLibraryApiUrl({
        storedUrl: null,
        envUrl: "https://api.example.com/",
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toBe("https://api.example.com/api");
  });

  it("lets a saved URL override the environment", () => {
    expect(
      resolveConfiguredLibraryApiUrl({
        storedUrl: "https://other.example.com/api",
        envUrl: DEPLOYMENT_API_SAME_ORIGIN,
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toBe("https://other.example.com/api");
  });

  it("does not invent an API URL for file protocol", () => {
    expect(
      resolveConfiguredLibraryApiUrl({
        storedUrl: null,
        envUrl: DEPLOYMENT_API_SAME_ORIGIN,
        pageOrigin: "null",
        pageProtocol: "file:",
      }),
    ).toBe("");
  });
});

describe("resolveActiveProfileApiUrl", () => {
  it("keeps the build default when the profile has no server", () => {
    expect(
      resolveActiveProfileApiUrl("", `${PAGE_ORIGIN}/api`, {
        envUrl: DEPLOYMENT_API_SAME_ORIGIN,
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toBe(`${PAGE_ORIGIN}/api`);
  });

  it("ignores an implicit same-origin profile on a static build", () => {
    expect(
      resolveActiveProfileApiUrl(`${PAGE_ORIGIN}/api`, "https://library.example.com/api", {
        envUrl: "",
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toBe("https://library.example.com/api");
  });

  it("applies a remote profile URL", () => {
    expect(
      resolveActiveProfileApiUrl("https://library.example.com", "", {
        envUrl: "",
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toBe("https://library.example.com/api");
  });
});
