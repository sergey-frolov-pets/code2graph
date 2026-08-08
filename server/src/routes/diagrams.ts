import { Hono } from "hono";
import { requireAuthenticatedUser } from "../auth.js";
import type { AuthVariables } from "../auth/context.js";
import {
  canDownloadDiagram,
  canReadDiagram,
  canReadSection,
  canWriteDiagram,
  canWriteSection,
  defaultVisibilityForSectionKind,
  getSectionRow,
} from "../authz.js";
import { getDb, parseTags, getUsernameMap } from "../db.js";
import { isDiagramLanguage, MAX_PUML_FILE_BYTES } from "../config.js";
import {
  enrichDiagramForUser,
  enrichDiagramListForUser,
  mapDiagram,
} from "../shared/diagram-mappers.js";
import {
  detectLanguageFromFileName,
  detectLanguageFromSource,
  resolvePumlFileName,
} from "../shared/puml-files.js";
import { collectSectionSubtree } from "../shared/section-tree.js";
import {
  createShareLink,
  listShareLinksForResource,
} from "../share-links.js";
import { mapShareLinkDto } from "../share-link-policy.js";
import {
  addDiagramFavorite,
  removeDiagramFavorite,
} from "../favorites.js";
import {
  canModerateRatingComment,
  canEditOrDeleteRating,
  deleteDiagramRating,
  listApprovedRatingComments,
  listPendingRatingCommentsForAuthor,
  moderateDiagramRatingComment,
  updateDiagramRatingByModerator,
  upsertOwnDiagramRatingComment,
  upsertOwnDiagramStars,
} from "../ratings.js";
import {
  canManageDiagramVersions,
  createDiagramVersion,
  deleteDiagramVersion,
  getDiagramVersion,
  listDiagramVersions,
  mapDiagramVersionDto,
  snapshotDiagramSourceVersion,
} from "../diagram-versions.js";
import type { DiagramVisibility } from "../types.js";
import {
  FAVORITES_SECTION_ID,
  isDiagramSortOption,
  isDiagramVisibility,
  isContentLocale,
  isSharePermission,
} from "../types.js";

export const diagramsRouter = new Hono<{ Variables: AuthVariables }>();

const DIAGRAM_LIST_SELECT = `
  SELECT id, section_id, title, description, tags, language, content_locale,
         file_name, byte_size, author_id, owner_id, visibility,
         avg_rating, vote_count, created_at, updated_at
  FROM diagrams
`;

const DIAGRAM_LIST_SELECT_ALIASED = `
  SELECT d.id, d.section_id, d.title, d.description, d.tags, d.language, d.content_locale,
         d.file_name, d.byte_size, d.author_id, d.owner_id, d.visibility,
         d.avg_rating, d.vote_count, d.created_at, d.updated_at
  FROM diagrams d
`;

const DIAGRAM_FULL_SELECT = `
  SELECT id, section_id, title, description, tags, language, content_locale,
         source, file_name, byte_size, author_id, owner_id, visibility,
         avg_rating, vote_count, created_at, updated_at
  FROM diagrams
`;

function toDiagramAccessRow(row: {
  id: string;
  section_id: string | null;
  author_id: string | null;
  owner_id: string | null;
  visibility: string;
}): {
  id: string;
  section_id: string | null;
  author_id: string | null;
  owner_id: string | null;
  visibility: DiagramVisibility;
} {
  return {
    id: row.id,
    section_id: row.section_id,
    author_id: row.author_id,
    owner_id: row.owner_id,
    visibility: row.visibility as DiagramVisibility,
  };
}

function applyDiagramPermissions(
  database: ReturnType<typeof getDb>,
  user: Parameters<typeof canWriteDiagram>[1],
  row: Parameters<typeof toDiagramAccessRow>[0],
  diagram: { canWrite?: boolean; canDownload?: boolean },
): void {
  const access = toDiagramAccessRow(row);
  diagram.canWrite = canWriteDiagram(database, user, access);
  diagram.canDownload = canDownloadDiagram(database, user, access);
}

diagramsRouter.get("/", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const database = getDb();
  const query = context.req.query("q")?.trim() ?? "";
  const sectionIdRaw = context.req.query("sectionId")?.trim();
  const favoritesOnly = sectionIdRaw === FAVORITES_SECTION_ID;
  const sectionId = favoritesOnly ? undefined : sectionIdRaw;
  const tag = context.req.query("tag")?.trim();
  const language = context.req.query("language")?.trim();
  const minRatingRaw = context.req.query("minRating")?.trim();
  const minVotesRaw = context.req.query("minVotes")?.trim();
  const sortByRaw = context.req.query("sortBy")?.trim() ?? "updated";
  const sortBy = isDiagramSortOption(sortByRaw) ? sortByRaw : "updated";

  const minRating = minRatingRaw ? Number(minRatingRaw) : null;
  const minVotes = minVotesRaw ? Number(minVotesRaw) : null;

  if (sectionId) {
    const section = getSectionRow(database, sectionId);
    if (!section || !canReadSection(database, user, section)) {
      return context.json({ error: "Раздел не найден или недоступен" }, 403);
    }
  }

  let sql = favoritesOnly
    ? `${DIAGRAM_LIST_SELECT_ALIASED}
       INNER JOIN diagram_favorites fav
         ON fav.diagram_id = d.id AND fav.user_id = ?
       WHERE 1=1`
    : `${DIAGRAM_LIST_SELECT} WHERE 1=1`;
  const params: unknown[] = favoritesOnly ? [user.id] : [];

  const col = favoritesOnly ? "d." : "";

  if (sectionId) {
    const allSections = database
      .prepare("SELECT id, parent_id FROM sections")
      .all() as Array<{ id: string; parent_id: string | null }>;
    const sectionIds = [
      ...collectSectionSubtree(
        sectionId,
        allSections.map((section) => ({
          id: section.id,
          parentId: section.parent_id,
        })),
      ),
    ];
    sql += ` AND ${col}section_id IN (${sectionIds.map(() => "?").join(", ")})`;
    params.push(...sectionIds);
  }

  if (language && isDiagramLanguage(language)) {
    sql += ` AND ${col}language = ?`;
    params.push(language);
  }

  if (tag) {
    sql += ` AND ${col}tags LIKE ?`;
    params.push(`%"${tag.replace(/"/g, "")}"%`);
  }

  if (query) {
    sql += ` AND (${col}title LIKE ? OR ${col}description LIKE ? OR ${col}source LIKE ?)`;
    const pattern = `%${query}%`;
    params.push(pattern, pattern, pattern);
  }

  if (minRating !== null && !Number.isNaN(minRating) && minRating > 0) {
    sql += ` AND ${col}avg_rating IS NOT NULL AND ${col}avg_rating >= ?`;
    params.push(minRating);
  }

  if (minVotes !== null && !Number.isNaN(minVotes) && minVotes > 0) {
    sql += ` AND ${col}vote_count >= ?`;
    params.push(Math.floor(minVotes));
  }

  if (favoritesOnly) {
    sql += " ORDER BY fav.created_at DESC";
  } else if (sortBy === "rating") {
    sql += ` ORDER BY ${col}avg_rating DESC, ${col}vote_count DESC, ${col}title ASC`;
  } else if (sortBy === "votes") {
    sql += ` ORDER BY ${col}vote_count DESC, ${col}avg_rating DESC, ${col}title ASC`;
  } else {
    sql += ` ORDER BY ${col}updated_at DESC, ${col}title ASC`;
  }

  const rows = database.prepare(sql).all(...params) as Array<
    Parameters<typeof mapDiagram>[0]
  >;

  const readable = rows.filter((row) =>
    canReadDiagram(database, user, {
      id: row.id,
      section_id: row.section_id,
      author_id: row.author_id,
      owner_id: row.owner_id,
      visibility: row.visibility as DiagramVisibility,
    }),
  );

  const diagrams = enrichDiagramListForUser(database, user, readable).map(
    (diagram, index) => {
      const enriched = { ...diagram };
      applyDiagramPermissions(database, user, readable[index], enriched);
      return enriched;
    },
  );

  return context.json({
    diagrams,
    total: diagrams.length,
  });
});

diagramsRouter.get("/:id", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const database = getDb();
  const row = database
    .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
    .get(id) as Parameters<typeof mapDiagram>[0] | undefined;

  if (!row) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  if (
    !canReadDiagram(database, user, {
      id: row.id,
      section_id: row.section_id,
      author_id: row.author_id,
      owner_id: row.owner_id,
      visibility: row.visibility as DiagramVisibility,
    })
  ) {
    return context.json({ error: "Диаграмма недоступна" }, 403);
  }

  const diagram = enrichDiagramForUser(database, user, row);
  applyDiagramPermissions(database, user, row, diagram);

  return context.json(diagram);
});

diagramsRouter.post("/", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const contentType = context.req.header("content-type") ?? "";

  let title = "";
  let description = "";
  let tags: string[] = [];
  let language = "plantuml";
  let sectionId: string | null = null;
  let source = "";
  let fileName = "diagram.puml";
  let visibility: DiagramVisibility = "all";
  let contentLocale = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await context.req.formData();
    const file = formData.get("file");

    title = String(formData.get("title") ?? "").trim();
    description = String(formData.get("description") ?? "").trim();
    sectionId = String(formData.get("sectionId") ?? "").trim() || null;
    const tagsRaw = String(formData.get("tags") ?? "").trim();
    const languageRaw = String(formData.get("language") ?? "").trim();
    const visibilityRaw = String(formData.get("visibility") ?? "").trim();
    const contentLocaleRaw = String(formData.get("contentLocale") ?? "").trim();

    if (contentLocaleRaw && isContentLocale(contentLocaleRaw)) {
      contentLocale = contentLocaleRaw;
    }

    if (tagsRaw) {
      tags = tagsRaw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    if (languageRaw && isDiagramLanguage(languageRaw)) {
      language = languageRaw;
    }

    if (visibilityRaw && isDiagramVisibility(visibilityRaw)) {
      visibility = visibilityRaw;
    }

    if (file instanceof File) {
      if (file.size > MAX_PUML_FILE_BYTES) {
        return context.json(
          {
            error: `Файл слишком большой. Максимум ${MAX_PUML_FILE_BYTES} байт`,
          },
          413,
        );
      }
      source = await file.text();
      fileName = resolvePumlFileName(file.name);
      if (!languageRaw || !isDiagramLanguage(languageRaw)) {
        language =
          detectLanguageFromFileName(file.name) ??
          detectLanguageFromSource(source);
      }
      if (!title) {
        title = fileName.replace(/\.(puml|plantuml|txt|mmd|mermaid|graphml)$/i, "");
      }
    } else {
      const sourceField = formData.get("source");
      if (typeof sourceField === "string") {
        source = sourceField;
      }
    }
  } else {
    const body = await context.req.json<{
      title?: string;
      description?: string;
      tags?: string[];
      language?: string;
      sectionId?: string | null;
      source?: string;
      fileName?: string;
      visibility?: string;
      contentLocale?: string;
    }>();

    title = body.title?.trim() ?? "";
    description = body.description?.trim() ?? "";
    tags = Array.isArray(body.tags)
      ? body.tags.map((tag) => tag.trim()).filter(Boolean)
      : [];
    sectionId = body.sectionId ?? null;
    source = body.source ?? "";
    fileName = resolvePumlFileName(body.fileName ?? "diagram.puml");

    if (body.language && isDiagramLanguage(body.language)) {
      language = body.language;
    }

    if (body.visibility && isDiagramVisibility(body.visibility)) {
      visibility = body.visibility;
    }

    if (body.contentLocale && isContentLocale(body.contentLocale)) {
      contentLocale = body.contentLocale;
    }
  }

  if (!source.trim()) {
    return context.json({ error: "Исходный код диаграммы обязателен" }, 400);
  }

  const byteSize = Buffer.byteLength(source, "utf8");
  if (byteSize > MAX_PUML_FILE_BYTES) {
    return context.json(
      { error: `Содержимое слишком большое. Максимум ${MAX_PUML_FILE_BYTES} байт` },
      413,
    );
  }

  if (!title) {
    title = fileName.replace(/\.(puml|plantuml|txt|mmd|mermaid|graphml)$/i, "") || "Диаграмма";
  }

  if (!isDiagramLanguage(language)) {
    language =
      detectLanguageFromFileName(fileName) ?? detectLanguageFromSource(source);
  }

  const database = getDb();
  if (sectionId) {
    const section = getSectionRow(database, sectionId);
    if (!section) {
      return context.json({ error: "Раздел не найден" }, 404);
    }
    if (!canWriteSection(database, user, section)) {
      return context.json({ error: "Недостаточно прав для раздела" }, 403);
    }
    if (!visibility || visibility === "all") {
      visibility = defaultVisibilityForSectionKind(section.kind);
    }
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  database
    .prepare(
      `INSERT INTO diagrams (
        id, section_id, title, description, tags, language, content_locale,
        source, file_name, byte_size, author_id, owner_id, visibility,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      sectionId,
      title,
      description,
      JSON.stringify(tags),
      language,
      contentLocale,
      source,
      fileName,
      byteSize,
      user.id,
      user.id,
      visibility,
      now,
      now,
    );

  const row = database
    .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
    .get(id) as Parameters<typeof mapDiagram>[0];

  const diagram = enrichDiagramForUser(database, user, row);
  diagram.canWrite = true;
  diagram.canDownload = true;

  return context.json(diagram, 201);
});

diagramsRouter.put("/:id", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const body = await context.req.json<{
    title?: string;
    description?: string;
    tags?: string[];
    language?: string;
    sectionId?: string | null;
    source?: string;
    fileName?: string;
    visibility?: string;
    contentLocale?: string;
  }>();

  const database = getDb();
  const current = database
    .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
    .get(id) as Parameters<typeof mapDiagram>[0] | undefined;

  if (!current) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  const accessRow = {
    id: current.id,
    section_id: current.section_id,
    author_id: current.author_id,
    owner_id: current.owner_id,
    visibility: current.visibility as DiagramVisibility,
  };

  if (!canWriteDiagram(database, user, accessRow)) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  const source = body.source ?? current.source;
  const byteSize = Buffer.byteLength(source, "utf8");
  if (byteSize > MAX_PUML_FILE_BYTES) {
    return context.json(
      { error: `Содержимое слишком большое. Максимум ${MAX_PUML_FILE_BYTES} байт` },
      413,
    );
  }

  const sectionId =
    body.sectionId !== undefined ? body.sectionId : current.section_id;

  if (sectionId) {
    const section = getSectionRow(database, sectionId);
    if (!section) {
      return context.json({ error: "Раздел не найден" }, 404);
    }
    if (!canWriteSection(database, user, section)) {
      return context.json({ error: "Недостаточно прав для раздела" }, 403);
    }
  }

  const language =
    body.language && isDiagramLanguage(body.language)
      ? body.language
      : current.language;

  let visibility = current.visibility as DiagramVisibility;
  if (body.visibility && isDiagramVisibility(body.visibility)) {
    visibility = body.visibility;
  }

  const contentLocale =
    body.contentLocale !== undefined && isContentLocale(body.contentLocale)
      ? body.contentLocale
      : (current.content_locale ?? "");

  if (source !== current.source) {
    snapshotDiagramSourceVersion(
      database,
      id,
      user.id,
      current.source,
      "",
    );
  }

  const now = new Date().toISOString();

  database
    .prepare(
      `UPDATE diagrams
       SET section_id = ?, title = ?, description = ?, tags = ?, language = ?,
           content_locale = ?, source = ?, file_name = ?, byte_size = ?,
           visibility = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      sectionId,
      body.title?.trim() || current.title,
      body.description !== undefined ? body.description.trim() : current.description,
      JSON.stringify(
        Array.isArray(body.tags)
          ? body.tags.map((tag) => tag.trim()).filter(Boolean)
          : parseTags(current.tags),
      ),
      language,
      contentLocale,
      source,
      body.fileName ? resolvePumlFileName(body.fileName) : current.file_name,
      byteSize,
      visibility,
      now,
      id,
    );

  const row = database
    .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
    .get(id) as Parameters<typeof mapDiagram>[0];

  const diagram = enrichDiagramForUser(database, user, row);
  diagram.canWrite = true;

  return context.json(diagram);
});

diagramsRouter.delete("/:id", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const database = getDb();
  const current = database
    .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
    .get(id) as Parameters<typeof mapDiagram>[0] | undefined;

  if (!current) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  if (
    !canWriteDiagram(database, user, {
      id: current.id,
      section_id: current.section_id,
      author_id: current.author_id,
      owner_id: current.owner_id,
      visibility: current.visibility as DiagramVisibility,
    })
  ) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  database.prepare("DELETE FROM diagrams WHERE id = ?").run(id);
  return context.json({ ok: true });
});

diagramsRouter.get("/:id/share", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const database = getDb();
  const row = database
    .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
    .get(id) as Parameters<typeof mapDiagram>[0] | undefined;

  if (!row) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  if (
    !canReadDiagram(database, user, {
      id: row.id,
      section_id: row.section_id,
      author_id: row.author_id,
      owner_id: row.owner_id,
      visibility: row.visibility as DiagramVisibility,
    })
  ) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  const links = listShareLinksForResource(database, "diagram", id).map((link) =>
    mapShareLinkDto(link),
  );

  return context.json({ links });
});

diagramsRouter.post("/:id/share", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const id = context.req.param("id");
  const body = await context.req.json<{
    expiresAt?: string | null;
    permanent?: boolean;
    permission?: string;
    maxDownloads?: number | null;
  }>();

  const database = getDb();
  const row = database
    .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
    .get(id) as Parameters<typeof mapDiagram>[0] | undefined;

  if (!row) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  if (
    !canReadDiagram(database, user, {
      id: row.id,
      section_id: row.section_id,
      author_id: row.author_id,
      owner_id: row.owner_id,
      visibility: row.visibility as DiagramVisibility,
    })
  ) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  const expiresAt =
    body.permanent || body.expiresAt === null
      ? null
      : body.expiresAt ?? null;

  const permission =
    body.permission && isSharePermission(body.permission)
      ? body.permission
      : "view";

  const link = createShareLink(database, "diagram", id, user.id, {
    expiresAt,
    permission,
    maxDownloads: body.maxDownloads,
  });

  return context.json({
    link: mapShareLinkDto(link),
  }, 201);
});

function getDiagramAccessContext(
  database: ReturnType<typeof getDb>,
  diagramId: string,
): {
  row: Parameters<typeof mapDiagram>[0];
  access: {
    id: string;
    section_id: string | null;
    author_id: string | null;
    owner_id: string | null;
    visibility: DiagramVisibility;
  };
} | null {
  const row = database
    .prepare(`${DIAGRAM_FULL_SELECT} WHERE id = ?`)
    .get(diagramId) as Parameters<typeof mapDiagram>[0] | undefined;

  if (!row) {
    return null;
  }

  return {
    row,
    access: {
      id: row.id,
      section_id: row.section_id,
      author_id: row.author_id,
      owner_id: row.owner_id,
      visibility: row.visibility as DiagramVisibility,
    },
  };
}

diagramsRouter.post("/:id/favorite", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const diagramId = context.req.param("id");
  const database = getDb();
  const contextRow = getDiagramAccessContext(database, diagramId);

  if (!contextRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  if (!canReadDiagram(database, user, contextRow.access)) {
    return context.json({ error: "Диаграмма недоступна" }, 403);
  }

  addDiagramFavorite(database, user.id, diagramId);
  const diagram = enrichDiagramForUser(database, user, contextRow.row);
  diagram.canWrite = canWriteDiagram(database, user, contextRow.access);

  return context.json(diagram);
});

diagramsRouter.delete("/:id/favorite", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const diagramId = context.req.param("id");
  const database = getDb();
  const contextRow = getDiagramAccessContext(database, diagramId);

  if (!contextRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  removeDiagramFavorite(database, user.id, diagramId);
  const diagram = enrichDiagramForUser(database, user, contextRow.row);
  diagram.canWrite = canWriteDiagram(database, user, contextRow.access);

  return context.json(diagram);
});

diagramsRouter.get("/:id/ratings", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const diagramId = context.req.param("id");
  const database = getDb();
  const contextRow = getDiagramAccessContext(database, diagramId);

  if (!contextRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  if (!canReadDiagram(database, user, contextRow.access)) {
    return context.json({ error: "Диаграмма недоступна" }, 403);
  }

  const approved = listApprovedRatingComments(database, contextRow.row.id);
  const pending = canModerateRatingComment(
    contextRow.row.author_id,
    user,
  )
    ? listPendingRatingCommentsForAuthor(database, contextRow.row.id)
    : [];

  return context.json({ approved, pending });
});

diagramsRouter.post("/:id/ratings/stars", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const diagramId = context.req.param("id");
  const body = await context.req.json<{ rating?: number }>();
  const rating = Number(body.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return context.json({ error: "Оценка должна быть от 1 до 5" }, 400);
  }

  const database = getDb();
  const contextRow = getDiagramAccessContext(database, diagramId);

  if (!contextRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  if (!canReadDiagram(database, user, contextRow.access)) {
    return context.json({ error: "Диаграмма недоступна" }, 403);
  }

  upsertOwnDiagramStars(database, diagramId, user.id, rating);
  const refreshed = getDiagramAccessContext(database, diagramId);
  if (!refreshed) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  const diagram = enrichDiagramForUser(database, user, refreshed.row);
  diagram.canWrite = canWriteDiagram(database, user, refreshed.access);

  return context.json(diagram);
});

diagramsRouter.post("/:id/ratings/comment", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const diagramId = context.req.param("id");
  const body = await context.req.json<{ comment?: string }>();

  const database = getDb();
  const contextRow = getDiagramAccessContext(database, diagramId);

  if (!contextRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  if (!canReadDiagram(database, user, contextRow.access)) {
    return context.json({ error: "Диаграмма недоступна" }, 403);
  }

  try {
    upsertOwnDiagramRatingComment(
      database,
      diagramId,
      user.id,
      body.comment ?? "",
    );
  } catch (error) {
    return context.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Сначала выберите оценку",
      },
      400,
    );
  }

  const refreshed = getDiagramAccessContext(database, diagramId);
  if (!refreshed) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  const diagram = enrichDiagramForUser(database, user, refreshed.row);
  diagram.canWrite = canWriteDiagram(database, user, refreshed.access);

  return context.json(diagram);
});

diagramsRouter.put("/:id/ratings/:ratingUserId", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const diagramId = context.req.param("id");
  const ratingUserId = context.req.param("ratingUserId");
  const body = await context.req.json<{
    rating?: number;
    comment?: string;
    commentStatus?: string;
  }>();

  const database = getDb();
  const contextRow = getDiagramAccessContext(database, diagramId);

  if (!contextRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  if (!canEditOrDeleteRating(ratingUserId, user)) {
    return context.json(
      { error: "Изменение оценки доступно автору оценки или админу" },
      403,
    );
  }

  const rating = body.rating;
  if (
    rating !== undefined &&
    (!Number.isInteger(rating) || rating < 1 || rating > 5)
  ) {
    return context.json({ error: "Оценка должна быть от 1 до 5" }, 400);
  }

  const updated = updateDiagramRatingByModerator(
    database,
    diagramId,
    ratingUserId,
    user.id,
    {
      rating,
      comment: body.comment,
      commentStatus:
        body.commentStatus === "approved" ||
        body.commentStatus === "rejected" ||
        body.commentStatus === "pending" ||
        body.commentStatus === "none"
          ? body.commentStatus
          : undefined,
    },
  );

  if (!updated) {
    return context.json({ error: "Оценка не найдена" }, 404);
  }

  return context.json({ ok: true });
});

diagramsRouter.delete("/:id/ratings/:ratingUserId", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const diagramId = context.req.param("id");
  const ratingUserId = context.req.param("ratingUserId");
  const database = getDb();
  const contextRow = getDiagramAccessContext(database, diagramId);

  if (!contextRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  if (!canEditOrDeleteRating(ratingUserId, user)) {
    return context.json(
      { error: "Удаление оценки доступно автору оценки или админу" },
      403,
    );
  }

  const deleted = deleteDiagramRating(
    database,
    diagramId,
    ratingUserId,
    user.id,
  );

  if (!deleted) {
    return context.json({ error: "Оценка не найдена" }, 404);
  }

  return context.json({ ok: true });
});

diagramsRouter.put("/:id/ratings/:ratingUserId/moderate", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const diagramId = context.req.param("id");
  const ratingUserId = context.req.param("ratingUserId");
  const body = await context.req.json<{ status?: string }>();
  const status = body.status;

  if (status !== "approved" && status !== "rejected") {
    return context.json({ error: "Некорректный статус модерации" }, 400);
  }

  const database = getDb();
  const contextRow = getDiagramAccessContext(database, diagramId);

  if (!contextRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  const isAuthor =
    canModerateRatingComment(contextRow.row.author_id, user);

  if (!isAuthor) {
    return context.json({ error: "Модерация доступна автору диаграммы" }, 403);
  }

  const updated = moderateDiagramRatingComment(
    database,
    diagramId,
    ratingUserId,
    user.id,
    status,
  );

  if (!updated) {
    return context.json({ error: "Комментарий не найден" }, 404);
  }

  return context.json({ ok: true });
});

diagramsRouter.get("/:id/versions", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const diagramId = context.req.param("id");
  const database = getDb();
  const contextRow = getDiagramAccessContext(database, diagramId);

  if (!contextRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  if (!canReadDiagram(database, user, contextRow.access)) {
    return context.json({ error: "Диаграмма недоступна" }, 403);
  }

  const rows = listDiagramVersions(database, diagramId);
  const usernameMap = getUsernameMap(
    database,
    rows.map((row) => row.author_id),
  );

  return context.json({
    versions: rows.map((row) =>
      mapDiagramVersionDto(row, usernameMap.get(row.author_id)),
    ),
  });
});

diagramsRouter.post("/:id/versions", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const diagramId = context.req.param("id");
  const body = await context.req.json<{ source?: string; comment?: string }>();
  const database = getDb();
  const contextRow = getDiagramAccessContext(database, diagramId);

  if (!contextRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  const canWrite = canWriteDiagram(database, user, contextRow.access);
  if (
    !canManageDiagramVersions(user, {
      author_id: contextRow.row.author_id,
    }, canWrite)
  ) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  const source = body.source?.trim() || contextRow.row.source;
  if (!source) {
    return context.json({ error: "Исходный код обязателен" }, 400);
  }

  const version = createDiagramVersion(
    database,
    diagramId,
    user.id,
    source,
    body.comment ?? "",
  );

  return context.json({
    version: mapDiagramVersionDto(version, user.username),
  }, 201);
});

diagramsRouter.delete("/:id/versions/:versionId", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const diagramId = context.req.param("id");
  const versionId = context.req.param("versionId");
  const database = getDb();
  const contextRow = getDiagramAccessContext(database, diagramId);

  if (!contextRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  const canWrite = canWriteDiagram(database, user, contextRow.access);
  if (
    !canManageDiagramVersions(user, {
      author_id: contextRow.row.author_id,
    }, canWrite)
  ) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  const deleted = deleteDiagramVersion(database, diagramId, versionId);
  if (!deleted) {
    return context.json({ error: "Версия не найдена" }, 404);
  }

  return context.json({ ok: true });
});

diagramsRouter.post("/:id/versions/:versionId/restore", async (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const diagramId = context.req.param("id");
  const versionId = context.req.param("versionId");
  const database = getDb();
  const contextRow = getDiagramAccessContext(database, diagramId);

  if (!contextRow) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  if (!canWriteDiagram(database, user, contextRow.access)) {
    return context.json({ error: "Недостаточно прав" }, 403);
  }

  const version = getDiagramVersion(database, diagramId, versionId);
  if (!version) {
    return context.json({ error: "Версия не найдена" }, 404);
  }

  snapshotDiagramSourceVersion(
    database,
    diagramId,
    user.id,
    contextRow.row.source,
    `Before restore v${version.version_number}`,
  );

  const byteSize = Buffer.byteLength(version.source, "utf8");
  const now = new Date().toISOString();

  database
    .prepare(
      `UPDATE diagrams
       SET source = ?, byte_size = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(version.source, byteSize, now, diagramId);

  const refreshed = getDiagramAccessContext(database, diagramId);
  if (!refreshed) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  const diagram = enrichDiagramForUser(database, user, refreshed.row);
  diagram.canWrite = true;

  return context.json(diagram);
});
