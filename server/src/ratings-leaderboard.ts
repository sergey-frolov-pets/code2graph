import type Database from "better-sqlite3";
import {
  canReadDiagram,
  canReadSection,
  getSectionRow,
} from "./authz.js";
import { getUsernameMap } from "./db.js";
import { enrichDiagramListForUser } from "./shared/diagram-mappers.js";
import type { DiagramVisibility, RatingsLeaderboardDto, UserDto } from "./types.js";

const LEADERBOARD_LIMIT = 10;

export function getRatingsLeaderboard(
  database: Database.Database,
  user: UserDto,
): RatingsLeaderboardDto {
  const diagramRows = database
    .prepare(
      `SELECT id, section_id, title, description, tags, language, content_locale,
              file_name, byte_size, author_id, owner_id, visibility,
              avg_rating, vote_count, created_at, updated_at
       FROM diagrams
       WHERE vote_count > 0
       ORDER BY vote_count DESC, avg_rating DESC, title ASC
       LIMIT 50`,
    )
    .all() as Array<{
    id: string;
    section_id: string | null;
    title: string;
    description: string;
    tags: string;
    language: string;
    content_locale: string;
    file_name: string;
    byte_size: number;
    author_id: string | null;
    owner_id: string | null;
    visibility: string;
    avg_rating: number | null;
    vote_count: number;
    created_at: string;
    updated_at: string;
  }>;

  const readableDiagrams = diagramRows.filter((row) =>
    canReadDiagram(database, user, {
      id: row.id,
      section_id: row.section_id,
      author_id: row.author_id,
      owner_id: row.owner_id,
      visibility: row.visibility as DiagramVisibility,
    }),
  );

  const topDiagrams = enrichDiagramListForUser(
    database,
    user,
    readableDiagrams,
  ).slice(0, LEADERBOARD_LIMIT);

  const sectionRows = database
    .prepare(
      `SELECT s.id, s.title,
              COUNT(d.id) AS diagram_count,
              COALESCE(SUM(d.vote_count), 0) AS total_votes,
              AVG(d.avg_rating) AS avg_rating
       FROM sections s
       INNER JOIN diagrams d ON d.section_id = s.id AND d.vote_count > 0
       GROUP BY s.id
       ORDER BY total_votes DESC, avg_rating DESC, s.title ASC
       LIMIT 50`,
    )
    .all() as Array<{
    id: string;
    title: string;
    diagram_count: number;
    total_votes: number;
    avg_rating: number | null;
  }>;

  const topSections = sectionRows
    .filter((row) => {
      const section = getSectionRow(database, row.id);
      return section ? canReadSection(database, user, section) : false;
    })
    .slice(0, LEADERBOARD_LIMIT)
    .map((row) => ({
      sectionId: row.id,
      title: row.title,
      diagramCount: row.diagram_count,
      totalVotes: row.total_votes,
      avgRating: row.avg_rating,
    }));

  const authorRows = database
    .prepare(
      `SELECT d.author_id,
              COUNT(d.id) AS diagram_count,
              COALESCE(SUM(d.vote_count), 0) AS total_votes,
              AVG(d.avg_rating) AS avg_rating
       FROM diagrams d
       WHERE d.author_id IS NOT NULL AND d.vote_count > 0
       GROUP BY d.author_id
       ORDER BY total_votes DESC, avg_rating DESC
       LIMIT 50`,
    )
    .all() as Array<{
    author_id: string;
    diagram_count: number;
    total_votes: number;
    avg_rating: number | null;
  }>;

  const usernameMap = getUsernameMap(
    database,
    authorRows.map((row) => row.author_id),
  );

  const topAuthors = authorRows
    .slice(0, LEADERBOARD_LIMIT)
    .map((row) => ({
      authorId: row.author_id,
      username: usernameMap.get(row.author_id) ?? row.author_id,
      diagramCount: row.diagram_count,
      totalVotes: row.total_votes,
      avgRating: row.avg_rating,
    }));

  return { topDiagrams, topSections, topAuthors };
}
