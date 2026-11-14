import {
  LIBRARY_LINK_STATS_PERIODS,
  type LibraryLinkStatsPeriod,
} from "@/constants/diagram-library";
import { requestJson, requestJsonPublic } from "./client";

export interface LibraryLinkDto {
  id: string;
  diagramId: string;
  slug: string;
  delivery: "editor" | "view";
  dataAccess: "online" | "offline";
  viewRender: "snapshot" | "live" | null;
  hasSnapshot: boolean;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryLinkInput {
  slug: string;
  delivery: "editor" | "view";
  dataAccess: "online" | "offline";
  viewRender?: "snapshot" | "live" | null;
}

export interface PublicZoneDiagram {
  id: string;
  title: string;
  language: string;
  fileName: string;
  source: string;
}

export interface PublicEditorLibraryLink {
  delivery: "editor";
  dataAccess: "online" | "offline";
  diagram: {
    id: string;
    title: string;
    language: string;
    fileName: string;
    source: string;
  };
  zones?: PublicZoneDiagram[];
}

export interface PublicViewLibraryLink {
  delivery: "view";
  svg: string;
  diagram?: PublicEditorLibraryLink["diagram"];
  zones?: PublicZoneDiagram[];
}

export interface LibraryLinkStatBucket {
  key: string;
  views: number;
}

export interface LibraryLinkStats {
  periodDays: LibraryLinkStatsPeriod;
  views: number;
  visitors: number;
  days: Array<{ day: string; views: number; visitors: number }>;
  countries: LibraryLinkStatBucket[];
  browsers: LibraryLinkStatBucket[];
  systems: LibraryLinkStatBucket[];
  languages: LibraryLinkStatBucket[];
  sizes: LibraryLinkStatBucket[];
  referrers: LibraryLinkStatBucket[];
  campaigns: LibraryLinkStatBucket[];
}

const SESSION_STORAGE_KEY = "code2graph-library-link-session";

export function libraryLinkSessionId(): string {
  const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const created = crypto.randomUUID();
  sessionStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
}

export function fetchLibraryLinks(
  diagramId: string,
  baseUrl?: string,
): Promise<{ links: LibraryLinkDto[] }> {
  return requestJson(`/diagrams/${diagramId}/library-links`, undefined, baseUrl);
}

export function createLibraryLink(
  diagramId: string,
  input: LibraryLinkInput,
  baseUrl?: string,
): Promise<{ link: LibraryLinkDto }> {
  return requestJson(
    `/diagrams/${diagramId}/library-links`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    baseUrl,
  );
}

export function deleteLibraryLink(
  diagramId: string,
  linkId: string,
  baseUrl?: string,
): Promise<void> {
  return requestJson(
    `/diagrams/${diagramId}/library-links/${linkId}`,
    { method: "DELETE" },
    baseUrl,
  );
}

export function saveLibraryLinkSnapshot(
  diagramId: string,
  linkId: string,
  svg: string,
  baseUrl?: string,
): Promise<{ link: LibraryLinkDto }> {
  return requestJson(
    `/diagrams/${diagramId}/library-links/${linkId}/snapshot`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ svg }),
    },
    baseUrl,
  );
}

export function fetchLibraryLinkStats(
  diagramId: string,
  linkId: string,
  period: LibraryLinkStatsPeriod,
  baseUrl?: string,
): Promise<LibraryLinkStats> {
  return requestJson(
    `/diagrams/${diagramId}/library-links/${linkId}/stats?period=${period}`,
    undefined,
    baseUrl,
  );
}

export function fetchPublicLibraryLink(
  username: string,
  slug: string,
  baseUrl?: string,
): Promise<PublicEditorLibraryLink | PublicViewLibraryLink> {
  return requestJsonPublic(
    `/library-links/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
    undefined,
    baseUrl,
  );
}

export function recordLibraryLinkHit(
  username: string,
  slug: string,
  baseUrl?: string,
): Promise<void> {
  const campaign = new URLSearchParams(window.location.search).get("utm_campaign") ?? "";
  return requestJsonPublic(
    `/library-links/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/hit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: libraryLinkSessionId(),
        screenWidth: window.innerWidth,
        language: navigator.language,
        campaign,
      }),
    },
    baseUrl,
  );
}

export function isLibraryLinkStatsPeriod(value: number): value is LibraryLinkStatsPeriod {
  return (LIBRARY_LINK_STATS_PERIODS as readonly number[]).includes(value);
}
