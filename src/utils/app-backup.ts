import { AI_CHAT_APPLY_MODE_STORAGE_KEY, AI_CHAT_CONTEXT_MODE_STORAGE_KEY } from "@/constants/ai-chat";
import {
  STORAGE_KEY_DIAGRAM_DARK,
  STORAGE_KEY_LAYOUT,
  STORAGE_KEY_UI_DARK,
} from "@/constants";
import type { DiagramDto, SectionDto } from "@/constants/diagram-library";
import {
  STORAGE_KEY_ACTIVE_LIBRARY_PROFILE_ID,
  STORAGE_KEY_LIBRARY_API_PASSWORD,
  STORAGE_KEY_LIBRARY_API_URL,
  STORAGE_KEY_LIBRARY_API_USERNAME,
  STORAGE_KEY_LIBRARY_AUTH_TOKEN,
  STORAGE_KEY_LIBRARY_PROFILE_SECRETS,
  STORAGE_KEY_LIBRARY_PROFILES,
  STORAGE_KEY_LIBRARY_TARGET,
  STORAGE_KEY_REMEMBER_LOGIN,
} from "@/constants/diagram-library";
import {
  STORAGE_KEY_DIAGRAM_FONT_FAMILY,
  STORAGE_KEY_DIAGRAM_FONT_STYLE,
  STORAGE_KEY_DIAGRAM_FONT_WEIGHT,
  STORAGE_KEY_DIAGRAM_TEXT_COLOR,
  STORAGE_KEY_EDITOR_AUTOCOMPLETE,
  STORAGE_KEY_EDITOR_FONT_FAMILY,
  STORAGE_KEY_EDITOR_FONT_SIZE,
  STORAGE_KEY_EDITOR_SYNTAX_HIGHLIGHT,
  STORAGE_KEY_PREVIEW_BG,
} from "@/constants/editor-settings";
import { STORAGE_KEY_LOCALE } from "@/constants/i18n";
import { STORAGE_KEY_SPLIT_RATIO } from "@/constants/layout-settings";
import { STORAGE_KEY_LLM_API_KEYS, STORAGE_KEY_LLM_CONSENT, STORAGE_KEY_LLM_PROVIDER } from "@/constants/llm-settings";
import { STORAGE_KEY_PWA_BANNER_DISMISSED } from "@/constants/pwa-settings";
import {
  STORAGE_KEY_WIZARD_FOLD_ONBOARDING_DISMISSED,
  STORAGE_KEY_WIZARD_ONBOARDING_DISMISSED,
} from "@/constants/wizard-settings";
import { WIZARD_FAVORITES_STORAGE_KEY } from "@/constants/wizard-favorites";
import { STORAGE_KEY_IMAGE_SIZE } from "@/composables/useImageSize";
import { readStorageItem, removeStorageItem, writeStorageItem } from "@/core/safe-storage";
import { trackSave } from "@/analytics";
import {
  loadAllDiagramDetailsFromCache,
  loadSectionsFromCache,
} from "@/storage/diagram-store";
import {
  loadCustomSnippets,
  parseCustomSnippetRecord,
  STORAGE_KEY_SNIPPETS_PANEL_POSITION,
} from "@/storage/snippets";
import type { CustomSnippet } from "@/types/snippets";
import { downloadTextFile } from "@/utils/export";
import {
  parseExportedDiagram,
  parseExportedSection,
} from "@/utils/library-import-export";

export const APP_BACKUP_KIND = "code2graph-backup";
export const APP_BACKUP_VERSION = 1;
export const APP_BACKUP_FILE_NAME = "code2graph-backup.json";
export const APP_BACKUP_MIME_TYPE = "application/json;charset=utf-8";

export const APP_BACKUP_ERROR_INVALID = "invalid_backup";

/**
 * Настройки, которые переносятся файлом.
 * Ключ API LLM намеренно отсутствует: секрет провайдера остаётся в браузере.
 */
export const BACKUP_SETTINGS_KEYS = [
  STORAGE_KEY_UI_DARK,
  STORAGE_KEY_DIAGRAM_DARK,
  STORAGE_KEY_LAYOUT,
  STORAGE_KEY_LOCALE,
  STORAGE_KEY_SPLIT_RATIO,
  STORAGE_KEY_EDITOR_FONT_SIZE,
  STORAGE_KEY_EDITOR_FONT_FAMILY,
  STORAGE_KEY_EDITOR_SYNTAX_HIGHLIGHT,
  STORAGE_KEY_EDITOR_AUTOCOMPLETE,
  STORAGE_KEY_PREVIEW_BG,
  STORAGE_KEY_DIAGRAM_TEXT_COLOR,
  STORAGE_KEY_DIAGRAM_FONT_FAMILY,
  STORAGE_KEY_DIAGRAM_FONT_WEIGHT,
  STORAGE_KEY_DIAGRAM_FONT_STYLE,
  STORAGE_KEY_IMAGE_SIZE,
  STORAGE_KEY_WIZARD_ONBOARDING_DISMISSED,
  STORAGE_KEY_WIZARD_FOLD_ONBOARDING_DISMISSED,
  WIZARD_FAVORITES_STORAGE_KEY,
  STORAGE_KEY_LLM_PROVIDER,
  STORAGE_KEY_LLM_CONSENT,
  AI_CHAT_CONTEXT_MODE_STORAGE_KEY,
  AI_CHAT_APPLY_MODE_STORAGE_KEY,
  STORAGE_KEY_PWA_BANNER_DISMISSED,
  STORAGE_KEY_SNIPPETS_PANEL_POSITION,
  STORAGE_KEY_LIBRARY_API_URL,
  STORAGE_KEY_LIBRARY_API_USERNAME,
  STORAGE_KEY_LIBRARY_API_PASSWORD,
  STORAGE_KEY_LIBRARY_TARGET,
  STORAGE_KEY_LIBRARY_PROFILES,
  STORAGE_KEY_ACTIVE_LIBRARY_PROFILE_ID,
  STORAGE_KEY_LIBRARY_PROFILE_SECRETS,
  STORAGE_KEY_LIBRARY_AUTH_TOKEN,
  STORAGE_KEY_REMEMBER_LOGIN,
] as const;

export type BackupSettingsKey = (typeof BACKUP_SETTINGS_KEYS)[number];

export class AppBackupFormatError extends Error {
  constructor() {
    super(APP_BACKUP_ERROR_INVALID);
    this.name = "AppBackupFormatError";
  }
}

export interface AppBackupLibrary {
  sections: SectionDto[];
  diagrams: DiagramDto[];
}

export interface AppBackupFile {
  kind: typeof APP_BACKUP_KIND;
  version: typeof APP_BACKUP_VERSION;
  exportedAt: string;
  library: AppBackupLibrary;
  snippets: CustomSnippet[];
  settings: Record<string, string>;
}

export type BackupDiffKind = "new" | "changed";

export interface DiagramBackupDiff {
  kind: BackupDiffKind;
  diagram: DiagramDto;
}

export interface SnippetBackupDiff {
  kind: BackupDiffKind;
  snippet: CustomSnippet;
}

export type AppBackupRestoreMode = "save-and-replace" | "replace";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isBackupSettingsKey(key: string): key is BackupSettingsKey {
  return (BACKUP_SETTINGS_KEYS as readonly string[]).includes(key);
}

function rememberBackupSetting(
  settings: Record<string, string>,
  key: string,
  value: string,
): void {
  if (key === STORAGE_KEY_LLM_API_KEYS || !isBackupSettingsKey(key)) {
    return;
  }
  settings[key] = value;
}

export function collectBackupSettings(): Record<string, string> {
  const settings: Record<string, string> = {};
  for (const key of BACKUP_SETTINGS_KEYS) {
    const value = readStorageItem(key);
    if (value === null) {
      continue;
    }
    rememberBackupSetting(settings, key, value);
  }
  delete settings[STORAGE_KEY_LLM_API_KEYS];
  return settings;
}

export function applyBackupSettings(settings: Record<string, string>): void {
  for (const key of BACKUP_SETTINGS_KEYS) {
    const value = settings[key];
    if (typeof value === "string") {
      writeStorageItem(key, value);
      continue;
    }
    removeStorageItem(key);
  }
}

function sameStringList(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

function diagramContentDiffers(local: DiagramDto, incoming: DiagramDto): boolean {
  return (
    local.sectionId !== incoming.sectionId ||
    local.title !== incoming.title ||
    local.description !== incoming.description ||
    !sameStringList(local.tags, incoming.tags) ||
    local.language !== incoming.language ||
    local.source !== incoming.source ||
    local.fileName !== incoming.fileName
  );
}

function snippetContentDiffers(local: CustomSnippet, incoming: CustomSnippet): boolean {
  return (
    local.title !== incoming.title ||
    (local.description ?? "") !== (incoming.description ?? "") ||
    local.language !== incoming.language ||
    local.categoryId !== incoming.categoryId ||
    local.content !== incoming.content
  );
}

export function diffBackupDiagrams(
  localDiagrams: readonly DiagramDto[],
  fileDiagrams: readonly DiagramDto[],
): DiagramBackupDiff[] {
  const localById = new Map(localDiagrams.map((diagram) => [diagram.id, diagram]));
  const diffs: DiagramBackupDiff[] = [];
  for (const diagram of fileDiagrams) {
    const local = localById.get(diagram.id);
    if (!local) {
      diffs.push({ kind: "new", diagram });
      continue;
    }
    if (diagramContentDiffers(local, diagram)) {
      diffs.push({ kind: "changed", diagram });
    }
  }
  return diffs;
}

export function diffBackupSnippets(
  localSnippets: readonly CustomSnippet[],
  fileSnippets: readonly CustomSnippet[],
): SnippetBackupDiff[] {
  const localById = new Map(localSnippets.map((snippet) => [snippet.id, snippet]));
  const diffs: SnippetBackupDiff[] = [];
  for (const snippet of fileSnippets) {
    const local = localById.get(snippet.id);
    if (!local) {
      diffs.push({ kind: "new", snippet });
      continue;
    }
    if (snippetContentDiffers(local, snippet)) {
      diffs.push({ kind: "changed", snippet });
    }
  }
  return diffs;
}

export function mergeSelectedSnippets(
  localSnippets: readonly CustomSnippet[],
  fileSnippets: readonly CustomSnippet[],
  selectedIds: ReadonlySet<string>,
): CustomSnippet[] {
  const selected = fileSnippets.filter((snippet) => selectedIds.has(snippet.id));
  const replacements = new Map(selected.map((snippet) => [snippet.id, snippet]));
  const merged: CustomSnippet[] = [];
  const seen = new Set<string>();

  for (const snippet of localSnippets) {
    merged.push(replacements.get(snippet.id) ?? snippet);
    seen.add(snippet.id);
  }

  for (const snippet of selected) {
    if (!seen.has(snippet.id)) {
      merged.push(snippet);
    }
  }

  return merged;
}

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

function parseBackupSettings(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    throw new AppBackupFormatError();
  }

  const settings: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string") {
      continue;
    }
    rememberBackupSetting(settings, key, entry);
  }
  delete settings[STORAGE_KEY_LLM_API_KEYS];
  return settings;
}

function parseBackupLibrary(value: unknown): AppBackupLibrary {
  if (!isRecord(value) || !Array.isArray(value.sections) || !Array.isArray(value.diagrams)) {
    throw new AppBackupFormatError();
  }

  const sections: SectionDto[] = [];
  for (const entry of value.sections) {
    const section = parseExportedSection(entry);
    if (!section) {
      throw new AppBackupFormatError();
    }
    sections.push(section);
  }

  const diagrams: DiagramDto[] = [];
  for (const entry of value.diagrams) {
    const diagram = parseExportedDiagram(entry);
    if (!diagram) {
      throw new AppBackupFormatError();
    }
    diagrams.push(diagram);
  }

  return {
    sections: uniqueById(sections),
    diagrams: uniqueById(diagrams),
  };
}

function parseBackupSnippets(value: unknown): CustomSnippet[] {
  if (!Array.isArray(value)) {
    throw new AppBackupFormatError();
  }

  const snippets: CustomSnippet[] = [];
  for (const entry of value) {
    const snippet = parseCustomSnippetRecord(entry);
    if (!snippet) {
      throw new AppBackupFormatError();
    }
    snippets.push(snippet);
  }
  return uniqueById(snippets);
}

export function parseAppBackup(content: string): AppBackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AppBackupFormatError();
  }

  if (
    !isRecord(parsed) ||
    parsed.kind !== APP_BACKUP_KIND ||
    parsed.version !== APP_BACKUP_VERSION ||
    typeof parsed.exportedAt !== "string"
  ) {
    throw new AppBackupFormatError();
  }

  return {
    kind: APP_BACKUP_KIND,
    version: APP_BACKUP_VERSION,
    exportedAt: parsed.exportedAt,
    library: parseBackupLibrary(parsed.library),
    snippets: parseBackupSnippets(parsed.snippets),
    settings: parseBackupSettings(parsed.settings),
  };
}

export async function buildAppBackup(): Promise<AppBackupFile> {
  const [sections, diagrams] = await Promise.all([
    loadSectionsFromCache(),
    loadAllDiagramDetailsFromCache(),
  ]);

  return {
    kind: APP_BACKUP_KIND,
    version: APP_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    library: {
      sections,
      diagrams,
    },
    snippets: loadCustomSnippets(),
    settings: collectBackupSettings(),
  };
}

export function downloadAppBackup(backup: AppBackupFile): void {
  downloadTextFile(
    JSON.stringify(backup, null, 2),
    APP_BACKUP_FILE_NAME,
    APP_BACKUP_MIME_TYPE,
  );
  trackSave("app-backup-json", "Save app backup: JSON");
}
