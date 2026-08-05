import { parseTags } from "../db.js";
import type { DiagramDto, DiagramListItemDto, SectionDto } from "../types.js";

export function mapSection(row: {
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

export function mapDiagramListItem(row: {
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

export function mapDiagram(row: {
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
