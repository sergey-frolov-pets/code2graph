import type Database from "better-sqlite3";
import { canAdminSection, getSectionRow, isAdmin } from "../authz.js";
import type {
  SubscriptionDiagramDto,
  SubscriptionSectionDto,
  UserDto,
} from "../types.js";

export function canManageSubscription(
  _database: Database.Database,
  userId: string,
  ownerId: string,
  isUserAdmin: boolean,
): boolean {
  return isUserAdmin || ownerId === userId;
}

export function canIncludeSection(
  database: Database.Database,
  user: { id: string; role: string },
  sectionId: string,
): boolean {
  const section = getSectionRow(database, sectionId);
  if (!section) {
    return false;
  }

  if (section.kind !== "personal") {
    return isAdmin(user as UserDto);
  }

  return canAdminSection(database, user as UserDto, section);
}

export function canIncludeDiagram(
  database: Database.Database,
  user: { id: string; role: string },
  diagramId: string,
): boolean {
  const row = database
    .prepare("SELECT section_id, owner_id, author_id FROM diagrams WHERE id = ?")
    .get(diagramId) as
    | { section_id: string | null; owner_id: string | null; author_id: string | null }
    | undefined;

  if (!row) {
    return false;
  }

  if (row.owner_id === user.id || row.author_id === user.id) {
    return true;
  }

  if (!row.section_id) {
    return false;
  }

  return canIncludeSection(database, user, row.section_id);
}

export function parseSubscriptionSections(
  database: Database.Database,
  user: { id: string; role: string },
  raw: unknown,
): SubscriptionSectionDto[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const result: SubscriptionSectionDto[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const sectionId = String((entry as { sectionId?: string }).sectionId ?? "").trim();
    if (!sectionId || !canIncludeSection(database, user, sectionId)) {
      return null;
    }

    result.push({
      sectionId,
      includeDescendants: Boolean(
        (entry as { includeDescendants?: boolean }).includeDescendants,
      ),
    });
  }

  return result;
}

export function parseSubscriptionDiagrams(
  database: Database.Database,
  user: { id: string; role: string },
  raw: unknown,
): SubscriptionDiagramDto[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const result: SubscriptionDiagramDto[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      return null;
    }

    const diagramId = String((entry as { diagramId?: string }).diagramId ?? "").trim();
    if (!diagramId || !canIncludeDiagram(database, user, diagramId)) {
      return null;
    }

    result.push({ diagramId });
  }

  return result;
}

export function hasSubscriptionTargets(
  sections: SubscriptionSectionDto[],
  diagrams: SubscriptionDiagramDto[],
): boolean {
  return sections.length > 0 || diagrams.length > 0;
}

export function selectSubscriptionRow(database: Database.Database, id: string) {
  return database
    .prepare(
      `SELECT id, owner_id, title, description, permission, distribution_mode,
              share_token, created_at, updated_at
       FROM subscriptions WHERE id = ?`,
    )
    .get(id) as
    | {
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
    | undefined;
}

export function userHasActiveGrant(
  database: Database.Database,
  subscriptionId: string,
  userId: string,
): boolean {
  const row = database
    .prepare(
      `SELECT expires_at FROM user_subscriptions
       WHERE subscription_id = ? AND user_id = ?`,
    )
    .get(subscriptionId, userId) as { expires_at: string | null } | undefined;

  if (!row) {
    return false;
  }

  if (!row.expires_at) {
    return true;
  }

  return new Date(row.expires_at).getTime() > Date.now();
}
