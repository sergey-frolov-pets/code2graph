import type {
  CreateDiagramPayload,
  CreateSectionPayload,
  DiagramDto,
  DiagramListItemDto,
  DiagramRatingDto,
  DiagramSortOption,
  DiagramVersionDto,
  LibraryUserDto,
  RatingsLeaderboardDto,
  SectionAccessDto,
  SectionAccessPermission,
  SectionDto,
  ShareLinkDto,
  SharePermission,
  UpdateDiagramPayload,
  UpdateSectionPayload,
} from "@/constants/diagram-library";
import { getLibraryApiBaseUrl } from "@/config/library-api";
import { buildLibraryAuthHeader } from "@/config/library-credentials";

export class DiagramApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DiagramApiError";
    this.status = status;
  }
}

function resolveApiBaseUrl(baseUrl?: string): string {
  const resolved = baseUrl ?? getLibraryApiBaseUrl();
  if (!resolved) {
    throw new DiagramApiError("Library server is not configured", 0);
  }

  return resolved;
}

function buildRequestHeaders(init?: RequestInit): Headers {
  const headers = new Headers(init?.headers);
  const authHeader = buildLibraryAuthHeader();

  for (const [name, value] of Object.entries(authHeader)) {
    headers.set(name, value);
  }

  return headers;
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    if (data.error) {
      return data.error;
    }
  } catch {
    // ignore
  }

  return `HTTP ${response.status}`;
}

async function requestJsonPublic<T>(
  path: string,
  init?: RequestInit,
  baseUrl?: string,
): Promise<T> {
  const apiBaseUrl = resolveApiBaseUrl(baseUrl);
  const response = await fetch(`${apiBaseUrl}${path}`, init);

  if (!response.ok) {
    throw new DiagramApiError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
  baseUrl?: string,
): Promise<T> {
  const apiBaseUrl = resolveApiBaseUrl(baseUrl);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: buildRequestHeaders(init),
  });

  if (!response.ok) {
    throw new DiagramApiError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function fetchSections(
  baseUrl?: string,
): Promise<{
  sections: SectionDto[];
  flat: SectionDto[];
}> {
  return requestJson("/sections", undefined, baseUrl);
}

export async function createSection(
  payload: CreateSectionPayload,
  baseUrl?: string,
): Promise<SectionDto> {
  return requestJson(
    "/sections",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function deleteSection(
  sectionId: string,
  baseUrl?: string,
): Promise<void> {
  await requestJson(`/sections/${sectionId}`, { method: "DELETE" }, baseUrl);
}

export async function updateSection(
  sectionId: string,
  payload: UpdateSectionPayload,
  baseUrl?: string,
): Promise<SectionDto> {
  return requestJson(
    `/sections/${sectionId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function fetchDiagrams(
  params: {
    q?: string;
    sectionId?: string;
    tag?: string;
    language?: string;
    minRating?: number;
    minVotes?: number;
    sortBy?: DiagramSortOption;
  },
  baseUrl?: string,
): Promise<{ diagrams: DiagramListItemDto[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params.q) {
    searchParams.set("q", params.q);
  }
  if (params.sectionId) {
    searchParams.set("sectionId", params.sectionId);
  }
  if (params.tag) {
    searchParams.set("tag", params.tag);
  }
  if (params.language) {
    searchParams.set("language", params.language);
  }
  if (params.minRating !== undefined && params.minRating > 0) {
    searchParams.set("minRating", String(params.minRating));
  }
  if (params.minVotes !== undefined && params.minVotes > 0) {
    searchParams.set("minVotes", String(params.minVotes));
  }
  if (params.sortBy) {
    searchParams.set("sortBy", params.sortBy);
  }

  const query = searchParams.toString();
  return requestJson(`/diagrams${query ? `?${query}` : ""}`, undefined, baseUrl);
}

export async function addDiagramFavorite(
  diagramId: string,
  baseUrl?: string,
): Promise<DiagramDto> {
  return requestJson(
    `/diagrams/${diagramId}/favorite`,
    { method: "POST" },
    baseUrl,
  );
}

export async function removeDiagramFavorite(
  diagramId: string,
  baseUrl?: string,
): Promise<DiagramDto> {
  return requestJson(
    `/diagrams/${diagramId}/favorite`,
    { method: "DELETE" },
    baseUrl,
  );
}

export async function submitDiagramRatingStars(
  diagramId: string,
  rating: number,
  baseUrl?: string,
): Promise<DiagramDto> {
  return requestJson(
    `/diagrams/${diagramId}/ratings/stars`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    },
    baseUrl,
  );
}

export async function submitDiagramRatingComment(
  diagramId: string,
  comment: string,
  baseUrl?: string,
): Promise<DiagramDto> {
  return requestJson(
    `/diagrams/${diagramId}/ratings/comment`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comment }),
    },
    baseUrl,
  );
}

export async function fetchDiagramRatings(
  diagramId: string,
  baseUrl?: string,
): Promise<{ approved: DiagramRatingDto[]; pending: DiagramRatingDto[] }> {
  return requestJson(`/diagrams/${diagramId}/ratings`, undefined, baseUrl);
}

export async function moderateDiagramRatingComment(
  diagramId: string,
  ratingUserId: string,
  status: "approved" | "rejected",
  baseUrl?: string,
): Promise<void> {
  await requestJson(
    `/diagrams/${diagramId}/ratings/${ratingUserId}/moderate`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    },
    baseUrl,
  );
}

export async function deleteDiagramRating(
  diagramId: string,
  ratingUserId: string,
  baseUrl?: string,
): Promise<void> {
  await requestJson(
    `/diagrams/${diagramId}/ratings/${ratingUserId}`,
    { method: "DELETE" },
    baseUrl,
  );
}

export async function fetchDiagramVersions(
  diagramId: string,
  baseUrl?: string,
): Promise<{ versions: DiagramVersionDto[] }> {
  return requestJson(`/diagrams/${diagramId}/versions`, undefined, baseUrl);
}

export async function createLibraryDiagramVersion(
  diagramId: string,
  payload: { source?: string; comment?: string },
  baseUrl?: string,
): Promise<{ version: DiagramVersionDto }> {
  return requestJson(
    `/diagrams/${diagramId}/versions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function deleteLibraryDiagramVersion(
  diagramId: string,
  versionId: string,
  baseUrl?: string,
): Promise<void> {
  await requestJson(
    `/diagrams/${diagramId}/versions/${versionId}`,
    { method: "DELETE" },
    baseUrl,
  );
}

export async function restoreLibraryDiagramVersion(
  diagramId: string,
  versionId: string,
  baseUrl?: string,
): Promise<DiagramDto> {
  return requestJson(
    `/diagrams/${diagramId}/versions/${versionId}/restore`,
    { method: "POST" },
    baseUrl,
  );
}

export async function fetchDiagram(
  diagramId: string,
  baseUrl?: string,
): Promise<DiagramDto> {
  return requestJson(`/diagrams/${diagramId}`, undefined, baseUrl);
}

export async function createDiagram(
  payload: CreateDiagramPayload,
  baseUrl?: string,
): Promise<DiagramDto> {
  return requestJson(
    "/diagrams",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function uploadDiagramFile(
  file: File,
  metadata: {
    title?: string;
    description?: string;
    tags?: string[];
    language?: string;
    sectionId?: string | null;
    visibility?: string;
  },
  baseUrl?: string,
): Promise<DiagramDto> {
  const formData = new FormData();
  formData.append("file", file);
  if (metadata.title) {
    formData.append("title", metadata.title);
  }
  if (metadata.description) {
    formData.append("description", metadata.description);
  }
  if (metadata.tags?.length) {
    formData.append("tags", metadata.tags.join(","));
  }
  if (metadata.language) {
    formData.append("language", metadata.language);
  }
  if (metadata.sectionId) {
    formData.append("sectionId", metadata.sectionId);
  }
  if (metadata.visibility) {
    formData.append("visibility", metadata.visibility);
  }

  return requestJson(
    "/diagrams",
    {
      method: "POST",
      body: formData,
    },
    baseUrl,
  );
}

export async function updateDiagram(
  diagramId: string,
  payload: UpdateDiagramPayload,
  baseUrl?: string,
): Promise<DiagramDto> {
  return requestJson(
    `/diagrams/${diagramId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function deleteDiagram(
  diagramId: string,
  baseUrl?: string,
): Promise<void> {
  await requestJson(`/diagrams/${diagramId}`, { method: "DELETE" }, baseUrl);
}

export async function checkApiHealth(baseUrl?: string): Promise<boolean> {
  const resolved = baseUrl ?? getLibraryApiBaseUrl();
  if (!resolved) {
    return false;
  }

  try {
    await fetchLibraryAuthStatus(resolved);
    return true;
  } catch {
    try {
      const response = await fetch(`${resolved}/health`, {
        headers: buildRequestHeaders(),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export async function fetchLibraryAuthStatus(
  baseUrl?: string,
): Promise<{ needsSetup: boolean; registrationEnabled?: boolean }> {
  return requestJsonPublic("/auth/status", undefined, baseUrl);
}

export async function registerLibraryAccount(
  username: string,
  password: string,
  baseUrl?: string,
): Promise<{ token: string; user: LibraryUserDto }> {
  return requestJsonPublic(
    "/auth/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
    baseUrl,
  );
}

export async function setupLibraryAdmin(
  username: string,
  password: string,
  baseUrl?: string,
): Promise<{ token: string; user: LibraryUserDto }> {
  return requestJsonPublic(
    "/auth/setup",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
    baseUrl,
  );
}

export async function loginLibrary(
  username: string,
  password: string,
  baseUrl?: string,
): Promise<{ token: string; user: LibraryUserDto }> {
  return requestJson(
    "/auth/login",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    },
    baseUrl,
  );
}

export async function fetchLibraryMe(baseUrl?: string): Promise<{ user: LibraryUserDto }> {
  return requestJson("/auth/me", undefined, baseUrl);
}

export async function fetchAdminUsers(baseUrl?: string): Promise<{ users: LibraryUserDto[] }> {
  return requestJson("/admin/users", undefined, baseUrl);
}

export async function setUserBlocked(
  userId: string,
  blocked: boolean,
  baseUrl?: string,
): Promise<{ user: LibraryUserDto }> {
  return requestJson(
    `/admin/users/${userId}/block`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked }),
    },
    baseUrl,
  );
}

export async function setUserSubscription(
  userId: string,
  subscriptionActive: boolean,
  baseUrl?: string,
): Promise<{ user: LibraryUserDto }> {
  return requestJson(
    `/admin/users/${userId}/subscription`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionActive }),
    },
    baseUrl,
  );
}

export async function createAdminUser(
  payload: {
    username: string;
    password: string;
    role?: LibraryUserDto["role"];
    subscriptionActive?: boolean;
  },
  baseUrl?: string,
): Promise<{ user: LibraryUserDto }> {
  return requestJson(
    "/admin/users",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function updateAdminUser(
  userId: string,
  payload: {
    username?: string;
    password?: string;
    role?: LibraryUserDto["role"];
    blocked?: boolean;
    subscriptionActive?: boolean;
  },
  baseUrl?: string,
): Promise<{ user: LibraryUserDto }> {
  return requestJson(
    `/admin/users/${userId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function deleteAdminUser(
  userId: string,
  baseUrl?: string,
): Promise<{ ok: boolean }> {
  return requestJson(`/admin/users/${userId}`, { method: "DELETE" }, baseUrl);
}

export async function fetchSectionAccess(
  sectionId: string,
  baseUrl?: string,
): Promise<{ access: SectionAccessDto[] }> {
  return requestJson(`/sections/${sectionId}/access`, undefined, baseUrl);
}

export async function grantSectionAccess(
  sectionId: string,
  payload: {
    username?: string;
    userId?: string;
    permanent?: boolean;
    expiresAt?: string | null;
    permission?: SectionAccessPermission;
  },
  baseUrl?: string,
): Promise<{ ok: boolean }> {
  return requestJson(
    `/sections/${sectionId}/access`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function revokeSectionAccess(
  sectionId: string,
  userId: string,
  baseUrl?: string,
): Promise<{ ok: boolean }> {
  return requestJson(
    `/sections/${sectionId}/access/${userId}`,
    { method: "DELETE" },
    baseUrl,
  );
}

export async function fetchRatingsLeaderboard(
  baseUrl?: string,
): Promise<RatingsLeaderboardDto> {
  return requestJson("/ratings/leaderboard", undefined, baseUrl);
}

export async function createSectionShareLink(
  sectionId: string,
  payload: {
    permanent?: boolean;
    expiresAt?: string | null;
    permission?: SharePermission;
    maxDownloads?: number | null;
  } = {},
  baseUrl?: string,
): Promise<{ link: ShareLinkDto }> {
  return requestJson(
    `/sections/${sectionId}/share`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

export async function createDiagramShareLink(
  diagramId: string,
  payload: {
    permanent?: boolean;
    expiresAt?: string | null;
    permission?: SharePermission;
    maxDownloads?: number | null;
  } = {},
  baseUrl?: string,
): Promise<{ link: ShareLinkDto }> {
  return requestJson(
    `/diagrams/${diagramId}/share`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    baseUrl,
  );
}

function resolveShareApiBaseUrl(baseUrl?: string): string {
  const apiBase = resolveApiBaseUrl(baseUrl);
  return apiBase.replace(/\/api$/, "") + "/api/share";
}

export async function fetchShareResource(
  token: string,
  baseUrl?: string,
): Promise<{
  resourceType: "section" | "diagram";
  link?: ShareLinkDto;
  diagram?: DiagramDto;
  sectionId?: string;
  sections?: SectionDto[];
  diagrams?: DiagramListItemDto[];
  watermarkedPreview?: boolean;
  canDownload?: boolean;
  readOnly: boolean;
}> {
  const shareBase = resolveShareApiBaseUrl(baseUrl);
  const response = await fetch(`${shareBase}/${token}`, {
    headers: buildRequestHeaders(),
  });

  if (!response.ok) {
    throw new DiagramApiError(await parseError(response), response.status);
  }

  return (await response.json()) as {
    resourceType: "section" | "diagram";
    link?: ShareLinkDto;
    diagram?: DiagramDto;
    sectionId?: string;
    sections?: SectionDto[];
    diagrams?: DiagramListItemDto[];
    watermarkedPreview?: boolean;
    canDownload?: boolean;
    readOnly: boolean;
  };
}

export async function fetchShareDiagramPreview(
  token: string,
  diagramId: string,
  baseUrl?: string,
): Promise<{
  link: ShareLinkDto;
  diagram: DiagramDto;
  watermarkedPreview: boolean;
  canDownload: boolean;
}> {
  const shareBase = resolveShareApiBaseUrl(baseUrl);
  const response = await fetch(`${shareBase}/${token}/diagrams/${diagramId}/preview`, {
    headers: buildRequestHeaders(),
  });

  if (!response.ok) {
    throw new DiagramApiError(await parseError(response), response.status);
  }

  return (await response.json()) as {
    link: ShareLinkDto;
    diagram: DiagramDto;
    watermarkedPreview: boolean;
    canDownload: boolean;
  };
}

export async function downloadShareResource(
  token: string,
  diagramId?: string,
  baseUrl?: string,
): Promise<{
  link: ShareLinkDto;
  diagram: DiagramDto;
  watermarkedPreview: boolean;
}> {
  const shareBase = resolveShareApiBaseUrl(baseUrl);
  const response = await fetch(`${shareBase}/${token}/download`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildLibraryAuthHeader(),
    },
    body: JSON.stringify({ diagramId }),
  });

  if (!response.ok) {
    throw new DiagramApiError(await parseError(response), response.status);
  }

  return (await response.json()) as {
    link: ShareLinkDto;
    diagram: DiagramDto;
    watermarkedPreview: boolean;
  };
}
