import type Database from "better-sqlite3";
import { getUsernameMap } from "./db.js";
import type {
  DiagramRatingDto,
  RatingCommentStatus,
  UserDto,
} from "./types.js";

export interface DiagramRatingRow {
  id: string;
  diagram_id: string;
  user_id: string;
  rating: number;
  comment: string;
  comment_status: RatingCommentStatus;
  created_at: string;
  updated_at: string;
}

export interface DiagramRatingVersionRow {
  id: string;
  rating_id: string;
  version_number: number;
  rating: number;
  comment: string;
  comment_status: RatingCommentStatus;
  edited_by: string;
  created_at: string;
}

function normalizeComment(comment: string | undefined): string {
  return comment?.trim() ?? "";
}

function commentStatusForNew(comment: string): RatingCommentStatus {
  return comment ? "pending" : "none";
}

export function recomputeDiagramRatingStats(
  database: Database.Database,
  diagramId: string,
): void {
  const stats = database
    .prepare(
      `SELECT COUNT(*) AS vote_count, AVG(rating) AS avg_rating
       FROM diagram_ratings WHERE diagram_id = ?`,
    )
    .get(diagramId) as { vote_count: number; avg_rating: number | null };

  database
    .prepare(
      "UPDATE diagrams SET vote_count = ?, avg_rating = ? WHERE id = ?",
    )
    .run(stats.vote_count, stats.avg_rating, diagramId);
}

export function getUserDiagramRating(
  database: Database.Database,
  diagramId: string,
  userId: string,
): DiagramRatingRow | null {
  const row = database
    .prepare(
      `SELECT id, diagram_id, user_id, rating, comment, comment_status,
              created_at, updated_at
       FROM diagram_ratings WHERE diagram_id = ? AND user_id = ?`,
    )
    .get(diagramId, userId) as DiagramRatingRow | undefined;

  return row ?? null;
}

function nextRatingVersionNumber(
  database: Database.Database,
  ratingId: string,
): number {
  const row = database
    .prepare(
      "SELECT MAX(version_number) AS max_number FROM diagram_rating_versions WHERE rating_id = ?",
    )
    .get(ratingId) as { max_number: number | null };

  return (row.max_number ?? 0) + 1;
}

export function recordRatingVersion(
  database: Database.Database,
  rating: DiagramRatingRow,
  editedBy: string,
): void {
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO diagram_rating_versions (
        id, rating_id, version_number, rating, comment, comment_status,
        edited_by, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      rating.id,
      nextRatingVersionNumber(database, rating.id),
      rating.rating,
      rating.comment,
      rating.comment_status,
      editedBy,
      now,
    );
}

export function upsertOwnDiagramStars(
  database: Database.Database,
  diagramId: string,
  userId: string,
  rating: number,
): DiagramRatingRow {
  const now = new Date().toISOString();
  const existing = getUserDiagramRating(database, diagramId, userId);

  if (existing) {
    database
      .prepare(
        "UPDATE diagram_ratings SET rating = ?, updated_at = ? WHERE id = ?",
      )
      .run(rating, now, existing.id);
  } else {
    const id = crypto.randomUUID();
    database
      .prepare(
        `INSERT INTO diagram_ratings (
          id, diagram_id, user_id, rating, comment, comment_status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, '', 'none', ?, ?)`,
      )
      .run(id, diagramId, userId, rating, now, now);
  }

  recomputeDiagramRatingStats(database, diagramId);
  return getUserDiagramRating(database, diagramId, userId)!;
}

export function upsertOwnDiagramRatingComment(
  database: Database.Database,
  diagramId: string,
  userId: string,
  comment: string,
): DiagramRatingRow {
  const normalizedComment = normalizeComment(comment);
  const now = new Date().toISOString();
  const existing = getUserDiagramRating(database, diagramId, userId);

  if (!existing) {
    throw new Error("Rating stars are required before comment");
  }

  if (existing.comment !== normalizedComment) {
    recordRatingVersion(database, existing, userId);
  }

  const commentStatus = commentStatusForNew(normalizedComment);
  database
    .prepare(
      `UPDATE diagram_ratings
       SET comment = ?, comment_status = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(normalizedComment, commentStatus, now, existing.id);

  return getUserDiagramRating(database, diagramId, userId)!;
}

export function updateDiagramRatingByModerator(
  database: Database.Database,
  diagramId: string,
  ratingUserId: string,
  editorId: string,
  payload: { rating?: number; comment?: string; commentStatus?: RatingCommentStatus },
): DiagramRatingRow | null {
  const existing = getUserDiagramRating(database, diagramId, ratingUserId);
  if (!existing) {
    return null;
  }

  recordRatingVersion(database, existing, editorId);

  const rating = payload.rating ?? existing.rating;
  const comment =
    payload.comment !== undefined
      ? normalizeComment(payload.comment)
      : existing.comment;
  let commentStatus = payload.commentStatus ?? existing.comment_status;

  if (payload.comment !== undefined && !payload.commentStatus) {
    commentStatus = commentStatusForNew(comment);
  }

  const now = new Date().toISOString();
  database
    .prepare(
      `UPDATE diagram_ratings
       SET rating = ?, comment = ?, comment_status = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(rating, comment, commentStatus, now, existing.id);

  recomputeDiagramRatingStats(database, diagramId);
  return getUserDiagramRating(database, diagramId, ratingUserId);
}

export function deleteDiagramRating(
  database: Database.Database,
  diagramId: string,
  ratingUserId: string,
  editorId: string,
): boolean {
  const existing = getUserDiagramRating(database, diagramId, ratingUserId);
  if (!existing) {
    return false;
  }

  recordRatingVersion(database, existing, editorId);
  database
    .prepare("DELETE FROM diagram_ratings WHERE id = ?")
    .run(existing.id);
  recomputeDiagramRatingStats(database, diagramId);
  return true;
}

export function moderateDiagramRatingComment(
  database: Database.Database,
  diagramId: string,
  ratingUserId: string,
  editorId: string,
  status: "approved" | "rejected",
): DiagramRatingRow | null {
  const row = getUserDiagramRating(database, diagramId, ratingUserId);
  if (!row || !row.comment || row.comment_status === "none") {
    return null;
  }

  recordRatingVersion(database, row, editorId);
  const now = new Date().toISOString();
  database
    .prepare(
      "UPDATE diagram_ratings SET comment_status = ?, updated_at = ? WHERE id = ?",
    )
    .run(status, now, row.id);

  return getUserDiagramRating(database, diagramId, ratingUserId);
}

export function canModerateRatingComment(
  diagramAuthorId: string | null,
  user: UserDto,
): boolean {
  return user.role === "admin" || diagramAuthorId === user.id;
}

export function canEditOrDeleteRating(
  ratingUserId: string,
  user: UserDto,
): boolean {
  return user.role === "admin" || ratingUserId === user.id;
}

export function mapRatingDto(
  row: DiagramRatingRow,
  username?: string | null,
  options?: { includeComment?: boolean },
): DiagramRatingDto {
  const includeComment = options?.includeComment ?? false;
  const visibleComment =
    includeComment && row.comment && row.comment_status === "approved";

  return {
    id: row.id,
    diagramId: row.diagram_id,
    userId: row.user_id,
    username: username ?? undefined,
    rating: row.rating,
    comment: visibleComment ? row.comment : undefined,
    commentStatus: row.comment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listApprovedRatingComments(
  database: Database.Database,
  diagramId: string,
): DiagramRatingDto[] {
  const rows = database
    .prepare(
      `SELECT id, diagram_id, user_id, rating, comment, comment_status,
              created_at, updated_at
       FROM diagram_ratings
       WHERE diagram_id = ? AND comment_status = 'approved' AND comment != ''
       ORDER BY updated_at DESC`,
    )
    .all(diagramId) as DiagramRatingRow[];

  const usernameMap = getUsernameMap(
    database,
    rows.map((row) => row.user_id),
  );

  return rows.map((row) =>
    mapRatingDto(row, usernameMap.get(row.user_id), { includeComment: true }),
  );
}

export function listPendingRatingCommentsForAuthor(
  database: Database.Database,
  diagramId: string,
): DiagramRatingDto[] {
  const rows = database
    .prepare(
      `SELECT id, diagram_id, user_id, rating, comment, comment_status,
              created_at, updated_at
       FROM diagram_ratings
       WHERE diagram_id = ? AND comment_status = 'pending' AND comment != ''
       ORDER BY updated_at DESC`,
    )
    .all(diagramId) as DiagramRatingRow[];

  const usernameMap = getUsernameMap(
    database,
    rows.map((row) => row.user_id),
  );

  return rows.map((row) => {
    const dto = mapRatingDto(row, usernameMap.get(row.user_id));
    return {
      ...dto,
      comment: row.comment,
    };
  });
}

export function getOwnRatingCommentForUser(
  row: DiagramRatingRow | null,
): string | undefined {
  if (!row || !row.comment) {
    return undefined;
  }

  if (row.comment_status === "approved" || row.comment_status === "pending") {
    return row.comment;
  }

  return undefined;
}

export function enrichDiagramRowsWithSocial(
  database: Database.Database,
  user: UserDto,
  rows: Array<{
    id: string;
    avg_rating: number | null;
    vote_count: number;
  }>,
): {
  avgRating: number | null;
  voteCount: number;
  isFavorite: boolean;
  userRating: number | null;
  userCommentStatus: RatingCommentStatus | null;
  userComment: string | undefined;
}[] {
  const diagramIds = rows.map((row) => row.id);
  const favoriteSet = diagramIds.length
    ? database
        .prepare(
          `SELECT diagram_id FROM diagram_favorites
           WHERE user_id = ? AND diagram_id IN (${diagramIds.map(() => "?").join(", ")})`,
        )
        .all(user.id, ...diagramIds) as Array<{ diagram_id: string }>
    : [];

  const favoriteIds = new Set(favoriteSet.map((row) => row.diagram_id));

  const userRatings = diagramIds.length
    ? (database
        .prepare(
          `SELECT diagram_id, rating, comment, comment_status
           FROM diagram_ratings
           WHERE user_id = ? AND diagram_id IN (${diagramIds.map(() => "?").join(", ")})`,
        )
        .all(user.id, ...diagramIds) as Array<{
        diagram_id: string;
        rating: number;
        comment: string;
        comment_status: RatingCommentStatus;
      }>)
    : [];

  const ratingByDiagram = new Map(
    userRatings.map((row) => [row.diagram_id, row]),
  );

  return rows.map((row) => {
    const userRatingRow = ratingByDiagram.get(row.id);
    return {
      avgRating: row.avg_rating ?? null,
      voteCount: row.vote_count ?? 0,
      isFavorite: favoriteIds.has(row.id),
      userRating: userRatingRow?.rating ?? null,
      userCommentStatus: userRatingRow?.comment_status ?? null,
      userComment: userRatingRow
        ? getOwnRatingCommentForUser({
            id: "",
            diagram_id: row.id,
            user_id: user.id,
            rating: userRatingRow.rating,
            comment: userRatingRow.comment,
            comment_status: userRatingRow.comment_status,
            created_at: "",
            updated_at: "",
          })
        : undefined,
    };
  });
}

export function listRatingVersions(
  database: Database.Database,
  ratingId: string,
): DiagramRatingVersionRow[] {
  return database
    .prepare(
      `SELECT id, rating_id, version_number, rating, comment, comment_status,
              edited_by, created_at
       FROM diagram_rating_versions
       WHERE rating_id = ?
       ORDER BY version_number DESC, created_at DESC`,
    )
    .all(ratingId) as DiagramRatingVersionRow[];
}
