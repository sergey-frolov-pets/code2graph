import { z } from "zod";
import { DIAGRAM_LANGUAGES } from "../config.js";
import { DIAGRAM_SORT_OPTIONS, FAVORITES_SECTION_ID } from "../types.js";

const diagramListQuerySchema = z.object({
  q: z.string().trim().default(""),
  sectionId: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  language: z.enum(DIAGRAM_LANGUAGES).optional(),
  minRating: z.coerce.number().finite().nonnegative().nullable().optional(),
  minVotes: z.coerce.number().finite().nonnegative().nullable().optional(),
  sortBy: z
    .enum(DIAGRAM_SORT_OPTIONS)
    .catch("updated")
    .default("updated"),
});

export type DiagramListQueryInput = z.infer<typeof diagramListQuerySchema>;

export function parseDiagramListQueryFromSearchParams(
  searchParams: URLSearchParams,
): DiagramListQueryInput {
  const sectionIdRaw = searchParams.get("sectionId")?.trim();
  const favoritesOnly = sectionIdRaw === FAVORITES_SECTION_ID;

  const result = diagramListQuerySchema.safeParse({
    q: searchParams.get("q") ?? "",
    sectionId: favoritesOnly ? undefined : sectionIdRaw,
    tag: searchParams.get("tag") ?? undefined,
    language: searchParams.get("language") ?? undefined,
    minRating: searchParams.get("minRating") ?? undefined,
    minVotes: searchParams.get("minVotes") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? "updated",
  });

  if (result.success) {
    return result.data;
  }

  return diagramListQuerySchema.parse({
    q: searchParams.get("q") ?? "",
    sectionId: favoritesOnly ? undefined : sectionIdRaw,
    sortBy: "updated",
  });
}

export function isFavoritesSectionQuery(sectionIdRaw?: string): boolean {
  return sectionIdRaw === FAVORITES_SECTION_ID;
}
