import type Database from "better-sqlite3";
import { canWriteDiagram } from "./authz.js";
import { MAX_LIBRARY_LINK_SNAPSHOT_BYTES } from "./config.js";
import {
  isLibraryLinkDataAccess,
  isLibraryLinkDelivery,
  isLibraryLinkSlug,
  isLibraryLinkViewRender,
  sanitizeDiagramSvg,
  type LibraryLinkDataAccess,
  type LibraryLinkDelivery,
  type LibraryLinkViewRender,
} from "./library-link-policy.js";
import {
  libraryLinkSupportsLiveRender,
  renderLibraryLinkSvg,
} from "./library-link-render.js";
import { getDiagramAccessContext } from "./services/diagrams-access.js";
import type { UserDto } from "./types.js";

export class LibraryLinkRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "LibraryLinkRequestError";
    this.status = status;
  }
}

export interface LibraryLinkRow {
  id: string;
  diagram_id: string;
  created_by: string;
  slug: string;
  delivery: LibraryLinkDelivery;
  data_access: LibraryLinkDataAccess;
  view_render: LibraryLinkViewRender | null;
  snapshot_svg: string | null;
  created_at: string;
  updated_at: string;
  username: string;
  language: string;
  title: string;
  file_name: string;
  source: string;
}

export interface LibraryLinkInput {
  slug: string;
  delivery: string;
  dataAccess: string;
  viewRender?: string | null;
}

export interface LibraryLinkDto {
  id: string;
  diagramId: string;
  slug: string;
  delivery: LibraryLinkDelivery;
  dataAccess: LibraryLinkDataAccess;
  viewRender: LibraryLinkViewRender | null;
  hasSnapshot: boolean;
  username: string;
  createdAt: string;
  updatedAt: string;
}

const LINK_SELECT = `
  SELECT links.id, links.diagram_id, links.created_by, links.slug, links.delivery,
         links.data_access, links.view_render, links.snapshot_svg, links.created_at,
         links.updated_at, users.username, diagrams.language, diagrams.title,
         diagrams.file_name, diagrams.source
  FROM library_links AS links
  JOIN users ON users.id = links.created_by
  JOIN diagrams ON diagrams.id = links.diagram_id
`;

function assertWritableDiagram(
  database: Database.Database,
  user: UserDto,
  diagramId: string,
): NonNullable<ReturnType<typeof getDiagramAccessContext>> {
  const context = getDiagramAccessContext(database, diagramId);
  if (!context) {
    throw new LibraryLinkRequestError(404, "Диаграмма не найдена");
  }
  if (!canWriteDiagram(database, user, context.access)) {
    throw new LibraryLinkRequestError(403, "Недостаточно прав");
  }
  return context;
}

function normalizeInput(
  input: LibraryLinkInput,
  language: string,
): {
  slug: string;
  delivery: LibraryLinkDelivery;
  dataAccess: LibraryLinkDataAccess;
  viewRender: LibraryLinkViewRender | null;
} {
  const slug = input.slug.trim().toLowerCase();
  if (!isLibraryLinkSlug(slug)) {
    throw new LibraryLinkRequestError(
      400,
      "Имя ссылки: латиница, цифры и дефис",
    );
  }
  if (!isLibraryLinkDelivery(input.delivery)) {
    throw new LibraryLinkRequestError(400, "Неизвестный режим ссылки");
  }
  if (!isLibraryLinkDataAccess(input.dataAccess)) {
    throw new LibraryLinkRequestError(400, "Неизвестный доступ к данным");
  }
  if (input.delivery === "view" && input.dataAccess === "offline") {
    throw new LibraryLinkRequestError(
      400,
      "Оффлайн-данные доступны только вместе с открытием исходника",
    );
  }

  let viewRender: LibraryLinkViewRender | null = null;
  if (input.delivery === "view") {
    if (!input.viewRender || !isLibraryLinkViewRender(input.viewRender)) {
      throw new LibraryLinkRequestError(400, "Выберите снимок или живую генерацию");
    }
    if (input.viewRender === "live" && !libraryLinkSupportsLiveRender(language)) {
      throw new LibraryLinkRequestError(
        400,
        "Для этого языка доступен только сохранённый снимок",
      );
    }
    viewRender = input.viewRender;
  }

  return {
    slug,
    delivery: input.delivery,
    dataAccess: input.dataAccess,
    viewRender,
  };
}

export function mapLibraryLink(row: LibraryLinkRow): LibraryLinkDto {
  return {
    id: row.id,
    diagramId: row.diagram_id,
    slug: row.slug,
    delivery: row.delivery,
    dataAccess: row.data_access,
    viewRender: row.view_render,
    hasSnapshot: Boolean(row.snapshot_svg),
    username: row.username,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function readLink(
  database: Database.Database,
  linkId: string,
): LibraryLinkRow | null {
  const row = database.prepare(`${LINK_SELECT} WHERE links.id = ?`).get(linkId) as
    | LibraryLinkRow
    | undefined;
  return row ?? null;
}

export function listLibraryLinks(
  database: Database.Database,
  user: UserDto,
  diagramId: string,
): LibraryLinkDto[] {
  assertWritableDiagram(database, user, diagramId);
  const rows = database
    .prepare(`${LINK_SELECT} WHERE links.diagram_id = ? ORDER BY links.created_at ASC`)
    .all(diagramId) as LibraryLinkRow[];
  return rows.map(mapLibraryLink);
}

export function createLibraryLink(
  database: Database.Database,
  user: UserDto,
  diagramId: string,
  input: LibraryLinkInput,
): LibraryLinkDto {
  const diagram = assertWritableDiagram(database, user, diagramId);
  const normalized = normalizeInput(input, diagram.row.language);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  try {
    database
      .prepare(
        `INSERT INTO library_links (
          id, diagram_id, created_by, slug, delivery, data_access, view_render,
          snapshot_svg, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .run(
        id,
        diagramId,
        user.id,
        normalized.slug,
        normalized.delivery,
        normalized.dataAccess,
        normalized.viewRender,
        now,
        now,
      );
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      throw new LibraryLinkRequestError(409, "Это имя ссылки уже занято");
    }
    throw error;
  }

  const created = readLink(database, id);
  if (!created) {
    throw new LibraryLinkRequestError(500, "Ссылка не сохранилась");
  }
  return mapLibraryLink(created);
}

export function updateLibraryLink(
  database: Database.Database,
  user: UserDto,
  diagramId: string,
  linkId: string,
  input: LibraryLinkInput,
): LibraryLinkDto {
  const diagram = assertWritableDiagram(database, user, diagramId);
  const current = readLink(database, linkId);
  if (!current || current.diagram_id !== diagramId) {
    throw new LibraryLinkRequestError(404, "Ссылка не найдена");
  }
  const normalized = normalizeInput(input, diagram.row.language);
  const snapshot =
    normalized.viewRender === "snapshot" ? current.snapshot_svg : null;

  try {
    database
      .prepare(
        `UPDATE library_links
         SET slug = ?, delivery = ?, data_access = ?, view_render = ?,
             snapshot_svg = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        normalized.slug,
        normalized.delivery,
        normalized.dataAccess,
        normalized.viewRender,
        snapshot,
        new Date().toISOString(),
        linkId,
      );
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      throw new LibraryLinkRequestError(409, "Это имя ссылки уже занято");
    }
    throw error;
  }

  const updated = readLink(database, linkId);
  if (!updated) {
    throw new LibraryLinkRequestError(404, "Ссылка не найдена");
  }
  return mapLibraryLink(updated);
}

export function deleteLibraryLink(
  database: Database.Database,
  user: UserDto,
  diagramId: string,
  linkId: string,
): void {
  assertWritableDiagram(database, user, diagramId);
  const result = database
    .prepare("DELETE FROM library_links WHERE id = ? AND diagram_id = ?")
    .run(linkId, diagramId);
  if (result.changes === 0) {
    throw new LibraryLinkRequestError(404, "Ссылка не найдена");
  }
}

export function saveLibraryLinkSnapshot(
  database: Database.Database,
  user: UserDto,
  diagramId: string,
  linkId: string,
  svg: string,
): LibraryLinkDto {
  assertWritableDiagram(database, user, diagramId);
  const current = readLink(database, linkId);
  if (!current || current.diagram_id !== diagramId) {
    throw new LibraryLinkRequestError(404, "Ссылка не найдена");
  }
  if (current.delivery !== "view" || current.view_render !== "snapshot") {
    throw new LibraryLinkRequestError(400, "Эта ссылка не хранит снимок");
  }

  const byteSize = Buffer.byteLength(svg, "utf8");
  if (byteSize > MAX_LIBRARY_LINK_SNAPSHOT_BYTES) {
    throw new LibraryLinkRequestError(
      413,
      `Снимок слишком большой. Максимум ${MAX_LIBRARY_LINK_SNAPSHOT_BYTES} байт`,
    );
  }
  const clean = sanitizeDiagramSvg(svg);
  if (!clean) {
    throw new LibraryLinkRequestError(400, "Снимок должен быть SVG без скриптов");
  }

  database
    .prepare(
      "UPDATE library_links SET snapshot_svg = ?, updated_at = ? WHERE id = ?",
    )
    .run(clean, new Date().toISOString(), linkId);

  const updated = readLink(database, linkId);
  if (!updated) {
    throw new LibraryLinkRequestError(404, "Ссылка не найдена");
  }
  return mapLibraryLink(updated);
}

export interface PublicZoneDiagram {
  id: string;
  title: string;
  language: string;
  fileName: string;
  source: string;
}

export interface PublicEditorLink {
  delivery: "editor";
  dataAccess: LibraryLinkDataAccess;
  diagram: {
    id: string;
    title: string;
    language: string;
    fileName: string;
    source: string;
  };
  zones?: PublicZoneDiagram[];
}

export interface PublicViewLink {
  delivery: "view";
  svg: string;
  diagram?: PublicEditorLink["diagram"];
  zones?: PublicZoneDiagram[];
}

function isDashboardSource(source: string): boolean {
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("%%")) continue;
    return /^dashboard\b/i.test(line);
  }
  return false;
}

function dashboardZoneIds(source: string): string[] {
  const ids: string[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const match = /^zone\s+\S+\s+\S+\s+\S+\s+\S+\s+diagram\s+(.+)$/i.exec(raw.trim());
    if (!match) continue;
    const quoted = /^"([^"]*)"/.exec(match[1].trim());
    const id = quoted ? quoted[1] : match[1].trim();
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function readDashboardZones(
  database: Database.Database,
  source: string,
  seen: Set<string>,
): PublicZoneDiagram[] {
  const zones: PublicZoneDiagram[] = [];
  for (const id of dashboardZoneIds(source)) {
    if (seen.has(id)) continue;
    seen.add(id);
    const row = database
      .prepare(
        "SELECT id, title, language, file_name, source FROM diagrams WHERE id = ?",
      )
      .get(id) as
      | { id: string; title: string; language: string; file_name: string; source: string }
      | undefined;
    if (!row) continue;
    zones.push({
      id: row.id,
      title: row.title,
      language: row.language,
      fileName: row.file_name,
      source: row.source,
    });
    if (isDashboardSource(row.source)) {
      zones.push(...readDashboardZones(database, row.source, seen));
    }
  }
  return zones;
}

export function readPublicLibraryLink(
  database: Database.Database,
  username: string,
  slug: string,
): PublicEditorLink | PublicViewLink {
  const normalizedSlug = slug.trim().toLowerCase();
  const row = database
    .prepare(`${LINK_SELECT} WHERE users.username = ? AND links.slug = ?`)
    .get(username, normalizedSlug) as LibraryLinkRow | undefined;

  if (!row) {
    throw new LibraryLinkRequestError(404, "Ссылка не найдена");
  }

  const zones = isDashboardSource(row.source)
    ? readDashboardZones(database, row.source, new Set([row.diagram_id]))
    : undefined;

  if (row.delivery === "editor") {
    return {
      delivery: "editor",
      dataAccess: row.data_access,
      diagram: {
        id: row.diagram_id,
        title: row.title,
        language: row.language,
        fileName: row.file_name,
        source: row.source,
      },
      ...(zones ? { zones } : {}),
    };
  }

  const svg =
    row.view_render === "live"
      ? sanitizeDiagramSvg(renderLibraryLinkSvg(row.language, row.source) ?? "")
      : row.snapshot_svg;

  if (row.view_render === "live" && !svg) {
    throw new LibraryLinkRequestError(422, "live-render-unavailable");
  }
  if (!svg) {
    throw new LibraryLinkRequestError(409, "Снимок ещё не сохранён");
  }

  return {
    delivery: "view",
    svg,
    ...(zones
      ? {
          diagram: {
            id: row.diagram_id,
            title: row.title,
            language: row.language,
            fileName: row.file_name,
            source: row.source,
          },
          zones,
        }
      : {}),
  };
}

export function findLibraryLinkByNames(
  database: Database.Database,
  username: string,
  slug: string,
): LibraryLinkRow | null {
  const row = database
    .prepare(`${LINK_SELECT} WHERE users.username = ? AND links.slug = ?`)
    .get(username, slug.trim().toLowerCase()) as LibraryLinkRow | undefined;
  return row ?? null;
}
