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

function normalizeComment(comment: string | undefined): string {
  return comment?.trim() ?? "";
}

function commentStatusFor(comment: string): RatingCommentStatus {
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

export function upsertDiagramRating(
  database: Database.Database,
  diagramId: string,
  userId: string,
  rating: number,
  comment?: string,
): DiagramRatingRow {
  const normalizedComment = normalizeComment(comment);
  const now = new Date().toISOString();
  const existing = getUserDiagramRating(database, diagramId, userId);

  if (existing) {
    let commentStatus = existing.comment_status;
    let storedComment = existing.comment;

    if (normalizedComment !== existing.comment) {
      storedComment = normalizedComment;
      commentStatus = commentStatusFor(normalizedComment);
      if (normalizedComment && commentStatus === "pending") {
        commentStatus = "pending";
      }
    }

    database
      .prepare(
        `UPDATE diagram_ratings
         SET rating = ?, comment = ?, comment_status = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(rating, storedComment, commentStatus, now, existing.id);
  } else {
    const id = crypto.randomUUID();
    const commentStatus = commentStatusFor(normalizedComment);
    database
      .prepare(
        `INSERT INTO diagram_ratings (
          id, diagram_id, user_id, rating, comment, comment_status,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        diagramId,
        userId,
        rating,
        normalizedComment,
        commentStatus,
        now,
        now,
      );
  }

  recomputeDiagramRatingStats(database, diagramId);

  return getUserDiagramRating(database, diagramId, userId)!;
}

export function moderateDiagramRatingComment(
  database: Database.Database,
  diagramId: string,
  ratingUserId: string,
  status: "approved" | "rejected",
): DiagramRatingRow | null {
  const row = getUserDiagramRating(database, diagramId, ratingUserId);
  if (!row || !row.comment || row.comment_status === "none") {
    return null;
  }

  const now = new Date().toISOString();
  database
    .prepare(
      "UPDATE diagram_ratings SET comment_status = ?, updated_at = ? WHERE id = ?",
    )
    .run(status, now, row.id);

  return getUserDiagramRating(database, diagramId, ratingUserId);
}

export function mapRatingDto(
  row: DiagramRatingRow,
  username?: string | null,
  options?: { includeComment?: boolean },
): DiagramRatingDto {
  const includeComment = options?.includeComment ?? false;
  const hasVisibleComment =
    includeComment && row.comment && row.comment_status === "approved";

  return {
    id: row.id,
    diagramId: row.diagram_id,
    userId: row.user_id,
    username: username ?? undefined,
    rating: row.rating,
    comment: hasVisibleComment ? row.comment : undefined,
    commentStatus: row.comment_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listDiagramRatingsForViewer(
  database: Database.Database,
  diagram: {
    id: string;
    author_id: string | null;
  },
  viewer: UserDto,
): DiagramRatingDto[] {
  const rows = database
    .prepare(
      `SELECT id, diagram_id, user_id, rating, comment, comment_status,
              created_at, updated_at
       FROM diagram_ratings WHERE diagram_id = ?
       ORDER BY updated_at DESC`,
    )
    .all(diagram.id) as DiagramRatingRow[];

  const usernameMap = getUsernameMap(
    database,
    rows.map((row) => row.user_id),
  );

  const isAuthor =
    diagram.author_id === viewer.id || viewer.role === "admin";

  return rows
    .filter((row) => {
      if (row.user_id === viewer.id) {
        return true;
      }
      if (isAuthor && row.comment_status === "pending" && row.comment) {
        return true;
      }
      return row.comment_status === "approved" && row.comment;
    })
    .map((row) => {
      const includeComment =
        row.user_id === viewer.id ||
        (isAuthor && row.comment_status === "pending") ||
        row.comment_status === "approved";

      return mapRatingDto(row, usernameMap.get(row.user_id), {
        includeComment,
      });
    });
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
          `SELECT diagram_id, rating, comment_status
           FROM diagram_ratings
           WHERE user_id = ? AND diagram_id IN (${diagramIds.map(() => "?").join(", ")})`,
        )
        .all(user.id, ...diagramIds) as Array<{
        diagram_id: string;
        rating: number;
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
    };
  });
}
