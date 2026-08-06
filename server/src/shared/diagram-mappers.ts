import { parseTags, getUsernameMap } from "../db.js";
import { enrichDiagramRowsWithSocial } from "../ratings.js";
import {
  canAdminSection,
  canReadSection,
  canWriteSection,
} from "../authz.js";
import type Database from "better-sqlite3";
import type {
  DiagramDto,
  DiagramListItemDto,
  SectionDto,
  UserDto,
} from "../types.js";

export function mapSection(
  row: {
    id: string;
    parent_id: string | null;
    title: string;
    sort_order: number;
    kind: string;
    owner_id: string | null;
    author_id: string | null;
    visibility: string;
    created_at: string;
    updated_at: string;
  },
  options?: {
    authorName?: string | null;
    canWrite?: boolean;
    canAdmin?: boolean;
  },
): SectionDto {
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    sortOrder: row.sort_order,
    kind: row.kind as SectionDto["kind"],
    ownerId: row.owner_id,
    authorId: row.author_id,
    authorName: options?.authorName ?? undefined,
    visibility: row.visibility as SectionDto["visibility"],
    canWrite: options?.canWrite,
    canAdmin: options?.canAdmin,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapSectionForUser(
  database: Database.Database,
  user: UserDto,
  row: Parameters<typeof mapSection>[0],
  usernameMap?: Map<string, string>,
): SectionDto {
  const sectionRow = {
    ...row,
    kind: row.kind,
    owner_id: row.owner_id,
    author_id: row.author_id,
    visibility: row.visibility,
  };

  return mapSection(row, {
    authorName: row.author_id
      ? usernameMap?.get(row.author_id) ?? null
      : null,
    canWrite: canWriteSection(database, user, sectionRow as never),
    canAdmin: canAdminSection(database, user, sectionRow as never),
  });
}

export function mapDiagramListItem(
  row: {
    id: string;
    section_id: string | null;
    title: string;
    description: string;
    tags: string;
    language: string;
    file_name: string;
    byte_size: number;
    author_id: string | null;
    owner_id: string | null;
    visibility: string;
    avg_rating?: number | null;
    vote_count?: number;
    created_at: string;
    updated_at: string;
  },
  options?: {
    authorName?: string | null;
    canWrite?: boolean;
    avgRating?: number | null;
    voteCount?: number;
    isFavorite?: boolean;
    userRating?: number | null;
    userCommentStatus?: string | null;
    userComment?: string;
  },
): DiagramListItemDto {
  return {
    id: row.id,
    sectionId: row.section_id,
    title: row.title,
    description: row.description,
    tags: parseTags(row.tags),
    language: row.language as DiagramListItemDto["language"],
    fileName: row.file_name,
    byteSize: row.byte_size,
    authorId: row.author_id,
    ownerId: row.owner_id,
    authorName: options?.authorName ?? undefined,
    visibility: row.visibility as DiagramListItemDto["visibility"],
    canWrite: options?.canWrite,
    avgRating: options?.avgRating ?? row.avg_rating ?? null,
    voteCount: options?.voteCount ?? row.vote_count ?? 0,
    isFavorite: options?.isFavorite,
    userRating: options?.userRating ?? undefined,
    userCommentStatus: options?.userCommentStatus as DiagramListItemDto["userCommentStatus"],
    userComment: options?.userComment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDiagram(
  row: {
    id: string;
    section_id: string | null;
    title: string;
    description: string;
    tags: string;
    language: string;
    source: string;
    file_name: string;
    byte_size: number;
    author_id: string | null;
    owner_id: string | null;
    visibility: string;
    avg_rating?: number | null;
    vote_count?: number;
    created_at: string;
    updated_at: string;
  },
  options?: {
    authorName?: string | null;
    canWrite?: boolean;
    avgRating?: number | null;
    voteCount?: number;
    isFavorite?: boolean;
    userRating?: number | null;
    userCommentStatus?: string | null;
    userComment?: string;
  },
): DiagramDto {
  return {
    ...mapDiagramListItem(row, options),
    source: row.source,
  };
}

export function enrichSectionsForUser(
  database: Database.Database,
  user: UserDto,
  rows: Parameters<typeof mapSection>[0][],
): SectionDto[] {
  const usernameMap = getUsernameMap(
    database,
    rows.map((row) => row.author_id ?? ""),
  );

  return rows.map((row) => mapSectionForUser(database, user, row, usernameMap));
}

export function enrichDiagramListForUser(
  database: Database.Database,
  user: UserDto,
  rows: Parameters<typeof mapDiagramListItem>[0][],
): DiagramListItemDto[] {
  const usernameMap = getUsernameMap(
    database,
    rows.map((row) => row.author_id ?? ""),
  );

  const socialRows = rows.map((row) => ({
    id: row.id,
    avg_rating: row.avg_rating ?? null,
    vote_count: row.vote_count ?? 0,
  }));
  const socialData = enrichDiagramRowsWithSocial(database, user, socialRows);

  return rows.map((row, index) => {
    const social = socialData[index];
    return mapDiagramListItem(row, {
      authorName: row.author_id
        ? usernameMap.get(row.author_id) ?? null
        : null,
      canWrite: false,
      avgRating: social.avgRating,
      voteCount: social.voteCount,
      isFavorite: social.isFavorite,
      userRating: social.userRating,
      userCommentStatus: social.userCommentStatus,
      userComment: social.userComment,
    });
  });
}

export function enrichDiagramForUser(
  database: Database.Database,
  user: UserDto,
  row: Parameters<typeof mapDiagram>[0],
): DiagramDto {
  const usernameMap = getUsernameMap(database, [row.author_id ?? ""]);
  const social = enrichDiagramRowsWithSocial(database, user, [
    {
      id: row.id,
      avg_rating: row.avg_rating ?? null,
      vote_count: row.vote_count ?? 0,
    },
  ])[0];

  return mapDiagram(row, {
    authorName: row.author_id
      ? usernameMap.get(row.author_id) ?? null
      : null,
    canWrite: false,
    avgRating: social.avgRating,
    voteCount: social.voteCount,
    isFavorite: social.isFavorite,
    userRating: social.userRating,
    userCommentStatus: social.userCommentStatus,
    userComment: social.userComment,
  });
}

export function filterReadableSectionRows(
  database: Database.Database,
  user: UserDto,
  rows: Parameters<typeof mapSection>[0][],
): Parameters<typeof mapSection>[0][] {
  return rows.filter((row) =>
    canReadSection(database, user, row as never),
  );
}
