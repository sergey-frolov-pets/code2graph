import type {
  CreateDiagramPayload,
  DiagramDto,
  DiagramListItemDto,
  DiagramRatingDto,
  DiagramSortOption,
  DiagramVersionDto,
  UpdateDiagramPayload,
} from "@/constants/diagram-library";
import { requestJson } from "./client";

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
