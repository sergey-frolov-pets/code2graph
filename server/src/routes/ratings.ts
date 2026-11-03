import { Hono } from "hono";
import { requireAuthenticatedUser } from "../auth.js";
import type { AuthVariables } from "../auth/context.js";
import { getDb } from "../db.js";
import { getRatingsLeaderboard } from "../ratings-leaderboard.js";

export const ratingsRouter = new Hono<{ Variables: AuthVariables }>();

ratingsRouter.get("/leaderboard", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const database = getDb();
  return context.json(getRatingsLeaderboard(database, user));
});
