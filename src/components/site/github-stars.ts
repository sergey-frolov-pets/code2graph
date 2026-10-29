export const GITHUB_REPOSITORY = "sergey-frolov-pets/code2graph";

export const GITHUB_STAR_CACHE_TTL_MS = 60 * 60 * 1000;

const GITHUB_API_ACCEPT = "application/vnd.github+json";

export function githubStarCacheKey(repository: string): string {
  return `gh-stars:${repository}`;
}

export function githubRepositoryApiUrl(repository: string): string {
  return `https://api.github.com/repos/${repository}`;
}

export function githubApiAcceptHeader(): string {
  return GITHUB_API_ACCEPT;
}

export function readCachedStarCount(
  raw: string | null,
  nowMs: number,
  ttlMs: number,
): number | null {
  if (!raw) {
    return null;
  }

  try {
    const cached = JSON.parse(raw) as { n?: unknown; ts?: unknown };
    if (typeof cached.n !== "number" || typeof cached.ts !== "number") {
      return null;
    }
    if (nowMs - cached.ts >= ttlMs) {
      return null;
    }
    return cached.n;
  } catch {
    return null;
  }
}

export function writeCachedStarCount(count: number, nowMs: number): string {
  return JSON.stringify({ n: count, ts: nowMs });
}
