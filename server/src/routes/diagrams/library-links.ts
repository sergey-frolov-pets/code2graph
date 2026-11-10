import { requireAuthenticatedUser } from "../../auth.js";
import { LIBRARY_LINK_STATS_PERIOD_DAYS } from "../../config.js";
import { getDb } from "../../db.js";
import { LibraryLinkRequestError } from "../../library-links.js";
import {
  createLibraryLink,
  deleteLibraryLink,
  listLibraryLinks,
  saveLibraryLinkSnapshot,
  updateLibraryLink,
} from "../../library-links.js";
import { readLibraryLinkStats } from "../../library-link-stats.js";
import type { DiagramsRouter } from "./types.js";

function fail(error: unknown): Response {
  if (error instanceof LibraryLinkRequestError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  throw error;
}

export function registerDiagramLibraryLinkRoutes(router: DiagramsRouter): void {
  router.get("/:id/library-links", (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }
    try {
      return context.json({
        links: listLibraryLinks(getDb(), user, context.req.param("id")),
      });
    } catch (error) {
      return fail(error);
    }
  });

  router.post("/:id/library-links", async (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }
    const body = await context.req
      .json<{
        slug?: string;
        delivery?: string;
        dataAccess?: string;
        viewRender?: string | null;
      }>()
      .catch(() => ({
        slug: undefined,
        delivery: undefined,
        dataAccess: undefined,
        viewRender: undefined,
      }));
    try {
      const link = createLibraryLink(getDb(), user, context.req.param("id"), {
        slug: body.slug ?? "",
        delivery: body.delivery ?? "",
        dataAccess: body.dataAccess ?? "",
        viewRender: body.viewRender,
      });
      return context.json({ link }, 201);
    } catch (error) {
      return fail(error);
    }
  });

  router.patch("/:id/library-links/:linkId", async (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }
    const body = await context.req
      .json<{
        slug?: string;
        delivery?: string;
        dataAccess?: string;
        viewRender?: string | null;
      }>()
      .catch(() => ({
        slug: undefined,
        delivery: undefined,
        dataAccess: undefined,
        viewRender: undefined,
      }));
    try {
      const link = updateLibraryLink(
        getDb(),
        user,
        context.req.param("id"),
        context.req.param("linkId"),
        {
          slug: body.slug ?? "",
          delivery: body.delivery ?? "",
          dataAccess: body.dataAccess ?? "",
          viewRender: body.viewRender,
        },
      );
      return context.json({ link });
    } catch (error) {
      return fail(error);
    }
  });

  router.delete("/:id/library-links/:linkId", (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }
    try {
      deleteLibraryLink(
        getDb(),
        user,
        context.req.param("id"),
        context.req.param("linkId"),
      );
      return context.body(null, 204);
    } catch (error) {
      return fail(error);
    }
  });

  router.put("/:id/library-links/:linkId/snapshot", async (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }
    const body = await context.req
      .json<{ svg?: string }>()
      .catch(() => ({ svg: undefined }));
    try {
      const link = saveLibraryLinkSnapshot(
        getDb(),
        user,
        context.req.param("id"),
        context.req.param("linkId"),
        body.svg ?? "",
      );
      return context.json({ link });
    } catch (error) {
      return fail(error);
    }
  });

  router.get("/:id/library-links/:linkId/stats", (context) => {
    const user = requireAuthenticatedUser(context);
    if (user instanceof Response) {
      return user;
    }
    const requested = Number(context.req.query("period") ?? LIBRARY_LINK_STATS_PERIOD_DAYS[1]);
    try {
      return context.json(
        readLibraryLinkStats(
          getDb(),
          user,
          context.req.param("id"),
          context.req.param("linkId"),
          requested,
        ),
      );
    } catch (error) {
      return fail(error);
    }
  });
}
