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

export const LIBRARY_CACHE_KEY = "code2graph-library-synced-at";

export const STORAGE_KEY_LIBRARY_API_URL = "code2graph-library-api-url";

export const STORAGE_KEY_LIBRARY_API_USERNAME =
  "code2graph-library-api-username";

export const STORAGE_KEY_LIBRARY_API_PASSWORD =
  "code2graph-library-api-password";

export const STORAGE_KEY_LIBRARY_TARGET = "code2graph-library-target";

export const STORAGE_KEY_LIBRARY_PROFILES = "code2graph-library-profiles";

export const STORAGE_KEY_ACTIVE_LIBRARY_PROFILE_ID =
  "code2graph-active-library-profile-id";

export const STORAGE_KEY_LIBRARY_PROFILE_SECRETS =
  "code2graph-library-profile-secrets";

export const STORAGE_KEY_LIBRARY_AUTH_TOKEN = "code2graph-library-auth-token";

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
  canDownload?: boolean;
  userAccessPermission?: SectionAccessPermission | null;
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
  contentLocale?: ContentLocale | string;
  fileName: string;
  byteSize: number;
  authorId?: string | null;
  ownerId?: string | null;
  authorName?: string | null;
  visibility?: DiagramVisibility;
  canWrite?: boolean;
  canDownload?: boolean;
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
  contentLocale?: ContentLocale | string;
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
  language?: DiagramLanguage;
  contentLocale?: ContentLocale | string;
  sectionId?: string | null;
  source?: string;
  fileName?: string;
  visibility?: DiagramVisibility;
}

export interface SectionAccessDto {
  userId: string;
  username: string;
  permission: SectionAccessPermission;
  expiresAt: string | null;
  permanent: boolean;
  grantedAt: string;
}

export interface SubscriptionSectionDto {
  sectionId: string;
  sectionTitle?: string;
  includeDescendants: boolean;
}

export interface SubscriptionDiagramDto {
  diagramId: string;
  diagramTitle?: string;
}

export const SUBSCRIPTION_DISTRIBUTION_MODES = [
  "users",
  "link",
  "both",
] as const;
export type SubscriptionDistributionMode =
  (typeof SUBSCRIPTION_DISTRIBUTION_MODES)[number];

export interface SubscriptionDto {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  permission: SectionAccessPermission;
  distributionMode: SubscriptionDistributionMode;
  shareToken: string | null;
  urlPath: string | null;
  sections: SubscriptionSectionDto[];
  diagrams: SubscriptionDiagramDto[];
  createdAt: string;
  updatedAt: string;
}

export interface GrantedSubscriptionDto extends SubscriptionDto {
  ownerUsername: string;
  grantExpiresAt: string | null;
  grantPermanent: boolean;
  grantedAt: string;
}

export interface UserSubscriptionGrantDto {
  userId: string;
  username: string;
  expiresAt: string | null;
  permanent: boolean;
  grantedAt: string;
}

export interface CreateSubscriptionPayload {
  title: string;
  description: string;
  permission: SectionAccessPermission;
  distributionMode?: SubscriptionDistributionMode;
  sections?: SubscriptionSectionDto[];
  diagrams?: SubscriptionDiagramDto[];
}

export interface UpdateSubscriptionPayload {
  title?: string;
  description?: string;
  permission?: SectionAccessPermission;
  distributionMode?: SubscriptionDistributionMode;
  sections?: SubscriptionSectionDto[];
  diagrams?: SubscriptionDiagramDto[];
}

export interface RatingsLeaderboardDto {
  topDiagrams: DiagramListItemDto[];
  topSections: Array<{
    sectionId: string;
    title: string;
    diagramCount: number;
    totalVotes: number;
    avgRating: number | null;
  }>;
  topAuthors: Array<{
    authorId: string;
    username: string;
    diagramCount: number;
    totalVotes: number;
    avgRating: number | null;
  }>;
}

export const SHARE_PERMISSIONS = ["view", "download"] as const;
export type SharePermission = (typeof SHARE_PERMISSIONS)[number];

export const DEFAULT_SHARE_MAX_DOWNLOADS = 5;

export const FAVORITES_SECTION_ID = "__favorites__";

export const RATINGS_SECTION_ID = "__ratings__";

export const SUBSCRIPTIONS_BROWSE_STEP = "subscriptions" as const;

export const SECTION_ACCESS_PERMISSIONS = [
  "view",
  "download",
  "contribute",
] as const;
export type SectionAccessPermission =
  (typeof SECTION_ACCESS_PERMISSIONS)[number];

export const CONTENT_LOCALES = ["", "ru", "en", "de", "fr", "es", "zh"] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

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
