import { DEFAULT_FONT, isFontId, type FontId } from "./fonts";

export const AMBIENT_MODES = ["calm", "vivid"] as const;
export type AmbientMode = (typeof AMBIENT_MODES)[number];
export type SpaceAmbient = "off" | AmbientMode;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
export const isAmbientMode = (value: unknown): value is AmbientMode => AMBIENT_MODES.includes(value as AmbientMode);
export const isSpaceAmbient = (value: unknown): value is SpaceAmbient => value === "off" || isAmbientMode(value);

export interface Space {
  id: string;
  name: string;
  color: string;
  emoji: string;
  color2?: string;
  ambient?: SpaceAmbient;
}

export type SpaceFields = Omit<Space, "id">;

export interface Folder {
  id: string;
  name: string;
  spaceId: string;
  parentId: string | null;
  open: boolean;
  color: string | null;
}

export interface SavedItem {
  id: string;
  title: string;
  url: string;
  spaceId: string;
  folderId: string | null;
}

export interface FavoriteItem {
  id: string;
  title: string;
  url: string;
}

export interface ArchivedTab {
  id: string;
  title: string;
  url: string;
  spaceId: string;
  closedAt: number;
}

export interface Preferences {
  spaces: Space[];
  folders: Folder[];
  saved: SavedItem[];
  favorites: Record<string, FavoriteItem[]>;
  archived: ArchivedTab[];
  archiveAfterHours: number;
  ambient: boolean;
  ambientIntensity: number;
  ambientMode: AmbientMode;
  ambientSpaceColor: boolean;
  swipeThreshold: number;
  font: FontId;
  fetchFavicons: boolean;
  dailyBackup: boolean;
  lastBackupAt: number;
}

const SETTING_KEYS = ["archiveAfterHours", "ambient", "ambientIntensity", "ambientMode", "ambientSpaceColor", "swipeThreshold", "font", "fetchFavicons", "dailyBackup"] as const;
export type Settings = Pick<Preferences, (typeof SETTING_KEYS)[number]>;

export const pickSettings = (preferences: Preferences): Settings =>
  Object.fromEntries(SETTING_KEYS.map(key => [key, preferences[key]])) as Settings;

export interface ClosedEntry { sessionId: string; title: string; url: string; count?: number }

export const windowKey = (windowId: number, id: string) => `${windowId}:${id}`;

/** Tab IDs and window IDs are browser-session-scoped. Never store in local/sync. */
export interface SessionData {
  tabSpaces: Record<string, string>;
  activeSpaceByWindow: Record<string, string>;
  boundTabs: Record<string, number>;
  lastActive: Record<string, number>;
  lastTabBySpace: Record<string, number>;
}

export const DEFAULT_SPACE_ID = "personal";

export const DEFAULT_PREFERENCES: Preferences = {
  spaces: [
    { id: DEFAULT_SPACE_ID, name: "Personal", color: "#ff2fb4", color2: "#ff9f1c", emoji: "✦" },
    { id: "work", name: "Work", color: "#12a37f", emoji: "◈" }
  ],
  folders: [],
  saved: [],
  favorites: {},
  archived: [],
  archiveAfterHours: 12,
  ambient: true,
  ambientIntensity: 100,
  ambientMode: "vivid",
  ambientSpaceColor: false,
  swipeThreshold: 90,
  font: DEFAULT_FONT,
  fetchFavicons: true,
  dailyBackup: true,
  lastBackupAt: 0
};

const DEFAULT_SESSION: SessionData = {
  tabSpaces: {},
  activeSpaceByWindow: {},
  boundTabs: {},
  lastActive: {},
  lastTabBySpace: {}
};

export const isUnresolvedFavorite = (item: FavoriteItem) => item.url === "";

function favoriteItems(value: unknown): FavoriteItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): FavoriteItem[] => {
    if (typeof entry === "string") return [{ id: entry, title: "", url: "" }];
    const item = entry as Partial<FavoriteItem> | null;
    return item && typeof item.id === "string" && typeof item.url === "string"
      ? [{ id: item.id, title: typeof item.title === "string" ? item.title : "", url: item.url }] : [];
  });
}

export function validPreferences(input: unknown): Preferences {
  if (!input || typeof input !== "object") return DEFAULT_PREFERENCES;
  const obj = input as Partial<Preferences> & { favoriteIds?: unknown };
  const spaces = Array.isArray(obj.spaces)
    ? obj.spaces.filter((value): value is Space =>
        Boolean(value) && typeof value.id === "string" &&
        typeof value.name === "string" && typeof value.color === "string" &&
        typeof value.emoji === "string")
        .map(({ ambient, color2, ...rest }): Space => ({
          ...rest,
          ...(typeof color2 === "string" && HEX_COLOR.test(color2) && { color2 }),
          ...(isSpaceAmbient(ambient) && { ambient })
        }))
    : [];
  if (!spaces.some(space => space.id === DEFAULT_SPACE_ID)) {
    spaces.unshift(DEFAULT_PREFERENCES.spaces[0]);
  }
  const folders = Array.isArray(obj.folders)
    ? obj.folders.filter(value =>
        Boolean(value) && typeof value.id === "string" && typeof value.name === "string" &&
        typeof value.spaceId === "string" && (value.parentId === null || typeof value.parentId === "string"))
        .map((value): Folder => ({ ...value, open: value.open === true, color: typeof value.color === "string" ? value.color : null }))
    : [];
  const saved = Array.isArray(obj.saved)
    ? obj.saved.filter((value): value is SavedItem =>
        Boolean(value) && typeof value.id === "string" && typeof value.title === "string" &&
        typeof value.url === "string" && typeof value.spaceId === "string" &&
        (value.folderId === null || typeof value.folderId === "string"))
    : [];
  const favorites: Record<string, FavoriteItem[]> = {};
  if (obj.favorites && typeof obj.favorites === "object") {
    for (const [spaceId, list] of Object.entries(obj.favorites)) favorites[spaceId] = favoriteItems(list);
  }
  if (favoriteItems(obj.favoriteIds).length && !Object.keys(favorites).length) favorites[DEFAULT_SPACE_ID] = favoriteItems(obj.favoriteIds);
  const archived = Array.isArray(obj.archived)
    ? obj.archived.filter((value): value is ArchivedTab =>
        Boolean(value) && typeof value.id === "string" && typeof value.title === "string" &&
        typeof value.url === "string" && typeof value.spaceId === "string" && typeof value.closedAt === "number")
    : [];
  const archiveAfterHours = typeof obj.archiveAfterHours === "number" && obj.archiveAfterHours >= 0
    ? obj.archiveAfterHours : DEFAULT_PREFERENCES.archiveAfterHours;
  const bounded = (value: unknown, min: number, max: number, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  return {
    spaces, folders, saved, favorites, archived, archiveAfterHours,
    ambient: obj.ambient !== false,
    ambientIntensity: bounded(obj.ambientIntensity, 0, 100, DEFAULT_PREFERENCES.ambientIntensity),
    ambientMode: isAmbientMode(obj.ambientMode) ? obj.ambientMode : DEFAULT_PREFERENCES.ambientMode,
    ambientSpaceColor: obj.ambientSpaceColor === true,
    swipeThreshold: bounded(obj.swipeThreshold, 40, 200, DEFAULT_PREFERENCES.swipeThreshold),
    font: isFontId(obj.font) ? obj.font : DEFAULT_FONT,
    fetchFavicons: obj.fetchFavicons !== false,
    dailyBackup: obj.dailyBackup !== false,
    lastBackupAt: bounded(obj.lastBackupAt, 0, Number.MAX_SAFE_INTEGER, 0)
  };
}

export function validSession(input: unknown): SessionData {
  if (!input || typeof input !== "object") return DEFAULT_SESSION;
  const obj = input as Partial<SessionData>;
  return {
    tabSpaces: obj.tabSpaces && typeof obj.tabSpaces === "object" ? obj.tabSpaces : {},
    activeSpaceByWindow: obj.activeSpaceByWindow && typeof obj.activeSpaceByWindow === "object" ? obj.activeSpaceByWindow : {},
    boundTabs: obj.boundTabs && typeof obj.boundTabs === "object" ? obj.boundTabs : {},
    lastActive: obj.lastActive && typeof obj.lastActive === "object" ? obj.lastActive : {},
    lastTabBySpace: obj.lastTabBySpace && typeof obj.lastTabBySpace === "object" ? obj.lastTabBySpace : {}
  };
}

export function withoutWindow(session: SessionData, windowId: number): SessionData {
  return {
    ...session,
    activeSpaceByWindow: omitKey(session.activeSpaceByWindow, windowId),
    boundTabs: Object.fromEntries(Object.entries(session.boundTabs).filter(([key]) => !key.startsWith(windowKey(windowId, "")))),
    lastTabBySpace: Object.fromEntries(Object.entries(session.lastTabBySpace).filter(([key]) => !key.startsWith(windowKey(windowId, ""))))
  };
}

export function omitKey<T>(record: Record<string, T>, key: string | number): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== String(key)));
}

export function sessionWithoutSpace(session: SessionData, id: string): SessionData {
  const reassign = (record: Record<string, string>) => Object.fromEntries(
    Object.entries(record).map(([key, spaceId]) => [key, spaceId === id ? DEFAULT_SPACE_ID : spaceId]));
  return { ...session, tabSpaces: reassign(session.tabSpaces), activeSpaceByWindow: reassign(session.activeSpaceByWindow) };
}

export function withoutTab(session: SessionData, tabId: number): SessionData {
  return {
    ...session,
    tabSpaces: omitKey(session.tabSpaces, tabId),
    boundTabs: Object.fromEntries(Object.entries(session.boundTabs).filter(([, id]) => id !== tabId)),
    lastActive: omitKey(session.lastActive, tabId),
    lastTabBySpace: Object.fromEntries(Object.entries(session.lastTabBySpace).filter(([, id]) => id !== tabId))
  };
}

export interface Store<T> {
  parse: (input: unknown) => T;
  read: () => Promise<T>;
  update: (transform: (current: T) => T) => Promise<void>;
  subscribe: (listener: (value: T) => void) => () => void;
}

function createStore<T>(area: "local" | "session", key: string, parse: (input: unknown) => T): Store<T> {
  const read = async () => parse((await chrome.storage[area].get(key))[key]);
  const update = async (transform: (current: T) => T) => {
    await navigator.locks.request(`arcside-${key}`, async () => {
      await chrome.storage[area].set({ [key]: transform(await read()) });
    });
  };
  const subscribe = (listener: (value: T) => void) => {
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, changedArea: string) => {
      if (changedArea === area && key in changes) listener(parse(changes[key].newValue));
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => chrome.storage.onChanged.removeListener(onChange);
  };
  return { parse, read, update, subscribe };
}

export const preferencesStore = createStore("local", "arcsidePreferences", validPreferences);
export const sessionStore = createStore("session", "arcsideSession", validSession);
