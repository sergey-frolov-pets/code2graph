import type Database from "better-sqlite3";
import { isDiagramLanguage } from "../config.js";
import { collectSectionSubtree } from "../shared/section-tree.js";
import { FAVORITES_SECTION_ID, isDiagramSortOption } from "../types.js";

export const DIAGRAM_LIST_SELECT = `
  SELECT id, section_id, title, description, tags, language, content_locale,
         file_name, byte_size, author_id, owner_id, visibility,
         avg_rating, vote_count, created_at, updated_at
  FROM diagrams
`;

export const DIAGRAM_LIST_SELECT_ALIASED = `
  SELECT d.id, d.section_id, d.title, d.description, d.tags, d.language, d.content_locale,
         d.file_name, d.byte_size, d.author_id, d.owner_id, d.visibility,
         d.avg_rating, d.vote_count, d.created_at, d.updated_at
  FROM diagrams d
`;

export const DIAGRAM_FULL_SELECT = `
  SELECT id, section_id, title, description, tags, language, content_locale,
         source, file_name, byte_size, author_id, owner_id, visibility,
         avg_rating, vote_count, created_at, updated_at
  FROM diagrams
`;

export interface DiagramListQueryParams {
  q?: string;
  sectionId?: string;
  tag?: string;
  language?: string;
  minRating?: number | null;
  minVotes?: number | null;
  sortBy?: string;
}

export interface DiagramListQueryContext {
  database: Database.Database;
  userId: string;
  params: DiagramListQueryParams;
}

export function parseDiagramListQuery(
  searchParams: URLSearchParams,
): DiagramListQueryParams {
  const sectionIdRaw = searchParams.get("sectionId")?.trim();
  const favoritesOnly = sectionIdRaw === FAVORITES_SECTION_ID;
  const sortByRaw = searchParams.get("sortBy")?.trim() ?? "updated";
  const minRatingRaw = searchParams.get("minRating")?.trim();
  const minVotesRaw = searchParams.get("minVotes")?.trim();

  return {
    q: searchParams.get("q")?.trim() ?? "",
    sectionId: favoritesOnly ? undefined : sectionIdRaw,
    tag: searchParams.get("tag")?.trim(),
    language: searchParams.get("language")?.trim(),
    minRating: minRatingRaw ? Number(minRatingRaw) : null,
    minVotes: minVotesRaw ? Number(minVotesRaw) : null,
    sortBy: isDiagramSortOption(sortByRaw) ? sortByRaw : "updated",
  };
}

export function isFavoritesList(sectionIdRaw?: string): boolean {
  return sectionIdRaw === FAVORITES_SECTION_ID;
}

export function buildDiagramListQuery(
  context: DiagramListQueryContext,
  favoritesOnly: boolean,
): { sql: string; params: unknown[] } {
  const { database, userId, params } = context;

  let sql = favoritesOnly
    ? `${DIAGRAM_LIST_SELECT_ALIASED}
       INNER JOIN diagram_favorites fav
         ON fav.diagram_id = d.id AND fav.user_id = ?
       WHERE 1=1`
    : `${DIAGRAM_LIST_SELECT} WHERE 1=1`;
  const queryParams: unknown[] = favoritesOnly ? [userId] : [];

  const col = favoritesOnly ? "d." : "";

  if (params.sectionId) {
    const allSections = database
      .prepare("SELECT id, parent_id FROM sections")
      .all() as Array<{ id: string; parent_id: string | null }>;
    const sectionIds = [
      ...collectSectionSubtree(
        params.sectionId,
        allSections.map((section) => ({
          id: section.id,
          parentId: section.parent_id,
        })),
      ),
    ];
    sql += ` AND ${col}section_id IN (${sectionIds.map(() => "?").join(", ")})`;
    queryParams.push(...sectionIds);
  }

  if (params.language && isDiagramLanguage(params.language)) {
    sql += ` AND ${col}language = ?`;
    queryParams.push(params.language);
  }

  if (params.tag) {
    sql += ` AND ${col}tags LIKE ?`;
    queryParams.push(`%"${params.tag.replace(/"/g, "")}"%`);
  }

  if (params.q) {
    sql += ` AND (${col}title LIKE ? OR ${col}description LIKE ? OR ${col}source LIKE ?)`;
    const pattern = `%${params.q}%`;
    queryParams.push(pattern, pattern, pattern);
  }

  if (params.minRating !== null && params.minRating !== undefined && !Number.isNaN(params.minRating) && params.minRating > 0) {
    sql += ` AND ${col}avg_rating IS NOT NULL AND ${col}avg_rating >= ?`;
    queryParams.push(params.minRating);
  }

  if (params.minVotes !== null && params.minVotes !== undefined && !Number.isNaN(params.minVotes) && params.minVotes > 0) {
    sql += ` AND ${col}vote_count >= ?`;
    queryParams.push(Math.floor(params.minVotes));
  }

  const sortBy = params.sortBy ?? "updated";
  if (favoritesOnly) {
    sql += " ORDER BY fav.created_at DESC";
  } else if (sortBy === "rating") {
    sql += ` ORDER BY ${col}avg_rating DESC, ${col}vote_count DESC, ${col}title ASC`;
  } else if (sortBy === "votes") {
    sql += ` ORDER BY ${col}vote_count DESC, ${col}avg_rating DESC, ${col}title ASC`;
  } else {
    sql += ` ORDER BY ${col}updated_at DESC, ${col}title ASC`;
  }

  return { sql, params: queryParams };
}
