import type Database from "better-sqlite3";
import { canWriteDiagram } from "./authz.js";
import {
  LIBRARY_LINK_STATS_PERIOD_DAYS,
  LIBRARY_LINK_STATS_RETENTION_DAYS,
  type LibraryLinkStatsPeriod,
} from "./config.js";
import {
  campaignFromReferrer,
  countryCode,
  isBotUserAgent,
  isLibraryLinkSessionId,
  parseBrowserFamily,
  parseSystemFamily,
  primaryLanguage,
  referrerHost,
  sanitizeCampaign,
  screenBucket,
  utcDay,
  visitorHash,
} from "./library-link-policy.js";
import { LibraryLinkRequestError, findLibraryLinkByNames } from "./library-links.js";
import { getDiagramAccessContext } from "./services/diagrams-access.js";
import type { UserDto } from "./types.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface LibraryLinkHitInput {
  sessionId: string;
  screenWidth?: number;
  language?: string;
  campaign?: string;
  userAgent?: string;
  countryHeader?: string;
  referrer?: string;
  now?: Date;
}

export interface LibraryLinkStatBucket {
  key: string;
  views: number;
}

export interface LibraryLinkStats {
  periodDays: LibraryLinkStatsPeriod;
  views: number;
  visitors: number;
  days: Array<{ day: string; views: number; visitors: number }>;
  countries: LibraryLinkStatBucket[];
  browsers: LibraryLinkStatBucket[];
  systems: LibraryLinkStatBucket[];
  languages: LibraryLinkStatBucket[];
  sizes: LibraryLinkStatBucket[];
  referrers: LibraryLinkStatBucket[];
  campaigns: LibraryLinkStatBucket[];
}

function assertStatsPeriod(value: number): LibraryLinkStatsPeriod {
  if ((LIBRARY_LINK_STATS_PERIOD_DAYS as readonly number[]).includes(value)) {
    return value as LibraryLinkStatsPeriod;
  }
  throw new LibraryLinkRequestError(400, "Период статистики: 7, 30 или 90 дней");
}

export function recordLibraryLinkHit(
  database: Database.Database,
  username: string,
  slug: string,
  input: LibraryLinkHitInput,
): void {
  if (isBotUserAgent(input.userAgent)) {
    return;
  }
  if (!isLibraryLinkSessionId(input.sessionId)) {
    throw new LibraryLinkRequestError(400, "Некорректная сессия");
  }

  const link = findLibraryLinkByNames(database, username, slug);
  if (!link) {
    throw new LibraryLinkRequestError(404, "Ссылка не найдена");
  }

  const now = input.now ?? new Date();
  const day = utcDay(now);
  const cutoff = utcDay(
    new Date(now.getTime() - LIBRARY_LINK_STATS_RETENTION_DAYS * DAY_MS),
  );
  database.prepare("DELETE FROM library_link_hits WHERE day < ?").run(cutoff);

  database
    .prepare(
      `INSERT INTO library_link_hits (
        id, link_id, day, visitor_hash, country, browser, system_name, language,
        screen_size, referrer_host, campaign, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      crypto.randomUUID(),
      link.id,
      day,
      visitorHash(day, input.sessionId),
      countryCode(input.countryHeader),
      parseBrowserFamily(input.userAgent),
      parseSystemFamily(input.userAgent),
      primaryLanguage(input.language),
      screenBucket(input.screenWidth ?? 0),
      referrerHost(input.referrer),
      sanitizeCampaign(input.campaign) || campaignFromReferrer(input.referrer),
      now.toISOString(),
    );
}

function buckets(
  database: Database.Database,
  linkId: string,
  since: string,
  column: string,
): LibraryLinkStatBucket[] {
  const rows = database
    .prepare(
      `SELECT ${column} AS key, COUNT(*) AS views
       FROM library_link_hits
       WHERE link_id = ? AND day >= ? AND ${column} != ''
       GROUP BY ${column}
       ORDER BY views DESC, key ASC`,
    )
    .all(linkId, since) as LibraryLinkStatBucket[];
  return rows;
}

export function readLibraryLinkStats(
  database: Database.Database,
  user: UserDto,
  diagramId: string,
  linkId: string,
  periodDays: number,
): LibraryLinkStats {
  const period = assertStatsPeriod(periodDays);
  const access = getDiagramAccessContext(database, diagramId);
  if (!access) {
    throw new LibraryLinkRequestError(404, "Диаграмма не найдена");
  }
  if (!canWriteDiagram(database, user, access.access)) {
    throw new LibraryLinkRequestError(403, "Недостаточно прав");
  }

  const link = database
    .prepare("SELECT id, diagram_id FROM library_links WHERE id = ?")
    .get(linkId) as { id: string; diagram_id: string } | undefined;
  if (!link || link.diagram_id !== diagramId) {
    throw new LibraryLinkRequestError(404, "Ссылка не найдена");
  }

  const since = utcDay(new Date(Date.now() - (period - 1) * DAY_MS));
  const totals = database
    .prepare(
      `SELECT COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors
       FROM library_link_hits
       WHERE link_id = ? AND day >= ?`,
    )
    .get(link.id, since) as { views: number; visitors: number };
  const days = database
    .prepare(
      `SELECT day, COUNT(*) AS views, COUNT(DISTINCT visitor_hash) AS visitors
       FROM library_link_hits
       WHERE link_id = ? AND day >= ?
       GROUP BY day
       ORDER BY day ASC`,
    )
    .all(link.id, since) as Array<{ day: string; views: number; visitors: number }>;

  return {
    periodDays: period,
    views: totals.views,
    visitors: totals.visitors,
    days,
    countries: buckets(database, link.id, since, "country"),
    browsers: buckets(database, link.id, since, "browser"),
    systems: buckets(database, link.id, since, "system_name"),
    languages: buckets(database, link.id, since, "language"),
    sizes: buckets(database, link.id, since, "screen_size"),
    referrers: buckets(database, link.id, since, "referrer_host"),
    campaigns: buckets(database, link.id, since, "campaign"),
  };
}
