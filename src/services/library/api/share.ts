import { buildLibraryAuthHeader } from "@/config/library-credentials";
import type {
  DiagramDto,
  DiagramListItemDto,
  SectionDto,
  ShareLinkDto,
  SharePermission,
} from "@/constants/diagram-library";
import {
  LibraryApiError,
  buildRequestHeaders,
  parseError,
  requestJson,
  resolveShareApiBaseUrl,
} from "./client";

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
    throw new LibraryApiError(await parseError(response), response.status);
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
    throw new LibraryApiError(await parseError(response), response.status);
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
    throw new LibraryApiError(await parseError(response), response.status);
  }

  return (await response.json()) as {
    link: ShareLinkDto;
    diagram: DiagramDto;
    watermarkedPreview: boolean;
  };
}
