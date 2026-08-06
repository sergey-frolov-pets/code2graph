import { Hono } from "hono";
import { requireAuthenticatedUser } from "../auth.js";
import type { AuthVariables } from "../auth/context.js";
import {
  canReadDiagram,
  canReadSection,
  canWriteDiagram,
  canWriteSection,
  defaultVisibilityForSectionKind,
  getSectionRow,
} from "../authz.js";
import { getDb, parseTags } from "../db.js";
import { isDiagramLanguage, MAX_PUML_FILE_BYTES } from "../config.js";
import {
  enrichDiagramForUser,
  enrichDiagramListForUser,
  mapDiagram,
} from "../shared/diagram-mappers.js";
import {
  detectLanguageFromSource,
  resolvePumlFileName,
} from "../shared/puml-files.js";
import { collectSectionSubtree } from "../shared/section-tree.js";
import {
  createShareLink,
  listShareLinksForResource,
} from "../share-links.js";
import type { DiagramVisibility } from "../types.js";
import { isDiagramVisibility } from "../types.js";

export const diagramsRouter = new Hono<{ Variables: AuthVariables }>();

const DIAGRAM_LIST_SELECT = `
  SELECT id, section_id, title, description, tags, language,
         file_name, byte_size, author_id, owner_id, visibility,
         created_at, updated_at
  FROM diagrams
`;

const DIAGRAM_FULL_SELECT = `
  SELECT id, section_id, title, description, tags, language,
         source, file_name, byte_size, author_id, owner_id, visibility,
         created_at, updated_at
  FROM diagrams
`;

diagramsRouter.get("/", (context) => {
  const user = requireAuthenticatedUser(context);
  if (user instanceof Response) {
    return user;
  }

  const database = getDb();
  const query = context.req.query("q")?.trim() ?? "";
  const sectionId = context.req.query("sectionId")?.trim();
  const tag = context.req.query("tag")?.trim();
  const language = context.req.query("language")?.trim();

  if (sectionId) {
    const section = getSectionRow(database, sectionId);
    if (!section || !canReadSection(database, user, section)) {
      return context.json({ error: "Раздел не найден или недоступен" }, 403);
    }
  }

  let sql = `${DIAGRAM_LIST_SELECT} WHERE 1=1`;
  const params: unknown[] = [];

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
    sql += ` AND section_id IN (${sectionIds.map(() => "?").join(", ")})`;
    params.push(...sectionIds);
  }

  if (language && isDiagramLanguage(language)) {
    sql += " AND language = ?";
    params.push(language);
  }

  if (tag) {
    sql += " AND tags LIKE ?";
    params.push(`%"${tag.replace(/"/g, "")}"%`);
  }

  if (query) {
    sql += " AND (title LIKE ? OR description LIKE ? OR source LIKE ?)";
    const pattern = `%${query}%`;
    params.push(pattern, pattern, pattern);
  }

  sql += " ORDER BY updated_at DESC, title ASC";

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
    (diagram, index) => ({
      ...diagram,
      canWrite: canWriteDiagram(database, user, {
        id: readable[index].id,
        section_id: readable[index].section_id,
        author_id: readable[index].author_id,
        owner_id: readable[index].owner_id,
        visibility: readable[index].visibility as DiagramVisibility,
      }),
    }),
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
  diagram.canWrite = canWriteDiagram(database, user, {
    id: row.id,
    section_id: row.section_id,
    author_id: row.author_id,
    owner_id: row.owner_id,
    visibility: row.visibility as DiagramVisibility,
  });

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

  if (contentType.includes("multipart/form-data")) {
    const formData = await context.req.formData();
    const file = formData.get("file");

    title = String(formData.get("title") ?? "").trim();
    description = String(formData.get("description") ?? "").trim();
    sectionId = String(formData.get("sectionId") ?? "").trim() || null;
    const tagsRaw = String(formData.get("tags") ?? "").trim();
    const languageRaw = String(formData.get("language") ?? "").trim();
    const visibilityRaw = String(formData.get("visibility") ?? "").trim();

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
      if (!title) {
        title = fileName.replace(/\.(puml|plantuml|txt)$/i, "");
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
    title = fileName.replace(/\.(puml|plantuml|txt)$/i, "") || "Диаграмма";
  }

  if (!isDiagramLanguage(language)) {
    language = detectLanguageFromSource(source);
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
        id, section_id, title, description, tags, language,
        source, file_name, byte_size, author_id, owner_id, visibility,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      sectionId,
      title,
      description,
      JSON.stringify(tags),
      language,
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

  const now = new Date().toISOString();

  database
    .prepare(
      `UPDATE diagrams
       SET section_id = ?, title = ?, description = ?, tags = ?, language = ?,
           source = ?, file_name = ?, byte_size = ?, visibility = ?, updated_at = ?
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

  const links = listShareLinksForResource(database, "diagram", id).map((link) => ({
    token: link.token,
    resourceType: link.resource_type,
    resourceId: link.resource_id,
    expiresAt: link.expires_at,
    permanent: !link.expires_at,
    createdAt: link.created_at,
    urlPath: `?share=${link.token}`,
  }));

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

  const link = createShareLink(database, "diagram", id, user.id, expiresAt);

  return context.json({
    link: {
      token: link.token,
      resourceType: link.resource_type,
      resourceId: link.resource_id,
      expiresAt: link.expires_at,
      permanent: !link.expires_at,
      createdAt: link.created_at,
      urlPath: `?share=${link.token}`,
    },
  }, 201);
});
