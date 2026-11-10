import { describe, expect, it } from "vitest";
import { DEPLOYMENT_API_SAME_ORIGIN } from "@/constants/deployment";
import {
  isImplicitSameOriginApiUrl,
  parseDeploymentFile,
  resolveDeployment,
} from "@/config/deployment";

const PAGE_ORIGIN = "https://puml.example.com";
const PAGE_PROTOCOL = "https:";

describe("resolveDeployment", () => {
  it("stays static when nothing configures an API", () => {
    expect(
      resolveDeployment({
        storedUrl: null,
        deploymentApiUrl: null,
        envUrl: "",
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toEqual({ mode: "static", apiBaseUrl: "", source: "none" });
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
      resolveDeployment({
        storedUrl: `${PAGE_ORIGIN}/api`,
        deploymentApiUrl: null,
        envUrl: "",
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }).apiBaseUrl,
    ).toBe("");
  });

  it("keeps an explicitly saved remote server ahead of the deployment file", () => {
    expect(
      resolveDeployment({
        storedUrl: "https://library.example.com",
        deploymentApiUrl: "/api",
        envUrl: "",
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toEqual({
      mode: "server",
      apiBaseUrl: "https://library.example.com/api",
      source: "manual",
    });
  });

  it("uses deployment.json when the user has not saved a server", () => {
    expect(
      resolveDeployment({
        storedUrl: null,
        deploymentApiUrl: "/api",
        envUrl: "",
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toEqual({
      mode: "server",
      apiBaseUrl: `${PAGE_ORIGIN}/api`,
      source: "deployment-file",
    });
  });

  it("falls back to the build after an empty deployment file", () => {
    expect(
      resolveDeployment({
        storedUrl: null,
        deploymentApiUrl: "",
        envUrl: DEPLOYMENT_API_SAME_ORIGIN,
        pageOrigin: PAGE_ORIGIN,
        pageProtocol: PAGE_PROTOCOL,
      }),
    ).toEqual({
      mode: "server",
      apiBaseUrl: `${PAGE_ORIGIN}/api`,
      source: "build",
    });
  });

  it("ignores deployment.json on the file protocol", () => {
    expect(
      resolveDeployment({
        storedUrl: null,
        deploymentApiUrl: "https://library.example.com",
        envUrl: "",
        pageOrigin: "null",
        pageProtocol: "file:",
      }),
    ).toEqual({ mode: "static", apiBaseUrl: "", source: "none" });
  });

  it("does not invent an API URL for a same-origin build opened as a file", () => {
    expect(
      resolveDeployment({
        storedUrl: null,
        deploymentApiUrl: null,
        envUrl: DEPLOYMENT_API_SAME_ORIGIN,
        pageOrigin: "null",
        pageProtocol: "file:",
      }).apiBaseUrl,
    ).toBe("");
  });
});

describe("parseDeploymentFile", () => {
  it("reads api and public origin", () => {
    expect(
      parseDeploymentFile({
        apiBaseUrl: "/api",
        publicOrigin: "https://diagrams.example.com",
      }),
    ).toEqual({
      apiBaseUrl: "/api",
      publicOrigin: "https://diagrams.example.com",
    });
  });

  it("rejects non-objects", () => {
    expect(parseDeploymentFile(null)).toBeNull();
    expect(parseDeploymentFile("api")).toBeNull();
  });
});
