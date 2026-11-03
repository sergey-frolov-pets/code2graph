import { Hono } from "hono";
import type { AuthVariables } from "../../auth/context.js";
import { registerDiagramListRoutes } from "./list.js";
import { registerDiagramCrudRoutes } from "./crud.js";
import { registerDiagramShareRoutes } from "./share.js";
import { registerDiagramFavoriteRoutes } from "./favorites.js";
import { registerDiagramRatingRoutes } from "./ratings.js";
import { registerDiagramVersionRoutes } from "./versions.js";

export const diagramsRouter = new Hono<{ Variables: AuthVariables }>();

registerDiagramListRoutes(diagramsRouter);
registerDiagramCrudRoutes(diagramsRouter);
registerDiagramShareRoutes(diagramsRouter);
registerDiagramFavoriteRoutes(diagramsRouter);
registerDiagramRatingRoutes(diagramsRouter);
registerDiagramVersionRoutes(diagramsRouter);
