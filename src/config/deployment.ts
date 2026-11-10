import { DEPLOYMENT_API_SAME_ORIGIN_ALIASES } from "@/constants/deployment";

export const DEPLOYMENT_CONFIG_FILE = "deployment.json";

export type DeploymentMode = "static" | "server";

/** Where the active API address came from. */
export type ApiConfigSource = "manual" | "deployment-file" | "build" | "none";

export interface DeploymentFile {
  apiBaseUrl: string;
  publicOrigin: string;
}

export interface DeploymentResolutionInput {
  storedUrl: string | null;
  /** null — файла нет; пустая строка — файл есть, сервер не задан. */
  deploymentApiUrl: string | null;
  envUrl: string | undefined;
  pageOrigin: string;
  pageProtocol: string;
}

export interface DeploymentResolution {
  mode: DeploymentMode;
  apiBaseUrl: string;
  source: ApiConfigSource;
}

export function normalizeLibraryApiUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  let url = trimmed.replace(/\/+$/, "");
  if (!url.endsWith("/api")) {
    url = `${url}/api`;
  }

  return url;
}

export function isSameOriginApiSetting(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (DEPLOYMENT_API_SAME_ORIGIN_ALIASES as readonly string[]).includes(
    normalized,
  );
}

export function isStaticDeployment(envUrl: string | undefined): boolean {
  return (envUrl?.trim() ?? "") === "";
}

/**
 * На статической сборке адрес того же хоста не считается настроенным сервером.
 * Раньше он подставлялся автоматически и сохранялся в браузере.
 */
export function isImplicitSameOriginApiUrl(
  candidate: string,
  envUrl: string | undefined,
  pageOrigin: string,
  pageProtocol: string,
): boolean {
  if (!isStaticDeployment(envUrl)) {
    return false;
  }

  if (!pageProtocol.startsWith("http") || !pageOrigin.trim() || !candidate.trim()) {
    return false;
  }

  return normalizeLibraryApiUrl(candidate) === normalizeLibraryApiUrl(pageOrigin);
}

function sameOriginApiUrl(pageOrigin: string, pageProtocol: string): string {
  if (!pageProtocol.startsWith("http") || !pageOrigin.trim()) {
    return "";
  }

  return normalizeLibraryApiUrl(pageOrigin);
}

function resolveApiSetting(
  value: string,
  source: Exclude<ApiConfigSource, "none">,
  pageOrigin: string,
  pageProtocol: string,
): DeploymentResolution | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (isSameOriginApiSetting(trimmed) || trimmed === "/api") {
    const apiBaseUrl = sameOriginApiUrl(pageOrigin, pageProtocol);
    if (!apiBaseUrl) {
      return { mode: "static", apiBaseUrl: "", source: "none" };
    }

    return { mode: "server", apiBaseUrl, source };
  }

  const apiBaseUrl = normalizeLibraryApiUrl(trimmed);
  if (!apiBaseUrl) {
    return null;
  }

  return { mode: "server", apiBaseUrl, source };
}

const STATIC_RESOLUTION: DeploymentResolution = {
  mode: "static",
  apiBaseUrl: "",
  source: "none",
};

/**
 * Приоритет: явный адрес из настроек, затем deployment.json, затем сборка.
 * Пустой результат — статический режим без запросов к API.
 */
export function resolveDeployment(
  input: DeploymentResolutionInput,
): DeploymentResolution {
  const envUrl = input.envUrl?.trim() ?? "";

  if (input.storedUrl !== null && input.storedUrl.trim() !== "") {
    if (
      !isImplicitSameOriginApiUrl(
        input.storedUrl,
        envUrl,
        input.pageOrigin,
        input.pageProtocol,
      )
    ) {
      return (
        resolveApiSetting(
          input.storedUrl,
          "manual",
          input.pageOrigin,
          input.pageProtocol,
        ) ?? STATIC_RESOLUTION
      );
    }
  }

  if (input.pageProtocol !== "file:" && input.deploymentApiUrl !== null) {
    const fromFile = resolveApiSetting(
      input.deploymentApiUrl,
      "deployment-file",
      input.pageOrigin,
      input.pageProtocol,
    );
    if (fromFile && fromFile.mode === "server") {
      return fromFile;
    }
  }

  if (envUrl) {
    const fromBuild = resolveApiSetting(
      envUrl,
      "build",
      input.pageOrigin,
      input.pageProtocol,
    );
    if (fromBuild) {
      return fromBuild;
    }
  }

  return STATIC_RESOLUTION;
}

export function parseDeploymentFile(raw: unknown): DeploymentFile | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const apiBaseUrl = typeof record.apiBaseUrl === "string" ? record.apiBaseUrl : "";
  const publicOrigin =
    typeof record.publicOrigin === "string" ? record.publicOrigin.trim() : "";

  return { apiBaseUrl, publicOrigin };
}
