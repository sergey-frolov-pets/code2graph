import { Hono } from "hono";
import { LIBRARY_LINK_LIVE_LANGUAGES } from "../library-link-render.js";
import { LibraryLinkRequestError, readPublicLibraryLink } from "../library-links.js";
import { recordLibraryLinkHit } from "../library-link-stats.js";
import { getDb } from "../db.js";

export const libraryLinksPublicRouter = new Hono();

function fail(error: unknown): Response {
  if (error instanceof LibraryLinkRequestError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  throw error;
}

libraryLinksPublicRouter.get("/live-languages", (context) => {
  return context.json({ languages: LIBRARY_LINK_LIVE_LANGUAGES });
});

libraryLinksPublicRouter.get("/:username/:slug", (context) => {
  try {
    const payload = readPublicLibraryLink(
      getDb(),
      context.req.param("username"),
      context.req.param("slug"),
    );
    return context.json(payload);
  } catch (error) {
    return fail(error);
  }
});

libraryLinksPublicRouter.post("/:username/:slug/hit", async (context) => {
  const body = await context.req
    .json<{
      sessionId?: string;
      screenWidth?: number;
      language?: string;
      campaign?: string;
    }>()
    .catch(() => ({
      sessionId: undefined,
      screenWidth: undefined,
      language: undefined,
      campaign: undefined,
    }));

  try {
    recordLibraryLinkHit(
      getDb(),
      context.req.param("username"),
      context.req.param("slug"),
      {
        sessionId: body.sessionId ?? "",
        screenWidth: body.screenWidth,
        language: body.language,
        campaign: body.campaign,
        userAgent: context.req.header("user-agent"),
        countryHeader:
          context.req.header("cf-ipcountry") ??
          context.req.header("x-country-code"),
        referrer: context.req.header("referer"),
      },
    );
    return context.body(null, 204);
  } catch (error) {
    return fail(error);
  }
});
