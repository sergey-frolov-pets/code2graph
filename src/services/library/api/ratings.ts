import type { RatingsLeaderboardDto } from "@/constants/diagram-library";
import { requestJson } from "./client";

export async function fetchRatingsLeaderboard(
  baseUrl?: string,
): Promise<RatingsLeaderboardDto> {
  return requestJson("/ratings/leaderboard", undefined, baseUrl);
}
