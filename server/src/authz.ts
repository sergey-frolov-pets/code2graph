import type Database from "better-sqlite3";
import {
  getSubscriptionPermissionForSection,
  higherPermission,
  PERMISSION_RANK,
} from "./subscriptions.js";
import type {
  DiagramVisibility,
  SectionAccessPermission,
  SectionKind,
  SectionRow,
  UserDto,
} from "./types.js";

export interface SectionAccessGrant {
  section_id: string;
  user_id: string;
  expires_at: string | null;
  permission: SectionAccessPermission;
}

export interface DiagramAccessRow {
  id: string;
  section_id: string | null;
  author_id: string | null;
  owner_id: string | null;
  visibility: DiagramVisibility;
}

export { PERMISSION_RANK };

export function isAdmin(user: UserDto): boolean {
  return user.role === "admin";
}

function isGrantActive(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return true;
  }
  return new Date(expiresAt).getTime() > Date.now();
}

export function getSectionAccessGrant(
  database: Database.Database,
  sectionId: string,
  userId: string,
): SectionAccessGrant | null {
  const row = database
    .prepare(
      `SELECT section_id, user_id, expires_at, permission
       FROM section_access
       WHERE section_id = ? AND user_id = ?`,
    )
    .get(sectionId, userId) as
    | {
        section_id: string;
        user_id: string;
        expires_at: string | null;
        permission: string;
      }
    | undefined;

  if (!row || !isGrantActive(row.expires_at)) {
    return null;
  }

  const permission = row.permission as SectionAccessPermission;
  if (!PERMISSION_RANK[permission]) {
    return {
      section_id: row.section_id,
      user_id: row.user_id,
      expires_at: row.expires_at,
      permission: "view",
    };
  }

  return {
    section_id: row.section_id,
    user_id: row.user_id,
    expires_at: row.expires_at,
    permission,
  };
}

export function getEffectiveSectionPermission(
  database: Database.Database,
  sectionId: string,
  userId: string,
): SectionAccessPermission | null {
  const directGrant = getSectionAccessGrant(database, sectionId, userId);
  const subscriptionPermission = getSubscriptionPermissionForSection(
    database,
    sectionId,
    userId,
  );

  if (directGrant && subscriptionPermission) {
    return higherPermission(directGrant.permission, subscriptionPermission);
  }

  return directGrant?.permission ?? subscriptionPermission ?? null;
}

export function hasEffectiveSectionPermission(
  database: Database.Database,
  sectionId: string,
  userId: string,
  minPermission: SectionAccessPermission = "view",
): boolean {
  const effective = getEffectiveSectionPermission(database, sectionId, userId);
  if (!effective) {
    return false;
  }
  return PERMISSION_RANK[effective] >= PERMISSION_RANK[minPermission];
}

export function getSectionAccessGrants(
  database: Database.Database,
  sectionId: string,
): SectionAccessGrant[] {
  return database
    .prepare(
      `SELECT section_id, user_id, expires_at, permission
       FROM section_access
       WHERE section_id = ?`,
    )
    .all(sectionId) as SectionAccessGrant[];
}

export function getSectionRow(
  database: Database.Database,
  sectionId: string,
): SectionRow | null {
  const row = database
    .prepare(
      `SELECT id, parent_id, title, sort_order, kind, owner_id, author_id,
              visibility, created_at, updated_at
       FROM sections WHERE id = ?`,
    )
    .get(sectionId) as SectionRow | undefined;

  return row ?? null;
}

function canSeeSubscriptionContent(
  database: Database.Database,
  user: UserDto,
  sectionId: string | null,
  ownerId: string | null,
): boolean {
  if (ownerId === user.id) {
    return true;
  }

  if (!sectionId) {
    return false;
  }

  return hasEffectiveSectionPermission(database, sectionId, user.id, "view");
}

export function canSeeVisibility(
  user: UserDto,
  visibility: DiagramVisibility,
  ownerId: string | null,
  database?: Database.Database,
  sectionId?: string | null,
): boolean {
  if (isAdmin(user)) {
    return true;
  }

  switch (visibility) {
    case "all":
      return true;
    case "personal":
      return ownerId === user.id;
    case "subscription":
      if (!database) {
        return false;
      }
      return canSeeSubscriptionContent(database, user, sectionId ?? null, ownerId);
    default:
      return false;
  }
}

export function canReadSection(
  database: Database.Database,
  user: UserDto,
  section: SectionRow,
): boolean {
  if (isAdmin(user)) {
    return true;
  }

  if (section.owner_id === user.id) {
    return true;
  }

  if (hasEffectiveSectionPermission(database, section.id, user.id, "view")) {
    return true;
  }

  if (section.kind === "shared" && section.visibility === "all") {
    return true;
  }

  if (
    section.kind === "personal" &&
    section.owner_id === user.id &&
    canSeeVisibility(user, section.visibility, section.owner_id, database, section.id)
  ) {
    return true;
  }

  if (
    section.visibility === "subscription" &&
    hasEffectiveSectionPermission(database, section.id, user.id, "view")
  ) {
    return true;
  }

  return false;
}

export function canDownloadSection(
  database: Database.Database,
  user: UserDto,
  section: SectionRow,
): boolean {
  if (isAdmin(user)) {
    return true;
  }

  if (section.owner_id === user.id) {
    return true;
  }

  return hasEffectiveSectionPermission(database, section.id, user.id, "download");
}

export function canWriteSection(
  database: Database.Database,
  user: UserDto,
  section: SectionRow,
): boolean {
  if (isAdmin(user)) {
    return true;
  }

  if (section.owner_id === user.id) {
    return true;
  }

  return hasEffectiveSectionPermission(database, section.id, user.id, "contribute");
}

export function canAdminSection(
  database: Database.Database,
  user: UserDto,
  section: SectionRow,
): boolean {
  if (isAdmin(user)) {
    return true;
  }

  return section.owner_id === user.id;
}

export function canCreateSharedSection(user: UserDto): boolean {
  return isAdmin(user);
}

export function canCreateChildSection(
  database: Database.Database,
  user: UserDto,
  parentId: string | null,
): boolean {
  if (!parentId) {
    return isAdmin(user);
  }

  const parent = getSectionRow(database, parentId);
  if (!parent) {
    return false;
  }

  if (parent.kind === "shared") {
    return isAdmin(user);
  }

  return canWriteSection(database, user, parent);
}

export function canReadDiagram(
  database: Database.Database,
  user: UserDto,
  diagram: DiagramAccessRow,
): boolean {
  if (isAdmin(user)) {
    return true;
  }

  if (diagram.owner_id === user.id || diagram.author_id === user.id) {
    return true;
  }

  if (diagram.section_id) {
    const section = getSectionRow(database, diagram.section_id);
    if (section && !canReadSection(database, user, section)) {
      return false;
    }
  }

  return canSeeVisibility(
    user,
    diagram.visibility,
    diagram.owner_id,
    database,
    diagram.section_id,
  );
}

export function canDownloadDiagram(
  database: Database.Database,
  user: UserDto,
  diagram: DiagramAccessRow,
): boolean {
  if (isAdmin(user)) {
    return true;
  }

  if (diagram.owner_id === user.id || diagram.author_id === user.id) {
    return true;
  }

  if (!canReadDiagram(database, user, diagram)) {
    return false;
  }

  if (diagram.section_id) {
    const section = getSectionRow(database, diagram.section_id);
    if (section && section.owner_id !== user.id) {
      return hasEffectiveSectionPermission(
        database,
        section.id,
        user.id,
        "download",
      );
    }
  }

  if (diagram.visibility === "subscription" && diagram.section_id) {
    return hasEffectiveSectionPermission(
      database,
      diagram.section_id,
      user.id,
      "download",
    );
  }

  return true;
}

export function canWriteDiagram(
  database: Database.Database,
  user: UserDto,
  diagram: DiagramAccessRow,
): boolean {
  if (isAdmin(user)) {
    return true;
  }

  if (diagram.owner_id === user.id || diagram.author_id === user.id) {
    return true;
  }

  if (!diagram.section_id) {
    return false;
  }

  const section = getSectionRow(database, diagram.section_id);
  if (!section) {
    return false;
  }

  if (!hasEffectiveSectionPermission(database, section.id, user.id, "contribute")) {
    return false;
  }

  return diagram.author_id === user.id;
}

export function filterReadableSections(
  database: Database.Database,
  user: UserDto,
  sections: SectionRow[],
): SectionRow[] {
  return sections.filter((section) => canReadSection(database, user, section));
}

export function defaultVisibilityForSectionKind(
  kind: SectionKind,
): DiagramVisibility {
  return kind === "personal" ? "personal" : "all";
}
