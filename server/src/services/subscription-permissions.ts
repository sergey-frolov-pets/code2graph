import type Database from "better-sqlite3";
import { collectSectionSubtree } from "../shared/section-tree.js";
import type { SectionAccessPermission } from "../types.js";
import {
  isSectionAccessPermission,
  isSubscriptionDistributionMode,
  type SubscriptionDistributionMode,
} from "../types.js";

export const PERMISSION_RANK: Record<SectionAccessPermission, number> = {
  view: 1,
  download: 2,
  contribute: 3,
};

export const SUBSCRIPTION_URL_PARAM = "sub";

export interface SubscriptionRow {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  permission: string;
  distribution_mode: string;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export function higherPermission(
  a: SectionAccessPermission,
  b: SectionAccessPermission,
): SectionAccessPermission {
  return PERMISSION_RANK[a] >= PERMISSION_RANK[b] ? a : b;
}

export function isGrantActive(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return true;
  }
  return new Date(expiresAt).getTime() > Date.now();
}

export interface SectionRef {
  id: string;
  parent_id: string | null;
}

export function sectionMatchesSubscriptionEntry(
  targetSectionId: string,
  entrySectionId: string,
  includeDescendants: boolean,
  sections: SectionRef[],
): boolean {
  if (entrySectionId === targetSectionId) {
    return true;
  }

  if (!includeDescendants) {
    return false;
  }

  return collectSectionSubtree(
    entrySectionId,
    sections.map((section) => ({
      id: section.id,
      parentId: section.parent_id,
    })),
  ).has(targetSectionId);
}

export function loadAllSectionRefs(database: Database.Database): SectionRef[] {
  return database
    .prepare("SELECT id, parent_id FROM sections")
    .all() as SectionRef[];
}

export function parseDistributionMode(value: string): SubscriptionDistributionMode {
  return isSubscriptionDistributionMode(value) ? value : "users";
}

export function buildSubscriptionUrlPath(shareToken: string | null): string | null {
  if (!shareToken) {
    return null;
  }
  return `?${SUBSCRIPTION_URL_PARAM}=${shareToken}`;
}

export function resolvePermission(value: string): SectionAccessPermission {
  return isSectionAccessPermission(value) ? value : "view";
}

function collectActiveUserSubscriptionRows(
  database: Database.Database,
  userId: string,
): Array<{
  permission: string;
  section_id: string | null;
  include_descendants: number | null;
  diagram_id: string | null;
  expires_at: string | null;
}> {
  return database
    .prepare(
      `SELECT s.permission, ss.section_id, ss.include_descendants, sd.diagram_id, us.expires_at
       FROM user_subscriptions us
       INNER JOIN subscriptions s ON s.id = us.subscription_id
       LEFT JOIN subscription_sections ss ON ss.subscription_id = s.id
       LEFT JOIN subscription_diagrams sd ON sd.subscription_id = s.id
       WHERE us.user_id = ?`,
    )
    .all(userId) as Array<{
    permission: string;
    section_id: string | null;
    include_descendants: number | null;
    diagram_id: string | null;
    expires_at: string | null;
  }>;
}

function collectActiveLinkSubscriptionRows(
  database: Database.Database,
  shareToken: string,
): Array<{
  subscription_id: string;
  permission: string;
  section_id: string | null;
  include_descendants: number | null;
  diagram_id: string | null;
}> {
  return database
    .prepare(
      `SELECT s.id AS subscription_id, s.permission, ss.section_id, ss.include_descendants, sd.diagram_id
       FROM subscriptions s
       LEFT JOIN subscription_sections ss ON ss.subscription_id = s.id
       LEFT JOIN subscription_diagrams sd ON sd.subscription_id = s.id
       WHERE s.share_token = ?
         AND s.distribution_mode IN ('link', 'both')`,
    )
    .all(shareToken) as Array<{
    subscription_id: string;
    permission: string;
    section_id: string | null;
    include_descendants: number | null;
    diagram_id: string | null;
  }>;
}

function resolveMaxPermissionFromRows(
  rows: Array<{
    permission: string;
    section_id?: string | null;
    include_descendants?: number | null;
    diagram_id?: string | null;
    expires_at?: string | null;
  }>,
  matcher: (row: (typeof rows)[number]) => boolean,
): SectionAccessPermission | null {
  let maxPermission: SectionAccessPermission | null = null;

  for (const row of rows) {
    if (row.expires_at !== undefined && !isGrantActive(row.expires_at)) {
      continue;
    }

    if (!matcher(row)) {
      continue;
    }

    const permission = resolvePermission(row.permission);
    maxPermission = maxPermission
      ? higherPermission(maxPermission, permission)
      : permission;
  }

  return maxPermission;
}

export function getSubscriptionPermissionForSection(
  database: Database.Database,
  sectionId: string,
  userId: string,
  shareToken?: string | null,
): SectionAccessPermission | null {
  const sections = loadAllSectionRefs(database);
  const userRows = collectActiveUserSubscriptionRows(database, userId);
  const userPermission = resolveMaxPermissionFromRows(
    userRows,
    (row) =>
      Boolean(
        row.section_id &&
          sectionMatchesSubscriptionEntry(
            sectionId,
            row.section_id,
            row.include_descendants === 1,
            sections,
          ),
      ),
  );

  if (!shareToken) {
    return userPermission;
  }

  const linkRows = collectActiveLinkSubscriptionRows(database, shareToken);
  const linkPermission = resolveMaxPermissionFromRows(
    linkRows,
    (row) =>
      Boolean(
        row.section_id &&
          sectionMatchesSubscriptionEntry(
            sectionId,
            row.section_id,
            row.include_descendants === 1,
            sections,
          ),
      ),
  );

  if (userPermission && linkPermission) {
    return higherPermission(userPermission, linkPermission);
  }

  return userPermission ?? linkPermission ?? null;
}

export function getSubscriptionPermissionForDiagram(
  database: Database.Database,
  diagramId: string,
  userId: string,
  shareToken?: string | null,
): SectionAccessPermission | null {
  const diagram = database
    .prepare("SELECT section_id FROM diagrams WHERE id = ?")
    .get(diagramId) as { section_id: string | null } | undefined;

  const sections = loadAllSectionRefs(database);
  const userRows = collectActiveUserSubscriptionRows(database, userId);
  const userPermission = resolveMaxPermissionFromRows(
    userRows,
    (row) => {
      if (row.diagram_id === diagramId) {
        return true;
      }

      if (!diagram?.section_id || !row.section_id) {
        return false;
      }

      return sectionMatchesSubscriptionEntry(
        diagram.section_id,
        row.section_id,
        row.include_descendants === 1,
        sections,
      );
    },
  );

  if (!shareToken) {
    return userPermission;
  }

  const linkRows = collectActiveLinkSubscriptionRows(database, shareToken);
  const linkPermission = resolveMaxPermissionFromRows(
    linkRows,
    (row) => {
      if (row.diagram_id === diagramId) {
        return true;
      }

      if (!diagram?.section_id || !row.section_id) {
        return false;
      }

      return sectionMatchesSubscriptionEntry(
        diagram.section_id,
        row.section_id,
        row.include_descendants === 1,
        sections,
      );
    },
  );

  if (userPermission && linkPermission) {
    return higherPermission(userPermission, linkPermission);
  }

  return userPermission ?? linkPermission ?? null;
}
