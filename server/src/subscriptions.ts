import type Database from "better-sqlite3";
import {
  buildSubscriptionUrlPath,
  getSubscriptionPermissionForDiagram,
  getSubscriptionPermissionForSection,
  higherPermission,
  isGrantActive,
  loadAllSectionRefs,
  parseDistributionMode,
  PERMISSION_RANK,
  resolvePermission,
  sectionMatchesSubscriptionEntry,
  type SubscriptionRow,
} from "./services/subscription-permissions.js";
import { generateShareToken } from "./share-links.js";
import { featuresForSubscription } from "./services/subscription-features.js";
import type {
  GrantedSubscriptionDto,
  SubscriptionDiagramDto,
  SubscriptionDto,
  SubscriptionSectionDto,
  UserSubscriptionGrantDto,
} from "./types.js";

export {
  getSubscriptionPermissionForDiagram,
  getSubscriptionPermissionForSection,
  higherPermission,
  PERMISSION_RANK,
  type SubscriptionRow,
};

export function allowsLinkDistribution(distributionMode: string): boolean {
  const mode = parseDistributionMode(distributionMode);
  return mode === "link" || mode === "both";
}

export function allowsUserDistribution(distributionMode: string): boolean {
  const mode = parseDistributionMode(distributionMode);
  return mode === "users" || mode === "both";
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

  if (!row || !allowsLinkDistribution(row.distribution_mode)) {
    return null;
  }

  return row;
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
    features: featuresForSubscription(database, row.id, row.permission),
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
