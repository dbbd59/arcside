import { mergeUrlSpaces, spaceForUrl, type UrlSpaces } from "./lib/url-spaces";
import { preferencesStore, sessionStore } from "./lib/models";

const STORE_KEY = "arcsideUrlSpaces";
const SNAPSHOT_DELAY_MS = 2000;
const STARTUP_SWEEP_MS = 1500;

let cache: Promise<UrlSpaces> | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

const load = () => (cache ??= chrome.storage.local.get(STORE_KEY).then(data => (data[STORE_KEY] ?? {}) as UrlSpaces));

async function snapshot() {
  const [session, tabs, current] = await Promise.all([sessionStore.read(), chrome.tabs.query({}), load()]);
  const next = mergeUrlSpaces(current, tabs.map(tab => ({ url: tab.url, spaceId: tab.id === undefined ? undefined : session.tabSpaces[tab.id] })));
  if (JSON.stringify(next) === JSON.stringify(current)) return;
  cache = Promise.resolve(next);
  await chrome.storage.local.set({ [STORE_KEY]: next });
}

export function scheduleSnapshot(onError: (error: unknown) => void) {
  clearTimeout(timer);
  timer = setTimeout(() => { snapshot().catch(onError); }, SNAPSHOT_DELAY_MS);
}

export async function restoreSpaces(tabs: chrome.tabs.Tab[]) {
  const [session, preferences, map] = await Promise.all([sessionStore.read(), preferencesStore.read(), load()]);
  const spaceIds = preferences.spaces.map(space => space.id);
  const assignments = Object.fromEntries(tabs.flatMap(tab => {
    const spaceId = tab.id !== undefined && session.tabSpaces[tab.id] === undefined ? spaceForUrl(map, tab.url, spaceIds) : undefined;
    return spaceId ? [[tab.id!, spaceId]] : [];
  }));
  if (Object.keys(assignments).length) {
    await sessionStore.update(current => ({ ...current, tabSpaces: { ...assignments, ...current.tabSpaces } }));
  }
}

export function scheduleStartupSweep(onError: (error: unknown) => void) {
  setTimeout(() => { chrome.tabs.query({}).then(restoreSpaces).catch(onError); }, STARTUP_SWEEP_MS);
}
