import type {
  CreateSectionPayload,
  SectionAccessDto,
  SectionAccessPermission,
  SectionDto,
  UpdateSectionPayload,
} from "@/constants/diagram-library";
import { requestJson } from "./client";

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
