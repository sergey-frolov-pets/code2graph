import { requireAuthenticatedUser } from "../../auth.js";
import {
  canReadDiagram,
  canWriteDiagram,
  canWriteSection,
  defaultVisibilityForSectionKind,
  getSectionRow,
} from "../../authz.js";
import { getDb, parseTags } from "../../db.js";
import { isDiagramLanguage, MAX_PUML_FILE_BYTES } from "../../config.js";
import {
  enrichDiagramForUser,
  mapDiagram,
} from "../../shared/diagram-mappers.js";
import {
  detectLanguageFromFileName,
  detectLanguageFromSource,
  resolvePumlFileName,
} from "../../shared/puml-files.js";
import { snapshotDiagramSourceVersion } from "../../diagram-versions.js";
import { DIAGRAM_FULL_SELECT } from "../../services/diagrams-list-query.js";
import { applyDiagramPermissions } from "../../services/diagrams-access.js";
import type { DiagramVisibility } from "../../types.js";
import {
  isDiagramVisibility,
  isContentLocale,
} from "../../types.js";
import type { DiagramsRouter } from "./types.js";

export function registerDiagramCrudRoutes(router: DiagramsRouter): void {
  router.get("/:id", (context) => {
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

  router.post("/", async (context) => {
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

  router.put("/:id", async (context) => {
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

  router.delete("/:id", (context) => {
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
}
