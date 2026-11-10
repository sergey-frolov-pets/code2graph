import { isDiagramFormat, type DiagramFormat } from "@/constants/diagram-format-ids";
import { MAX_PUML_FILE_BYTES } from "@/constants/diagram-library";
import { readStorageJson, writeStorageJson } from "@/core/safe-storage";
import { parseAppRoute, parseLibraryLinkPathname } from "@/router";
import { DATA_LINK_SLUG_PATTERN } from "@/services/local-data-link/constants";

export const WIZARD_FAVORITES_STORAGE_KEY = "code2graph-wizard-favorites";

export const WIZARD_FAVORITE_FALLBACK_TITLE = "Diagram";

export const WIZARD_FAVORITE_KINDS = ["example", "local", "server-link"] as const;

export type WizardFavoriteKind = (typeof WIZARD_FAVORITE_KINDS)[number];

export const WIZARD_FAVORITE_ERRORS = [
  "missing",
  "tooLarge",
  "storage",
  "empty",
  "invalid",
  "viewOnly",
  "fetch",
  "noApi",
] as const;

export type WizardFavoriteError = (typeof WIZARD_FAVORITE_ERRORS)[number];

export interface WizardFavoriteExampleRef {
  kind: "example";
  exampleId: string;
}

export interface WizardFavoriteLocalRef {
  kind: "local";
  diagramId: string;
}

export interface WizardFavoriteServerLinkRef {
  kind: "server-link";
  username: string;
  slug: string;
}

export type WizardFavoriteRef =
  | WizardFavoriteExampleRef
  | WizardFavoriteLocalRef
  | WizardFavoriteServerLinkRef;

export interface WizardFavoriteEntry {
  id: string;
  ref: WizardFavoriteRef;
  title: string;
  format: DiagramFormat;
  source: string;
}

export interface WizardFavoriteCard {
  id: string;
  title: string;
  kind: WizardFavoriteKind;
  svg: string | null;
  canOpen: boolean;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
}

export interface WizardServerLibraryLink {
  username: string;
  slug: string;
}

interface LinkLocation {
  pathname: string;
  hash: string;
  search: string;
}

export function wizardFavoriteIdentity(ref: WizardFavoriteRef): string {
  if (ref.kind === "example") {
    return `example:${ref.exampleId}`;
  }

  if (ref.kind === "local") {
    return `local:${ref.diagramId}`;
  }

  return `server-link:${ref.username.toLowerCase()}:${ref.slug}`;
}

export function wizardFavoriteSourceByteLength(source: string): number {
  return new TextEncoder().encode(source).length;
}

export function isWizardFavoriteSourceTooLarge(source: string): boolean {
  return wizardFavoriteSourceByteLength(source) > MAX_PUML_FILE_BYTES;
}

export function readWizardFavorites(): WizardFavoriteEntry[] {
  return readStorageJson(WIZARD_FAVORITES_STORAGE_KEY, parseWizardFavorites) ?? [];
}

export function writeWizardFavorites(entries: readonly WizardFavoriteEntry[]): boolean {
  return writeStorageJson(WIZARD_FAVORITES_STORAGE_KEY, entries);
}

export function parseWizardFavorites(value: unknown): WizardFavoriteEntry[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const seen = new Set<string>();
  const entries: WizardFavoriteEntry[] = [];

  for (const item of value) {
    const entry = parseWizardFavoriteEntry(item);
    if (!entry) {
      continue;
    }

    const identity = wizardFavoriteIdentity(entry.ref);
    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    entries.push(entry);
  }

  return entries;
}

export function upsertWizardFavorite(
  entries: readonly WizardFavoriteEntry[],
  entry: WizardFavoriteEntry,
): WizardFavoriteEntry[] {
  const identity = wizardFavoriteIdentity(entry.ref);
  const index = entries.findIndex((item) => wizardFavoriteIdentity(item.ref) === identity);
  if (index < 0) {
    return [...entries, entry];
  }

  const next = entries.slice();
  const current = entries[index];
  if (!current) {
    return [...entries, entry];
  }

  next[index] = { ...entry, id: current.id };
  return next;
}

export function removeWizardFavorite(
  entries: readonly WizardFavoriteEntry[],
  id: string,
): WizardFavoriteEntry[] {
  return entries.filter((entry) => entry.id !== id);
}

export function removeWizardFavoriteByIdentity(
  entries: readonly WizardFavoriteEntry[],
  identity: string,
): WizardFavoriteEntry[] {
  return entries.filter((entry) => wizardFavoriteIdentity(entry.ref) !== identity);
}

export function moveWizardFavorite(
  entries: readonly WizardFavoriteEntry[],
  id: string,
  toIndex: number,
): readonly WizardFavoriteEntry[] {
  const from = entries.findIndex((entry) => entry.id === id);
  if (from < 0 || from === toIndex) {
    return entries;
  }

  const next = entries.slice();
  const [item] = next.splice(from, 1);
  if (!item) {
    return entries;
  }

  const clamped = Math.max(0, Math.min(toIndex, next.length));
  next.splice(clamped, 0, item);
  return next;
}

export function parseWizardServerLibraryLink(raw: string): WizardServerLibraryLink | null {
  const location = linkLocation(raw.trim());
  if (!location) {
    return null;
  }

  return (
    serverLinkFromRoute(parseAppRoute(location)) ??
    serverLinkFromRoute(parseLibraryLinkPathname(location.pathname, ""))
  );
}

function serverLinkFromRoute(
  route: ReturnType<typeof parseAppRoute> | null,
): WizardServerLibraryLink | null {
  if (!route || route.name !== "libraryLink" || !route.libraryUsername || !route.libraryLinkSlug) {
    return null;
  }

  return {
    username: route.libraryUsername,
    slug: route.libraryLinkSlug,
  };
}

function linkLocation(raw: string): LinkLocation | null {
  if (!raw) {
    return null;
  }

  try {
    const url = new URL(raw);
    return {
      pathname: url.pathname,
      hash: url.hash,
      search: url.search,
    };
  } catch {
    return splitLinkLocation(raw.startsWith("/") || raw.startsWith("?") || raw.startsWith("#")
      ? raw
      : `/${raw}`);
  }
}

function splitLinkLocation(value: string): LinkLocation {
  const hashIndex = value.indexOf("#");
  const hash = hashIndex >= 0 ? value.slice(hashIndex) : "";
  const beforeHash = hashIndex >= 0 ? value.slice(0, hashIndex) : value;
  const queryIndex = beforeHash.indexOf("?");
  const search = queryIndex >= 0 ? beforeHash.slice(queryIndex) : "";
  const pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;

  return {
    pathname: pathname || "/",
    hash,
    search,
  };
}

function parseWizardFavoriteEntry(value: unknown): WizardFavoriteEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const ref = parseWizardFavoriteRef(value.ref);
  if (!ref || typeof value.id !== "string" || !value.id.trim()) {
    return null;
  }

  if (typeof value.format !== "string" || !isDiagramFormat(value.format)) {
    return null;
  }

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const source = typeof value.source === "string" ? value.source : "";

  return {
    id: value.id,
    ref,
    title: title || WIZARD_FAVORITE_FALLBACK_TITLE,
    format: value.format,
    source,
  };
}

function parseWizardFavoriteRef(value: unknown): WizardFavoriteRef | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }

  if (value.kind === "example" && isNonEmptyString(value.exampleId)) {
    return { kind: "example", exampleId: value.exampleId };
  }

  if (value.kind === "local" && isNonEmptyString(value.diagramId)) {
    return { kind: "local", diagramId: value.diagramId };
  }

  if (
    value.kind === "server-link" &&
    isNonEmptyString(value.username) &&
    isNonEmptyString(value.slug) &&
    DATA_LINK_SLUG_PATTERN.test(value.slug)
  ) {
    return {
      kind: "server-link",
      username: value.username.trim(),
      slug: value.slug,
    };
  }

  return null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
