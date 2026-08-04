import { Hono } from "hono";
import { getDb, parseTags } from "../db.js";
import type { DiagramDto, DiagramListItemDto, SectionDto } from "../types.js";
import { isDiagramLanguage, MAX_PUML_FILE_BYTES } from "../config.js";

const PUML_EXTENSIONS = [".puml", ".plantuml", ".txt"];

function isPumlFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return PUML_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function sanitizeFileName(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) {
    return "diagram.puml";
  }
  return trimmed.replace(/[\\/:*?"<>|]+/g, "_");
}

function resolvePumlFileName(fileName: string): string {
  const sanitized = sanitizeFileName(fileName);
  if (isPumlFileName(sanitized)) {
    return sanitized;
  }
  const withoutExtension = sanitized.replace(/\.[^.]+$/, "");
  return `${withoutExtension || "diagram"}.puml`;
}

function detectLanguageFromSource(source: string): string {
  const trimmed = source.trim().toLowerCase();
  if (trimmed.includes("@startuml") || trimmed.includes("@enduml")) {
    return "plantuml";
  }
  if (trimmed.startsWith("graph ") || trimmed.startsWith("digraph ")) {
    return "graphviz";
  }
  if (trimmed.startsWith("```mermaid") || trimmed.includes("sequencediagram")) {
    return "mermaid";
  }
  return "plantuml";
}

function mapSection(row: {
  id: string;
  parent_id: string | null;
  title: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}): SectionDto {
  return {
    id: row.id,
    parentId: row.parent_id,
    title: row.title,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildTree(sections: SectionDto[]): SectionDto[] {
  const byId = new Map(sections.map((section) => [section.id, { ...section, children: [] as SectionDto[] }]));
  const roots: SectionDto[] = [];

  for (const section of byId.values()) {
    if (section.parentId && byId.has(section.parentId)) {
      byId.get(section.parentId)!.children!.push(section);
    } else {
      roots.push(section);
    }
  }

  const sortRecursive = (items: SectionDto[]): void => {
    items.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
    for (const item of items) {
      if (item.children?.length) {
        sortRecursive(item.children);
      }
    }
  };

  sortRecursive(roots);
  return roots;
}

function collectSectionSubtree(
  rootId: string,
  sections: Array<{ id: string; parent_id: string | null }>,
): Set<string> {
  const ids = new Set<string>([rootId]);
  let changed = true;

  while (changed) {
    changed = false;
    for (const section of sections) {
      if (
        section.parent_id &&
        ids.has(section.parent_id) &&
        !ids.has(section.id)
      ) {
        ids.add(section.id);
        changed = true;
      }
    }
  }

  return ids;
}

function mapDiagramListItem(row: {
  id: string;
  section_id: string | null;
  title: string;
  description: string;
  tags: string;
  language: string;
  file_name: string;
  byte_size: number;
  created_at: string;
  updated_at: string;
}): DiagramListItemDto {
  return {
    id: row.id,
    sectionId: row.section_id,
    title: row.title,
    description: row.description,
    tags: parseTags(row.tags),
    language: row.language as DiagramListItemDto["language"],
    fileName: row.file_name,
    byteSize: row.byte_size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDiagram(row: {
  id: string;
  section_id: string | null;
  title: string;
  description: string;
  tags: string;
  language: string;
  source: string;
  file_name: string;
  byte_size: number;
  created_at: string;
  updated_at: string;
}): DiagramDto {
  return {
    ...mapDiagramListItem(row),
    source: row.source,
  };
}

export const sectionsRouter = new Hono();

sectionsRouter.get("/", (context) => {
  const database = getDb();
  const rows = database
    .prepare(
      `SELECT id, parent_id, title, sort_order, created_at, updated_at
       FROM sections
       ORDER BY sort_order ASC, title ASC`,
    )
    .all() as Array<{
    id: string;
    parent_id: string | null;
    title: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }>;

  const flat = rows.map(mapSection);
  const tree = buildTree(flat);
  return context.json({ sections: tree, flat });
});

sectionsRouter.post("/", async (context) => {
  const body = await context.req.json<{
    title?: string;
    parentId?: string | null;
    sortOrder?: number;
  }>();

  const title = body.title?.trim();
  if (!title) {
    return context.json({ error: "Название раздела обязательно" }, 400);
  }

  const database = getDb();
  if (body.parentId) {
    const parent = database
      .prepare("SELECT id FROM sections WHERE id = ?")
      .get(body.parentId);
    if (!parent) {
      return context.json({ error: "Родительский раздел не найден" }, 404);
    }
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  database
    .prepare(
      `INSERT INTO sections (id, parent_id, title, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, body.parentId ?? null, title, body.sortOrder ?? 0, now, now);

  const row = database
    .prepare(
      `SELECT id, parent_id, title, sort_order, created_at, updated_at
       FROM sections WHERE id = ?`,
    )
    .get(id) as {
    id: string;
    parent_id: string | null;
    title: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
  };

  return context.json(mapSection(row), 201);
});

sectionsRouter.put("/:id", async (context) => {
  const id = context.req.param("id");
  const body = await context.req.json<{
    title?: string;
    parentId?: string | null;
    sortOrder?: number;
  }>();

  const database = getDb();
  const existing = database
    .prepare("SELECT id FROM sections WHERE id = ?")
    .get(id);
  if (!existing) {
    return context.json({ error: "Раздел не найден" }, 404);
  }

  if (body.parentId === id) {
    return context.json({ error: "Раздел не может быть родителем самого себя" }, 400);
  }

  const now = new Date().toISOString();
  const current = database
    .prepare(
      `SELECT id, parent_id, title, sort_order, created_at, updated_at
       FROM sections WHERE id = ?`,
    )
    .get(id) as {
    id: string;
    parent_id: string | null;
    title: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
  };

  database
    .prepare(
      `UPDATE sections
       SET parent_id = ?, title = ?, sort_order = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      body.parentId !== undefined ? body.parentId : current.parent_id,
      body.title?.trim() || current.title,
      body.sortOrder ?? current.sort_order,
      now,
      id,
    );

  const row = database
    .prepare(
      `SELECT id, parent_id, title, sort_order, created_at, updated_at
       FROM sections WHERE id = ?`,
    )
    .get(id) as {
    id: string;
    parent_id: string | null;
    title: string;
    sort_order: number;
    created_at: string;
    updated_at: string;
  };

  return context.json(mapSection(row));
});

sectionsRouter.delete("/:id", (context) => {
  const id = context.req.param("id");
  const database = getDb();
  const result = database.prepare("DELETE FROM sections WHERE id = ?").run(id);
  if (result.changes === 0) {
    return context.json({ error: "Раздел не найден" }, 404);
  }
  return context.json({ ok: true });
});

export const diagramsRouter = new Hono();

diagramsRouter.get("/", (context) => {
  const database = getDb();
  const query = context.req.query("q")?.trim() ?? "";
  const sectionId = context.req.query("sectionId")?.trim();
  const tag = context.req.query("tag")?.trim();
  const language = context.req.query("language")?.trim();

  let sql = `
    SELECT id, section_id, title, description, tags, language,
           file_name, byte_size, created_at, updated_at
    FROM diagrams
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (sectionId) {
    const allSections = database
      .prepare("SELECT id, parent_id FROM sections")
      .all() as Array<{ id: string; parent_id: string | null }>;
    const sectionIds = [...collectSectionSubtree(sectionId, allSections)];
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

  const rows = database.prepare(sql).all(...params) as Array<{
    id: string;
    section_id: string | null;
    title: string;
    description: string;
    tags: string;
    language: string;
    file_name: string;
    byte_size: number;
    created_at: string;
    updated_at: string;
  }>;

  return context.json({
    diagrams: rows.map(mapDiagramListItem),
    total: rows.length,
  });
});

diagramsRouter.get("/:id", (context) => {
  const id = context.req.param("id");
  const database = getDb();
  const row = database
    .prepare(
      `SELECT id, section_id, title, description, tags, language,
              source, file_name, byte_size, created_at, updated_at
       FROM diagrams WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string;
        section_id: string | null;
        title: string;
        description: string;
        tags: string;
        language: string;
        source: string;
        file_name: string;
        byte_size: number;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }

  return context.json(mapDiagram(row));
});

diagramsRouter.post("/", async (context) => {
  const contentType = context.req.header("content-type") ?? "";

  let title = "";
  let description = "";
  let tags: string[] = [];
  let language = "plantuml";
  let sectionId: string | null = null;
  let source = "";
  let fileName = "diagram.puml";

  if (contentType.includes("multipart/form-data")) {
    const formData = await context.req.formData();
    const file = formData.get("file");

    title = String(formData.get("title") ?? "").trim();
    description = String(formData.get("description") ?? "").trim();
    sectionId = String(formData.get("sectionId") ?? "").trim() || null;
    const tagsRaw = String(formData.get("tags") ?? "").trim();
    const languageRaw = String(formData.get("language") ?? "").trim();

    if (tagsRaw) {
      tags = tagsRaw
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
    }

    if (languageRaw && isDiagramLanguage(languageRaw)) {
      language = languageRaw;
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
    const section = database
      .prepare("SELECT id FROM sections WHERE id = ?")
      .get(sectionId);
    if (!section) {
      return context.json({ error: "Раздел не найден" }, 404);
    }
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  database
    .prepare(
      `INSERT INTO diagrams (
        id, section_id, title, description, tags, language,
        source, file_name, byte_size, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      now,
      now,
    );

  const row = database
    .prepare(
      `SELECT id, section_id, title, description, tags, language,
              source, file_name, byte_size, created_at, updated_at
       FROM diagrams WHERE id = ?`,
    )
    .get(id) as {
    id: string;
    section_id: string | null;
    title: string;
    description: string;
    tags: string;
    language: string;
    source: string;
    file_name: string;
    byte_size: number;
    created_at: string;
    updated_at: string;
  };

  return context.json(mapDiagram(row), 201);
});

diagramsRouter.put("/:id", async (context) => {
  const id = context.req.param("id");
  const body = await context.req.json<{
    title?: string;
    description?: string;
    tags?: string[];
    language?: string;
    sectionId?: string | null;
    source?: string;
    fileName?: string;
  }>();

  const database = getDb();
  const current = database
    .prepare(
      `SELECT id, section_id, title, description, tags, language,
              source, file_name, byte_size, created_at, updated_at
       FROM diagrams WHERE id = ?`,
    )
    .get(id) as
    | {
        id: string;
        section_id: string | null;
        title: string;
        description: string;
        tags: string;
        language: string;
        source: string;
        file_name: string;
        byte_size: number;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!current) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
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
    const section = database
      .prepare("SELECT id FROM sections WHERE id = ?")
      .get(sectionId);
    if (!section) {
      return context.json({ error: "Раздел не найден" }, 404);
    }
  }

  const language =
    body.language && isDiagramLanguage(body.language)
      ? body.language
      : current.language;

  const now = new Date().toISOString();

  database
    .prepare(
      `UPDATE diagrams
       SET section_id = ?, title = ?, description = ?, tags = ?, language = ?,
           source = ?, file_name = ?, byte_size = ?, updated_at = ?
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
      now,
      id,
    );

  const row = database
    .prepare(
      `SELECT id, section_id, title, description, tags, language,
              source, file_name, byte_size, created_at, updated_at
       FROM diagrams WHERE id = ?`,
    )
    .get(id) as {
    id: string;
    section_id: string | null;
    title: string;
    description: string;
    tags: string;
    language: string;
    source: string;
    file_name: string;
    byte_size: number;
    created_at: string;
    updated_at: string;
  };

  return context.json(mapDiagram(row));
});

diagramsRouter.delete("/:id", (context) => {
  const id = context.req.param("id");
  const database = getDb();
  const result = database.prepare("DELETE FROM diagrams WHERE id = ?").run(id);
  if (result.changes === 0) {
    return context.json({ error: "Диаграмма не найдена" }, 404);
  }
  return context.json({ ok: true });
});
