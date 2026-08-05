import { Hono } from "hono";
import { getDb } from "../db.js";
import { mapSection } from "../shared/diagram-mappers.js";
import { buildTree } from "../shared/section-tree.js";

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
