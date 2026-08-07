import type Database from "better-sqlite3";
import { collectSectionSubtree } from "./shared/section-tree.js";
import type {
  SectionAccessPermission,
  SubscriptionDto,
  SubscriptionSectionDto,
  UserSubscriptionGrantDto,
} from "./types.js";
import { isSectionAccessPermission } from "./types.js";

export const PERMISSION_RANK: Record<SectionAccessPermission, number> = {
  view: 1,
  download: 2,
  contribute: 3,
};

export function higherPermission(
  a: SectionAccessPermission,
  b: SectionAccessPermission,
): SectionAccessPermission {
  return PERMISSION_RANK[a] >= PERMISSION_RANK[b] ? a : b;
}

function isGrantActive(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return true;
  }
  return new Date(expiresAt).getTime() > Date.now();
}

interface SectionRef {
  id: string;
  parent_id: string | null;
}

function sectionMatchesSubscriptionEntry(
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

function loadAllSectionRefs(database: Database.Database): SectionRef[] {
  return database
    .prepare("SELECT id, parent_id FROM sections")
    .all() as SectionRef[];
}

export function getSubscriptionPermissionForSection(
  database: Database.Database,
  sectionId: string,
  userId: string,
): SectionAccessPermission | null {
  const rows = database
    .prepare(
      `SELECT s.permission, ss.section_id, ss.include_descendants, us.expires_at
       FROM user_subscriptions us
       INNER JOIN subscriptions s ON s.id = us.subscription_id
       INNER JOIN subscription_sections ss ON ss.subscription_id = s.id
       WHERE us.user_id = ?`,
    )
    .all(userId) as Array<{
    permission: string;
    section_id: string;
    include_descendants: number;
    expires_at: string | null;
  }>;

  if (rows.length === 0) {
    return null;
  }

  const sections = loadAllSectionRefs(database);
  let maxPermission: SectionAccessPermission | null = null;

  for (const row of rows) {
    if (!isGrantActive(row.expires_at)) {
      continue;
    }

    if (
      !sectionMatchesSubscriptionEntry(
        sectionId,
        row.section_id,
        row.include_descendants === 1,
        sections,
      )
    ) {
      continue;
    }

    if (!isSectionAccessPermission(row.permission)) {
      continue;
    }

    maxPermission = maxPermission
      ? higherPermission(maxPermission, row.permission)
      : row.permission;
  }

  return maxPermission;
}

export function mapSubscriptionSections(
  database: Database.Database,
  subscriptionId: string,
): SubscriptionSectionDto[] {
  const rows = database
    .prepare(
      `SELECT ss.section_id, ss.include_descendants, sec.title
       FROM subscription_sections ss
       INNER JOIN sections sec ON sec.id = ss.section_id
       WHERE ss.subscription_id = ?
       ORDER BY sec.title ASC`,
    )
    .all(subscriptionId) as Array<{
    section_id: string;
    include_descendants: number;
    title: string;
  }>;

  return rows.map((row) => ({
    sectionId: row.section_id,
    sectionTitle: row.title,
    includeDescendants: row.include_descendants === 1,
  }));
}

export function mapSubscriptionDto(
  database: Database.Database,
  row: {
    id: string;
    owner_id: string;
    title: string;
    description: string;
    permission: string;
    created_at: string;
    updated_at: string;
  },
): SubscriptionDto {
  const permission = isSectionAccessPermission(row.permission)
    ? row.permission
    : "view";

  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    permission,
    sections: mapSubscriptionSections(database, row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listSubscriptionGrants(
  database: Database.Database,
  subscriptionId: string,
): UserSubscriptionGrantDto[] {
  const rows = database
    .prepare(
      `SELECT us.user_id, us.expires_at, us.created_at, u.username
       FROM user_subscriptions us
       INNER JOIN users u ON u.id = us.user_id
       WHERE us.subscription_id = ?
       ORDER BY u.username ASC`,
    )
    .all(subscriptionId) as Array<{
    user_id: string;
    expires_at: string | null;
    created_at: string;
    username: string;
  }>;

  return rows.map((row) => ({
    userId: row.user_id,
    username: row.username,
    expiresAt: row.expires_at,
    permanent: !row.expires_at,
    grantedAt: row.created_at,
  }));
}

export function replaceSubscriptionSections(
  database: Database.Database,
  subscriptionId: string,
  sections: SubscriptionSectionDto[],
): void {
  database
    .prepare("DELETE FROM subscription_sections WHERE subscription_id = ?")
    .run(subscriptionId);

  const insert = database.prepare(
    `INSERT INTO subscription_sections (
      id, subscription_id, section_id, include_descendants
    ) VALUES (?, ?, ?, ?)`,
  );

  for (const entry of sections) {
    insert.run(
      crypto.randomUUID(),
      subscriptionId,
      entry.sectionId,
      entry.includeDescendants ? 1 : 0,
    );
  }
}
