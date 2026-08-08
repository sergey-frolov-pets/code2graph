import type { Hono } from "hono";
import type { AuthVariables } from "../../auth/context.js";

export type DiagramsRouter = Hono<{ Variables: AuthVariables }>;
