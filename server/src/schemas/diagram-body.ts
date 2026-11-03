import { z } from "zod";
import { DIAGRAM_LANGUAGES } from "../config.js";
import { CONTENT_LOCALES, DIAGRAM_VISIBILITIES } from "../types.js";

const diagramLanguageSchema = z.enum(DIAGRAM_LANGUAGES);
const diagramVisibilitySchema = z.enum(DIAGRAM_VISIBILITIES);
const contentLocaleSchema = z.enum(CONTENT_LOCALES);

export const createDiagramBodySchema = z.object({
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  tags: z.array(z.string().trim()).optional(),
  language: diagramLanguageSchema.optional(),
  sectionId: z.string().trim().nullable().optional(),
  source: z.string().optional(),
  fileName: z.string().trim().optional(),
  visibility: diagramVisibilitySchema.optional(),
  contentLocale: contentLocaleSchema.optional(),
});

export const updateDiagramBodySchema = createDiagramBodySchema.partial();

export const createDiagramVersionBodySchema = z.object({
  source: z.string().trim().optional(),
  comment: z.string().trim().optional(),
});

export type CreateDiagramBody = z.infer<typeof createDiagramBodySchema>;
export type UpdateDiagramBody = z.infer<typeof updateDiagramBodySchema>;
export type CreateDiagramVersionBody = z.infer<typeof createDiagramVersionBodySchema>;

export function parseCreateDiagramBody(
  input: unknown,
):
  | { ok: true; data: CreateDiagramBody }
  | { ok: false; error: string } {
  const result = createDiagramBodySchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Invalid body" };
  }
  return { ok: true, data: result.data };
}

export function parseUpdateDiagramBody(
  input: unknown,
):
  | { ok: true; data: UpdateDiagramBody }
  | { ok: false; error: string } {
  const result = updateDiagramBodySchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Invalid body" };
  }
  return { ok: true, data: result.data };
}

export function parseCreateDiagramVersionBody(
  input: unknown,
):
  | { ok: true; data: CreateDiagramVersionBody }
  | { ok: false; error: string } {
  const result = createDiagramVersionBodySchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: result.error.issues[0]?.message ?? "Invalid body" };
  }
  return { ok: true, data: result.data };
}
