import type {
  CreateDiagramPayload,
  CreateSectionPayload,
  DiagramDto,
  DiagramListItemDto,
  SectionDto,
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

  const query = searchParams.toString();
  return requestJson(`/diagrams${query ? `?${query}` : ""}`, undefined, baseUrl);
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
    const response = await fetch(`${resolved}/health`, {
      headers: buildRequestHeaders(),
    });
    return response.ok;
  } catch {
    return false;
  }
}
