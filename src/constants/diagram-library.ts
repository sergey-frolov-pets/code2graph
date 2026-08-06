export const MAX_PUML_FILE_BYTES = 512_000;

export const DIAGRAM_LANGUAGES = [
  "plantuml",
  "mermaid",
  "graphviz",
  "graphml",
  "ditaa",
  "other",
] as const;

export type DiagramLanguage = (typeof DIAGRAM_LANGUAGES)[number];

export function isDiagramLanguage(value: string): value is DiagramLanguage {
  return (DIAGRAM_LANGUAGES as readonly string[]).includes(value);
}

export const LIBRARY_SEARCH_DEBOUNCE_MS = 300;

export const LIBRARY_CACHE_KEY = "plantuml-smetana-library-synced-at";

export const STORAGE_KEY_LIBRARY_API_URL = "plantuml-smetana-library-api-url";

export const STORAGE_KEY_LIBRARY_API_USERNAME =
  "plantuml-smetana-library-api-username";

export const STORAGE_KEY_LIBRARY_API_PASSWORD =
  "plantuml-smetana-library-api-password";

export const STORAGE_KEY_LIBRARY_TARGET = "plantuml-smetana-library-target";

export const STORAGE_KEY_LIBRARY_AUTH_TOKEN = "plantuml-smetana-library-auth-token";

export type LibraryTarget = "local" | "online";

export const SECTION_KINDS = ["shared", "personal"] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export const DIAGRAM_VISIBILITIES = ["all", "personal", "subscription"] as const;
export type DiagramVisibility = (typeof DIAGRAM_VISIBILITIES)[number];

export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface LibraryUserDto {
  id: string;
  username: string;
  role: UserRole;
  blocked: boolean;
  subscriptionActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SectionDto {
  id: string;
  parentId: string | null;
  title: string;
  sortOrder: number;
  kind?: SectionKind;
  ownerId?: string | null;
  authorId?: string | null;
  authorName?: string | null;
  visibility?: DiagramVisibility;
  canWrite?: boolean;
  canAdmin?: boolean;
  createdAt: string;
  updatedAt: string;
  children?: SectionDto[];
}

export interface DiagramListItemDto {
  id: string;
  sectionId: string | null;
  title: string;
  description: string;
  tags: string[];
  language: DiagramLanguage;
  fileName: string;
  byteSize: number;
  authorId?: string | null;
  ownerId?: string | null;
  authorName?: string | null;
  visibility?: DiagramVisibility;
  canWrite?: boolean;
  avgRating?: number | null;
  voteCount?: number;
  isFavorite?: boolean;
  userRating?: number | null;
  userCommentStatus?: RatingCommentStatus | null;
  userComment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiagramVersionDto {
  id: string;
  diagramId: string;
  versionNumber: number;
  comment: string;
  source: string;
  authorId: string;
  authorName?: string | null;
  createdAt: string;
}

export interface DiagramDto extends DiagramListItemDto {
  source: string;
}

export interface DiagramRatingDto {
  id: string;
  diagramId: string;
  userId: string;
  username?: string;
  rating: number;
  comment?: string;
  commentStatus: RatingCommentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDiagramPayload {
  title: string;
  description: string;
  tags: string[];
  language: DiagramLanguage;
  sectionId: string | null;
  source: string;
  fileName: string;
  visibility?: DiagramVisibility;
}

export interface CreateSectionPayload {
  title: string;
  parentId: string | null;
  sortOrder?: number;
}

export interface UpdateSectionPayload {
  title?: string;
  parentId?: string | null;
  sortOrder?: number;
  visibility?: DiagramVisibility;
}

export interface UpdateDiagramPayload {
  title?: string;
  description?: string;
  tags?: string[];
  sectionId?: string | null;
  source?: string;
  fileName?: string;
  visibility?: DiagramVisibility;
}

export interface SectionAccessDto {
  userId: string;
  username: string;
  expiresAt: string | null;
  permanent: boolean;
  grantedAt: string;
}

export const SHARE_PERMISSIONS = ["view", "download"] as const;
export type SharePermission = (typeof SHARE_PERMISSIONS)[number];

export const DEFAULT_SHARE_MAX_DOWNLOADS = 5;

export const FAVORITES_SECTION_ID = "__favorites__";

export const RATING_COMMENT_STATUSES = [
  "none",
  "pending",
  "approved",
  "rejected",
] as const;
export type RatingCommentStatus = (typeof RATING_COMMENT_STATUSES)[number];

export const DIAGRAM_SORT_OPTIONS = ["updated", "rating", "votes"] as const;
export type DiagramSortOption = (typeof DIAGRAM_SORT_OPTIONS)[number];

export interface ShareLinkDto {
  token: string;
  resourceType: "section" | "diagram";
  resourceId: string;
  expiresAt: string | null;
  permanent: boolean;
  permission: SharePermission;
  maxDownloads: number | null;
  downloadCount: number;
  downloadsRemaining: number | null;
  createdAt: string;
  urlPath: string;
}

export const LIBRARY_EXPORT_VERSION = 1;

export interface LibraryExportBundle {
  version: typeof LIBRARY_EXPORT_VERSION;
  exportedAt: string;
  sections: SectionDto[];
  diagrams: DiagramDto[];
}
