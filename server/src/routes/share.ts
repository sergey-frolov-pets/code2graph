import crypto from "node:crypto";
import { Hono } from "hono";
import { resolveOptionalUser } from "../auth.js";
import { getDb } from "../db.js";
import { collectSectionSubtree } from "../shared/section-tree.js";
import {
  enrichDiagramForUser,
  enrichDiagramListForUser,
  enrichSectionsForUser,
  mapDiagram,
  mapDiagramListItem,
} from "../shared/diagram-mappers.js";
import {
  canDownloadFromShareLink,
  mapShareLinkDto,
  recordShareDownload,
} from "../share-link-policy.js";
import {
  createShareLink,
  deleteShareLink,
  getShareLinkByToken,
} from "../share-links.js";
import type { SectionRow } from "../types.js";

export const shareRouter = new Hono();

function buildShareLinkResponse(link: NonNullable<ReturnType<typeof getShareLinkByToken>>) {
  return mapShareLinkDto(link);
}

const AI_CHAT_SNAPSHOT_MAX_BYTES = 512_000;

shareRouter.post("/ai-chat", async (context) => {
  const user = await resolveOptionalUser(context.req.header("Authorization"));
  if (!user) {
    return context.json({ error: "Authentication required" }, 401);
  }

  const body = await context.req
    .json<{ title?: string; diagramFormat?: string; snapshot?: unknown }>()
    .catch(() => null);
  if (!body || typeof body.snapshot !== "object" || body.snapshot === null) {
    return context.json({ error: "snapshot is required" }, 400);
  }

  const snapshotJson = JSON.stringify(body.snapshot);
  if (Buffer.byteLength(snapshotJson, "utf8") > AI_CHAT_SNAPSHOT_MAX_BYTES) {
    return context.json({ error: "snapshot is too large" }, 413);
  }

  const database = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO ai_chat_shares (id, title, diagram_format, snapshot, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      (body.title ?? "").slice(0, 200),
      (body.diagramFormat ?? "").slice(0, 40),
      snapshotJson,
      user.id,
      now,
    );

  const link = createShareLink(database, "ai-chat", id, user.id, {
    expiresAt: null,
    permission: "view",
    maxDownloads: null,
  });

  return context.json({ link: mapShareLinkDto(link) }, 201);
});

shareRouter.delete("/:token", async (context) => {
  const user = await resolveOptionalUser(context.req.header("Authorization"));
  if (!user) {
    return context.json({ error: "Authentication required" }, 401);
  }

  const token = context.req.param("token");
  const database = getDb();
  const link = getShareLinkByToken(database, token);
  if (!link) {
    return context.json({ error: "Share link not found or expired" }, 404);
  }
  if (link.created_by !== user.id) {
    return context.json({ error: "Forbidden" }, 403);
  }

  if (link.resource_type === "ai-chat") {
    database
      .prepare("DELETE FROM ai_chat_shares WHERE id = ?")
      .run(link.resource_id);
  }
  deleteShareLink(database, token);
  return context.json({ ok: true });
});

shareRouter.get("/:token", async (context) => {
  const token = context.req.param("token");
  const database = getDb();
  const link = getShareLinkByToken(database, token);

  if (!link) {
    return context.json({ error: "Share link not found or expired" }, 404);
  }

  const linkDto = buildShareLinkResponse(link);
  const optionalUser = await resolveOptionalUser(
    context.req.header("Authorization"),
  );

  if (link.resource_type === "ai-chat") {
    const row = database
      .prepare(
        `SELECT id, title, diagram_format, snapshot, created_at
         FROM ai_chat_shares WHERE id = ?`,
      )
      .get(link.resource_id) as { snapshot: string } | undefined;

    if (!row) {
      return context.json({ error: "AI chat snapshot not found" }, 404);
    }

    let snapshot: unknown;
    try {
      snapshot = JSON.parse(row.snapshot) as unknown;
    } catch {
      return context.json({ error: "AI chat snapshot is corrupted" }, 500);
    }

    return context.json({
      resourceType: "ai-chat",
      link: linkDto,
      chat: snapshot,
      readOnly: true,
    });
  }

  if (link.resource_type === "diagram") {
    const row = database
      .prepare(
        `SELECT id, section_id, title, description, tags, language,
                source, file_name, byte_size, author_id, owner_id, visibility,
                created_at, updated_at
         FROM diagrams WHERE id = ?`,
      )
      .get(link.resource_id) as Parameters<typeof mapDiagram>[0] | undefined;

    if (!row) {
      return context.json({ error: "Diagram not found" }, 404);
    }

    const diagram = mapDiagram(row);
    return context.json({
      resourceType: "diagram",
      link: linkDto,
      diagram: {
        ...diagram,
        source: "",
      },
      watermarkedPreview: true,
      canDownload: canDownloadFromShareLink(link),
      readOnly: true,
    });
  }

  const section = database
    .prepare(
      `SELECT id, parent_id, title, sort_order, kind, owner_id, author_id,
              visibility, created_at, updated_at
       FROM sections WHERE id = ?`,
    )
    .get(link.resource_id) as SectionRow | undefined;

  if (!section) {
    return context.json({ error: "Section not found" }, 404);
  }

  const allSections = database
    .prepare(
      `SELECT id, parent_id, title, sort_order, kind, owner_id, author_id,
              visibility, created_at, updated_at
       FROM sections`,
    )
    .all() as SectionRow[];

  const subtreeIds = [
    ...collectSectionSubtree(link.resource_id, allSections.map((entry) => ({
      id: entry.id,
      parentId: entry.parent_id,
    }))),
  ];

  const subtreeSections = allSections.filter((entry) =>
    subtreeIds.includes(entry.id),
  );

  const diagramRows = database
    .prepare(
      `SELECT id, section_id, title, description, tags, language,
              file_name, byte_size, author_id, owner_id, visibility,
              created_at, updated_at
       FROM diagrams
       WHERE section_id IN (${subtreeIds.map(() => "?").join(", ")})
       ORDER BY updated_at DESC`,
    )
    .all(...subtreeIds) as Array<Parameters<typeof mapDiagramListItem>[0]>;

  const sectionsDto = optionalUser
    ? enrichSectionsForUser(database, optionalUser, subtreeSections)
    : subtreeSections.map((row) => ({
        id: row.id,
        parentId: row.parent_id,
        title: row.title,
        sortOrder: row.sort_order,
        kind: row.kind,
        ownerId: row.owner_id,
        authorId: row.author_id,
        visibility: row.visibility,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

  const diagramsDto = optionalUser
    ? enrichDiagramListForUser(database, optionalUser, diagramRows)
    : diagramRows.map((row) => mapDiagramListItem(row));

  return context.json({
    resourceType: "section",
    link: linkDto,
    sectionId: link.resource_id,
    sections: sectionsDto,
    diagrams: diagramsDto,
    watermarkedPreview: true,
    canDownload: canDownloadFromShareLink(link),
    readOnly: true,
  });
});

shareRouter.get("/:token/diagrams/:id/preview", async (context) => {
  const token = context.req.param("token");
  const diagramId = context.req.param("id");
  const database = getDb();
  const link = getShareLinkByToken(database, token);

  if (!link) {
    return context.json({ error: "Share link not found or expired" }, 404);
  }

  const row = await resolveShareDiagramRow(database, link, diagramId);
  if (!row) {
    return context.json({ error: "Diagram not found" }, 404);
  }

  const diagram = mapDiagram(row);
  return context.json({
    link: buildShareLinkResponse(link),
    diagram,
    watermarkedPreview: true,
    canDownload: canDownloadFromShareLink(link),
  });
});

shareRouter.post("/:token/download", async (context) => {
  const token = context.req.param("token");
  const body = await context.req.json<{ diagramId?: string }>().catch(() => ({
    diagramId: undefined,
  }));

  const database = getDb();
  const updatedLink = recordShareDownload(database, token);
  if (!updatedLink) {
    return context.json({ error: "Download limit reached or link invalid" }, 403);
  }

  const diagramId =
    body.diagramId ??
    (updatedLink.resource_type === "diagram" ? updatedLink.resource_id : undefined);

  if (!diagramId) {
    return context.json({ error: "diagramId is required for section shares" }, 400);
  }

  const row = await resolveShareDiagramRow(database, updatedLink, diagramId);
  if (!row) {
    return context.json({ error: "Diagram not found" }, 404);
  }

  const diagram = mapDiagram(row);
  return context.json({
    link: buildShareLinkResponse(updatedLink),
    diagram,
    watermarkedPreview: false,
  });
});

async function resolveShareDiagramRow(
  database: ReturnType<typeof getDb>,
  link: NonNullable<ReturnType<typeof getShareLinkByToken>>,
  diagramId: string,
): Promise<Parameters<typeof mapDiagram>[0] | null> {
  const row = database
    .prepare(
      `SELECT id, section_id, title, description, tags, language,
              source, file_name, byte_size, author_id, owner_id, visibility,
              created_at, updated_at
       FROM diagrams WHERE id = ?`,
    )
    .get(diagramId) as Parameters<typeof mapDiagram>[0] | undefined;

  if (!row) {
    return null;
  }

  if (link.resource_type === "diagram") {
    return link.resource_id === diagramId ? row : null;
  }

  const allSections = database
    .prepare("SELECT id, parent_id FROM sections")
    .all() as Array<{ id: string; parent_id: string | null }>;

  const subtreeIds = [
    ...collectSectionSubtree(link.resource_id, allSections.map((entry) => ({
      id: entry.id,
      parentId: entry.parent_id,
    }))),
  ];

  if (!row.section_id || !subtreeIds.includes(row.section_id)) {
    return null;
  }

  return row;
}
