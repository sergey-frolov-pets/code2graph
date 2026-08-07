import type { DiagramLanguage } from "./config.js";

export const USER_ROLES = ["admin", "user"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SECTION_KINDS = ["shared", "personal"] as const;
export type SectionKind = (typeof SECTION_KINDS)[number];

export const DIAGRAM_VISIBILITIES = ["all", "personal", "subscription"] as const;
export type DiagramVisibility = (typeof DIAGRAM_VISIBILITIES)[number];

export const SHARE_RESOURCE_TYPES = ["section", "diagram"] as const;
export type ShareResourceType = (typeof SHARE_RESOURCE_TYPES)[number];

export const SHARE_PERMISSIONS = ["view", "download"] as const;
export type SharePermission = (typeof SHARE_PERMISSIONS)[number];

/** Уровни подписки / доступа к разделу личной папки. */
export const SECTION_ACCESS_PERMISSIONS = [
  "view",
  "download",
  "contribute",
] as const;
export type SectionAccessPermission =
  (typeof SECTION_ACCESS_PERMISSIONS)[number];

export const CONTENT_LOCALES = ["", "ru", "en", "de", "fr", "es", "zh"] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

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

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  blocked: number;
  subscription_active: number;
  created_at: string;
  updated_at: string;
}

export interface UserDto {
  id: string;
  username: string;
  role: UserRole;
  blocked: boolean;
  subscriptionActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SectionRow {
  id: string;
  parent_id: string | null;
  title: string;
  sort_order: number;
  kind: SectionKind;
  owner_id: string | null;
  author_id: string | null;
  visibility: DiagramVisibility;
  created_at: string;
  updated_at: string;
}

export interface DiagramRow {
  id: string;
  section_id: string | null;
  title: string;
  description: string;
  tags: string;
  language: DiagramLanguage;
  source: string;
  file_name: string;
  byte_size: number;
  author_id: string | null;
  owner_id: string | null;
  visibility: DiagramVisibility;
  avg_rating: number | null;
  vote_count: number;
  created_at: string;
  updated_at: string;
}

export interface SectionAccessRow {
  id: string;
  section_id: string;
  user_id: string;
  granted_by: string;
  permission: SectionAccessPermission;
  expires_at: string | null;
  created_at: string;
}

export interface ShareLinkRow {
  id: string;
  token: string;
  resource_type: ShareResourceType;
  resource_id: string;
  created_by: string;
  expires_at: string | null;
  permission: SharePermission;
  max_downloads: number | null;
  download_count: number;
  created_at: string;
}

export interface SectionDto {
  id: string;
  parentId: string | null;
  title: string;
  sortOrder: number;
  kind: SectionKind;
  ownerId: string | null;
  authorId: string | null;
  authorName?: string | null;
  visibility: DiagramVisibility;
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
  authorId: string | null;
  ownerId: string | null;
  authorName?: string | null;
  visibility: DiagramVisibility;
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

export interface SectionAccessDto {
  userId: string;
  username: string;
  permission: SectionAccessPermission;
  expiresAt: string | null;
  permanent: boolean;
  grantedAt: string;
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

export interface ShareLinkDto {
  token: string;
  resourceType: ShareResourceType;
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

export function isSharePermission(value: string): value is SharePermission {
  return (SHARE_PERMISSIONS as readonly string[]).includes(value);
}

export function isSectionAccessPermission(
  value: string,
): value is SectionAccessPermission {
  return (SECTION_ACCESS_PERMISSIONS as readonly string[]).includes(value);
}

export function isContentLocale(value: string): value is ContentLocale {
  return (CONTENT_LOCALES as readonly string[]).includes(value);
}

export function isDiagramVisibility(value: string): value is DiagramVisibility {
  return (DIAGRAM_VISIBILITIES as readonly string[]).includes(value);
}

export function isSectionKind(value: string): value is SectionKind {
  return (SECTION_KINDS as readonly string[]).includes(value);
}

export function isShareResourceType(value: string): value is ShareResourceType {
  return (SHARE_RESOURCE_TYPES as readonly string[]).includes(value);
}

export function isDiagramSortOption(value: string): value is DiagramSortOption {
  return (DIAGRAM_SORT_OPTIONS as readonly string[]).includes(value);
}

export function isRatingCommentStatus(value: string): value is RatingCommentStatus {
  return (RATING_COMMENT_STATUSES as readonly string[]).includes(value);
}
