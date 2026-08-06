import type Database from "better-sqlite3";
import type {
  DiagramVisibility,
  SectionKind,
  SectionRow,
  UserDto,
} from "./types.js";

export interface SectionAccessGrant {
  section_id: string;
  user_id: string;
  expires_at: string | null;
}

export interface DiagramAccessRow {
  id: string;
  section_id: string | null;
  author_id: string | null;
  owner_id: string | null;
  visibility: DiagramVisibility;
}

export function isAdmin(user: UserDto): boolean {
  return user.role === "admin";
}

export function isSubscriptionActive(user: UserDto): boolean {
  return user.subscriptionActive;
}

export function canSeeVisibility(
  user: UserDto,
  visibility: DiagramVisibility,
  ownerId: string | null,
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
      return isSubscriptionActive(user);
    default:
      return false;
  }
}

function isGrantActive(expiresAt: string | null): boolean {
  if (!expiresAt) {
    return true;
  }
  return new Date(expiresAt).getTime() > Date.now();
}

export function getSectionAccessGrants(
  database: Database.Database,
  sectionId: string,
): SectionAccessGrant[] {
  return database
    .prepare(
      `SELECT section_id, user_id, expires_at
       FROM section_access
       WHERE section_id = ?`,
    )
    .all(sectionId) as SectionAccessGrant[];
}

export function hasSectionAccessGrant(
  database: Database.Database,
  sectionId: string,
  userId: string,
): boolean {
  const row = database
    .prepare(
      `SELECT expires_at FROM section_access
       WHERE section_id = ? AND user_id = ?`,
    )
    .get(sectionId, userId) as { expires_at: string | null } | undefined;

  if (!row) {
    return false;
  }

  return isGrantActive(row.expires_at);
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

  if (hasSectionAccessGrant(database, section.id, user.id)) {
    return true;
  }

  if (section.kind === "shared" && section.visibility === "all") {
    return true;
  }

  if (
    section.kind === "personal" &&
    section.owner_id === user.id &&
    canSeeVisibility(user, section.visibility, section.owner_id)
  ) {
    return true;
  }

  return false;
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

  return hasSectionAccessGrant(database, section.id, user.id);
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

  return canSeeVisibility(user, diagram.visibility, diagram.owner_id);
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

  return canWriteSection(database, user, section);
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
