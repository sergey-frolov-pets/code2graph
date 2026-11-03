import type Database from "better-sqlite3";
import { collectSectionSubtree } from "./shared/section-tree.js";
import { generateShareToken } from "./share-links.js";
import type {
  GrantedSubscriptionDto,
  SectionAccessPermission,
  SubscriptionDiagramDto,
  SubscriptionDistributionMode,
  SubscriptionDto,
  SubscriptionSectionDto,
  UserSubscriptionGrantDto,
} from "./types.js";
import {
  isSectionAccessPermission,
  isSubscriptionDistributionMode,
} from "./types.js";

export const PERMISSION_RANK: Record<SectionAccessPermission, number> = {
  view: 1,
  download: 2,
  contribute: 3,
};

const SUBSCRIPTION_URL_PARAM = "sub";

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

function parseDistributionMode(value: string): SubscriptionDistributionMode {
  return isSubscriptionDistributionMode(value) ? value : "users";
}

function buildSubscriptionUrlPath(shareToken: string | null): string | null {
  if (!shareToken) {
    return null;
  }
  return `?${SUBSCRIPTION_URL_PARAM}=${shareToken}`;
}

function resolvePermission(value: string): SectionAccessPermission {
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
  sections: SectionRef[],
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
    sections,
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
    sections,
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
    sections,
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
    sections,
  );

  if (userPermission && linkPermission) {
    return higherPermission(userPermission, linkPermission);
  }

  return userPermission ?? linkPermission ?? null;
}

export function getSubscriptionByShareToken(
  database: Database.Database,
  shareToken: string,
): SubscriptionRow | null {
  const row = database
    .prepare(
      `SELECT id, owner_id, title, description, permission, distribution_mode,
              share_token, created_at, updated_at
       FROM subscriptions
       WHERE share_token = ?`,
    )
    .get(shareToken) as SubscriptionRow | undefined;

  if (!row) {
    return null;
  }

  if (!allowsLinkDistribution(row.distribution_mode)) {
    return null;
  }

  return row;
}

export function allowsLinkDistribution(distributionMode: string): boolean {
  const mode = parseDistributionMode(distributionMode);
  return mode === "link" || mode === "both";
}

export function allowsUserDistribution(distributionMode: string): boolean {
  const mode = parseDistributionMode(distributionMode);
  return mode === "users" || mode === "both";
}

export function ensureSubscriptionShareToken(
  database: Database.Database,
  subscriptionId: string,
): string {
  const current = database
    .prepare("SELECT share_token FROM subscriptions WHERE id = ?")
    .get(subscriptionId) as { share_token: string | null } | undefined;

  if (current?.share_token) {
    return current.share_token;
  }

  const token = generateShareToken();
  database
    .prepare("UPDATE subscriptions SET share_token = ? WHERE id = ?")
    .run(token, subscriptionId);
  return token;
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

export function mapSubscriptionDiagrams(
  database: Database.Database,
  subscriptionId: string,
): SubscriptionDiagramDto[] {
  const rows = database
    .prepare(
      `SELECT sd.diagram_id, d.title
       FROM subscription_diagrams sd
       INNER JOIN diagrams d ON d.id = sd.diagram_id
       WHERE sd.subscription_id = ?
       ORDER BY d.title ASC`,
    )
    .all(subscriptionId) as Array<{
    diagram_id: string;
    title: string;
  }>;

  return rows.map((row) => ({
    diagramId: row.diagram_id,
    diagramTitle: row.title,
  }));
}

export function mapSubscriptionDto(
  database: Database.Database,
  row: SubscriptionRow,
): SubscriptionDto {
  const distributionMode = parseDistributionMode(row.distribution_mode);
  const shareToken =
    allowsLinkDistribution(distributionMode) && row.share_token
      ? row.share_token
      : null;

  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description,
    permission: resolvePermission(row.permission),
    distributionMode,
    shareToken,
    urlPath: buildSubscriptionUrlPath(shareToken),
    sections: mapSubscriptionSections(database, row.id),
    diagrams: mapSubscriptionDiagrams(database, row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listGrantedSubscriptions(
  database: Database.Database,
  userId: string,
): GrantedSubscriptionDto[] {
  const rows = database
    .prepare(
      `SELECT s.id, s.owner_id, s.title, s.description, s.permission, s.distribution_mode,
              s.share_token, s.created_at, s.updated_at, us.expires_at, us.created_at AS granted_at,
              owner.username AS owner_username
       FROM user_subscriptions us
       INNER JOIN subscriptions s ON s.id = us.subscription_id
       INNER JOIN users owner ON owner.id = s.owner_id
       WHERE us.user_id = ?
       ORDER BY s.title ASC`,
    )
    .all(userId) as Array<
    SubscriptionRow & {
      expires_at: string | null;
      granted_at: string;
      owner_username: string;
    }
  >;

  return rows
    .filter((row) => isGrantActive(row.expires_at))
    .map((row) => ({
      ...mapSubscriptionDto(database, row),
      ownerUsername: row.owner_username,
      grantExpiresAt: row.expires_at,
      grantPermanent: !row.expires_at,
      grantedAt: row.granted_at,
    }));
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

export function replaceSubscriptionDiagrams(
  database: Database.Database,
  subscriptionId: string,
  diagrams: SubscriptionDiagramDto[],
): void {
  database
    .prepare("DELETE FROM subscription_diagrams WHERE subscription_id = ?")
    .run(subscriptionId);

  const insert = database.prepare(
    `INSERT INTO subscription_diagrams (id, subscription_id, diagram_id)
     VALUES (?, ?, ?)`,
  );

  for (const entry of diagrams) {
    insert.run(crypto.randomUUID(), subscriptionId, entry.diagramId);
  }
}

export function subscriptionIncludesSection(
  database: Database.Database,
  subscriptionId: string,
  sectionId: string,
): boolean {
  const rows = database
    .prepare(
      `SELECT section_id, include_descendants
       FROM subscription_sections
       WHERE subscription_id = ?`,
    )
    .all(subscriptionId) as Array<{
    section_id: string;
    include_descendants: number;
  }>;

  const sections = loadAllSectionRefs(database);
  return rows.some((row) =>
    sectionMatchesSubscriptionEntry(
      sectionId,
      row.section_id,
      row.include_descendants === 1,
      sections,
    ),
  );
}

export function subscriptionIncludesDiagram(
  database: Database.Database,
  subscriptionId: string,
  diagramId: string,
): boolean {
  const direct = database
    .prepare(
      `SELECT 1 FROM subscription_diagrams
       WHERE subscription_id = ? AND diagram_id = ?`,
    )
    .get(subscriptionId, diagramId);

  if (direct) {
    return true;
  }

  const diagram = database
    .prepare("SELECT section_id FROM diagrams WHERE id = ?")
    .get(diagramId) as { section_id: string | null } | undefined;

  if (!diagram?.section_id) {
    return false;
  }

  return subscriptionIncludesSection(database, subscriptionId, diagram.section_id);
}
