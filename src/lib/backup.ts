import type { BookmarkLink } from "./bookmarks";
import { safeWebUrl } from "./urls";
import { DEFAULT_PREFERENCES, pickSettings, validPreferences, type Preferences, type Settings } from "./models";
import { mergeFavorites } from "./prefs-ops";

export type BackupScope = "all" | "space";
export type ImportMode = "merge" | "replace";

interface BackupFile {
  app: "arcside";
  version: 2;
  exportedAt: number;
  scope: BackupScope;
  spaces: Preferences["spaces"];
  folders: Preferences["folders"];
  saved: Preferences["saved"];
  favorites: Record<string, BookmarkLink[]>;
  settings?: Settings;
}

interface BackupSummary { spaces: number; folders: number; links: number; favorites: number }

export interface ParsedBackup {
  preferences: Preferences;
  hasSettings: boolean;
  scope: BackupScope;
  exportedAt: number | null;
  summary: BackupSummary;
  skipped: number;
}

const LEGACY_APPS = ["arcside", "dock"];
const SUPPORTED_VERSIONS = [1, 2];

export const summarize = (preferences: { spaces: unknown[]; folders: unknown[]; saved: unknown[]; favorites: Record<string, { url: string }[]> }): BackupSummary => ({
  spaces: preferences.spaces.length,
  folders: preferences.folders.length,
  links: preferences.saved.length,
  favorites: Object.values(preferences.favorites).flat().filter(item => item.url).length
});

export function buildBackup(preferences: Preferences, options: { spaceId?: string; now?: number } = {}): BackupFile {
  const { spaceId, now = Date.now() } = options;
  const inScope = <T extends { spaceId: string }>(items: T[]) => spaceId ? items.filter(item => item.spaceId === spaceId) : items;
  const favorites = Object.entries(preferences.favorites).filter(([id]) => !spaceId || id === spaceId);
  return {
    app: "arcside",
    version: 2,
    exportedAt: now,
    scope: spaceId ? "space" : "all",
    spaces: spaceId ? preferences.spaces.filter(space => space.id === spaceId) : preferences.spaces,
    folders: inScope(preferences.folders),
    saved: inScope(preferences.saved),
    favorites: Object.fromEntries(favorites.map(([id, items]) => [id, items.filter(item => item.url).map(({ title, url }) => ({ title, url }))])),
    ...(spaceId ? {} : { settings: pickSettings(preferences) })
  };
}

const entries = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

export function parseBackup(text: string): ParsedBackup {
  let data: Partial<BackupFile>;
  try { data = JSON.parse(text); } catch { throw new Error("This file is not valid JSON."); }
  if (!data || !LEGACY_APPS.includes(data.app as string) || !SUPPORTED_VERSIONS.includes(data.version as number)) {
    throw new Error("This is not an Arcside backup file.");
  }
  const scope: BackupScope = data.scope === "space" ? "space" : "all";
  let invalidFavorites = 0;
  const favorites = Object.fromEntries(Object.entries(data.favorites ?? {}).map(([spaceId, links]) => {
    const raw = entries(links);
    const valid = raw.filter((link): link is BookmarkLink =>
      Boolean(link) && typeof (link as BookmarkLink).title === "string" && typeof (link as BookmarkLink).url === "string" && Boolean(safeWebUrl((link as BookmarkLink).url)));
    invalidFavorites += raw.length - valid.length;
    return [spaceId, mergeFavorites([], valid)];
  }));
  const validated = validPreferences({ ...DEFAULT_PREFERENCES, ...data.settings, spaces: data.spaces, folders: data.folders, saved: data.saved, favorites });
  const listed = new Set(entries(data.spaces).map(space => (space as { id?: string })?.id));
  const preferences = scope === "space" ? { ...validated, spaces: validated.spaces.filter(space => listed.has(space.id)) } : validated;
  const summary = summarize(preferences);
  const skipped = entries(data.folders).length - summary.folders + entries(data.saved).length - summary.links + invalidFavorites;
  return { preferences, hasSettings: Boolean(data.settings), scope, exportedAt: typeof data.exportedAt === "number" ? data.exportedAt : null, summary, skipped: Math.max(0, skipped) };
}

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const BACKUP_FOLDER = "Arcside backups";
const DAY_MS = 86_400_000;

export const backupFilename = (date: Date) => `${BACKUP_FOLDER}/arcside-backup-${WEEKDAYS[date.getDay()]}.json`;

export const manualBackupFilename = (date: Date, spaceName?: string) => {
  const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `arcside-${spaceName ? `${spaceName.toLowerCase().replace(/\W+/g, "-").replace(/^-|-$/g, "")}-` : ""}backup-${stamp}.json`;
};

export const hasBackupContent = (preferences: Preferences) =>
  preferences.saved.length + preferences.folders.length + Object.values(preferences.favorites).flat().length > 0;

export const isBackupDue = (preferences: Preferences, now: number) =>
  preferences.dailyBackup && hasBackupContent(preferences) && now - preferences.lastBackupAt >= DAY_MS;
