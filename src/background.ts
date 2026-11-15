import { BACKUP_ALARM, BACKUP_CHECK_MINUTES, backupIfDue } from "./backup-job";
import { staleTabIds } from "./lib/archive";
import { paletteItems, type PaletteItem } from "./lib/palette-search";
import type { RuntimeMessage } from "./lib/messages";
import { DEFAULT_SPACE_ID, preferencesStore, sessionStore, withoutTab, withoutWindow } from "./lib/models";
import { sameUrl } from "./lib/urls";
import { restoreSpaces, scheduleSnapshot, scheduleStartupSweep } from "./url-spaces-job";

const ARCHIVE_ALARM = "archive-stale-tabs";
const ARCHIVE_PERIOD_MINUTES = 10;
const ARCHIVE_LIMIT = 200;
const HOUR_MS = 3600_000;
const BADGE_MS = 1500;

const send = (message: RuntimeMessage) => chrome.runtime.sendMessage(message);
const report = (error: unknown) => console.error(error);

void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
const ensureAlarm = (name: string, periodInMinutes: number) =>
  chrome.alarms.get(name).then(alarm => { if (!alarm) void chrome.alarms.create(name, { periodInMinutes }); });
void ensureAlarm(ARCHIVE_ALARM, ARCHIVE_PERIOD_MINUTES);
void ensureAlarm(BACKUP_ALARM, BACKUP_CHECK_MINUTES);
backupIfDue().catch(report);

chrome.runtime.onStartup.addListener(() => scheduleStartupSweep(report));
chrome.storage.onChanged.addListener((_changes, area) => { if (area === "session") scheduleSnapshot(report); });
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.url) restoreSpaces([tab]).catch(report);
});

chrome.tabs.onRemoved.addListener(tabId => { sessionStore.update(session => withoutTab(session, tabId)).catch(report); });
chrome.windows.onRemoved.addListener(windowId => { sessionStore.update(session => withoutWindow(session, windowId)).catch(report); });

const touchTab = (tabId: number) =>
  sessionStore.update(session => ({ ...session, lastActive: { ...session.lastActive, [tabId]: Date.now() } })).catch(report);
chrome.tabs.onActivated.addListener(({ tabId }) => { void touchTab(tabId); });

chrome.tabs.onCreated.addListener(tab => {
  const { id, windowId } = tab;
  if (id === undefined) return;
  sessionStore.update(session => {
    const space = session.activeSpaceByWindow[windowId];
    return {
      ...session,
      lastActive: { ...session.lastActive, [id]: Date.now() },
      tabSpaces: space && session.tabSpaces[id] === undefined ? { ...session.tabSpaces, [id]: space } : session.tabSpaces
    };
  }).catch(report);
});

async function copyToClipboard(text: string) {
  const open = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT] });
  if (!open.length) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [chrome.offscreen.Reason.CLIPBOARD],
      justification: "Copy the active tab link"
    });
  }
  await send({ type: "copy-to-clipboard", text });
}

chrome.commands.onCommand.addListener(command => {
  if (command !== "copy-url") return;
  void (async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab?.url) return;
    await copyToClipboard(tab.url);
    await chrome.action.setBadgeBackgroundColor({ color: "#2f6df6" });
    await chrome.action.setBadgeText({ text: "✓" });
    send({ type: "copied" }).catch(() => {});
    setTimeout(() => { void chrome.action.setBadgeText({ text: "" }); }, BADGE_MS);
  })().catch(report);
});

async function protectedUrls(): Promise<string[]> {
  const preferences = await preferencesStore.read();
  return [...preferences.saved.map(item => item.url), ...Object.values(preferences.favorites).flat().map(item => item.url).filter(Boolean)];
}

async function archiveStaleTabs() {
  const preferences = await preferencesStore.read();
  if (!preferences.archiveAfterHours) return;
  const session = await sessionStore.read();
  const tabs = (await chrome.tabs.query({})).filter((tab): tab is chrome.tabs.Tab & { id: number } => tab.id !== undefined);
  const now = Date.now();
  const firstSeen = Object.fromEntries(tabs.filter(tab => session.lastActive[tab.id] === undefined).map(tab => [tab.id, now]));
  const lastActive = { ...firstSeen, ...session.lastActive };
  if (Object.keys(firstSeen).length) await sessionStore.update(current => ({ ...current, lastActive: { ...firstSeen, ...current.lastActive } }));

  const doomed = new Set(staleTabIds(tabs, {
    now, maxAgeMs: preferences.archiveAfterHours * HOUR_MS, lastActive,
    boundTabIds: new Set(Object.values(session.boundTabs)), protectedUrls: await protectedUrls()
  }));
  if (!doomed.size) return;
  const archivedTabs = tabs.filter(tab => doomed.has(tab.id)).map(tab => ({
    id: crypto.randomUUID(), title: tab.title || tab.url!, url: tab.url!,
    spaceId: session.tabSpaces[tab.id] ?? DEFAULT_SPACE_ID, closedAt: now
  }));
  await preferencesStore.update(current => ({ ...current, archived: [...archivedTabs, ...current.archived].slice(0, ARCHIVE_LIMIT) }));
  await chrome.tabs.remove([...doomed]);
}

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === ARCHIVE_ALARM) archiveStaleTabs().catch(report);
  if (alarm.name === BACKUP_ALARM) backupIfDue().catch(report);
});

async function paletteResults(query: string): Promise<PaletteItem[]> {
  const [preferences, session, tabs] = await Promise.all([
    preferencesStore.read(), sessionStore.read(), chrome.tabs.query({ lastFocusedWindow: true })
  ]);
  const spaceName = (id: string) => preferences.spaces.find(space => space.id === id)?.name ?? "";
  const favorites = Object.entries(preferences.favorites).flatMap(([spaceId, items]) =>
    items.filter(item => item.url).map(item => ({ id: item.id, title: item.title, url: item.url, hint: "Favorite", spaceId })));
  const recent = tabs.filter(tab => tab.id !== undefined && tab.url).sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0));
  return paletteItems(query,
    recent.map(tab => ({ id: String(tab.id), title: tab.title ?? "", url: tab.url!, hint: spaceName(session.tabSpaces[tab.id!] ?? DEFAULT_SPACE_ID) })),
    preferences.saved.map(item => ({ id: item.id, title: item.title, url: item.url, hint: spaceName(item.spaceId), spaceId: item.spaceId })),
    favorites);
}

async function openPaletteItem(item: PaletteItem) {
  if (item.kind === "tab") {
    const tab = await chrome.tabs.update(Number(item.id), { active: true });
    if (tab?.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
    return;
  }
  const existing = (await chrome.tabs.query({})).find(tab => sameUrl(tab.url, item.url));
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true });
    await chrome.windows.update(existing.windowId, { focused: true });
    return;
  }
  const created = await chrome.tabs.create({ url: item.url, active: true });
  if (item.spaceId && created.id !== undefined) {
    const tabId = created.id;
    await sessionStore.update(session => ({ ...session, tabSpaces: { ...session.tabSpaces, [tabId]: item.spaceId! } }));
  }
}

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, respond) => {
  if (message.type === "palette-query") {
    paletteResults(message.query).then(respond).catch(error => { report(error); respond([]); });
    return true;
  }
  if (message.type === "palette-open") openPaletteItem(message.item).catch(report);
});

chrome.commands.onCommand.addListener(command => {
  if (command !== "open-palette") return;
  void (async () => {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id !== undefined) await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["overlay.js"] });
  })().catch(report);
});
