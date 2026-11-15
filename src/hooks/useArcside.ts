import { useEffect, useMemo } from "react";
import { bookmarkMap } from "@/lib/bookmarks";
import { LINK_COPIED, type RuntimeMessage } from "@/lib/messages";
import { sameUrl } from "@/lib/urls";
import { DEFAULT_SPACE_ID, isUnresolvedFavorite, preferencesStore, sessionStore, windowKey } from "@/lib/models";
import { resolveLegacyFavorites } from "@/lib/prefs-ops";
import type { ArcsideContext } from "./arcside-context";
import { libraryActions } from "./libraryActions";
import { spaceActions } from "./spaceActions";
import { tabActions } from "./tabActions";
import { useBrowserState } from "./useBrowserState";
import { useStore } from "./useStore";
import { useUndo } from "./useUndo";

export function useArcside() {
  const { toast, setToast, onError, run, remember, undo } = useUndo();
  const [preferences, preferencesLoaded] = useStore(preferencesStore, onError);
  const [session, sessionLoaded] = useStore(sessionStore, onError);
  const { tabs, tree, windowId, closed, refreshClosed, loaded: browserLoaded } = useBrowserState(onError);

  const ready = browserLoaded && preferencesLoaded && sessionLoaded;
  const bookmarkById = useMemo(() => bookmarkMap(tree), [tree]);

  useEffect(() => {
    if (!ready) return;
    const legacy = Object.values(preferences.favorites).flat().filter(isUnresolvedFavorite);
    if (!legacy.length) return;
    void (async () => {
      const lookups = await Promise.allSettled(legacy.map(item => chrome.bookmarks.get(item.id)));
      const resolved = new Map(lookups.flatMap(result => result.status === "fulfilled" && result.value[0]?.url
        ? [[result.value[0].id, { title: result.value[0].title, url: result.value[0].url }] as const] : []));
      await preferencesStore.update(current => ({ ...current, favorites: resolveLegacyFavorites(current.favorites, resolved) }));
    })().catch(onError);
  }, [ready, preferences.favorites]);
  const activeSpace = preferences.spaces.find(space => space.id === session.activeSpaceByWindow[windowId])
    ?? preferences.spaces.find(space => space.id === DEFAULT_SPACE_ID)!;
  const favorites = preferences.favorites[activeSpace.id] ?? [];
  const activeTab = tabs.find(tab => tab.active);
  const findTab = (tabId: number) => tabs.find(tab => tab.id === tabId);
  const assignedSpace = (tabId: number) => session.tabSpaces[tabId] ?? DEFAULT_SPACE_ID;

  const liveTabs = new Map(
    [...Object.values(preferences.favorites).flat().map(item => item.id), ...preferences.saved.map(item => item.id)].flatMap(id => {
      const tab = findTab(session.boundTabs[windowKey(windowId, id)]);
      return tab ? [[id, tab] as const] : [];
    }));

  const boundSpace = (tabId: number) => {
    const ownerId = [...liveTabs].find(([, tab]) => tab.id === tabId)?.[0];
    if (!ownerId) return undefined;
    return preferences.saved.find(item => item.id === ownerId)?.spaceId
      ?? Object.entries(preferences.favorites).find(([, items]) => items.some(item => item.id === ownerId))?.[0];
  };
  const spaceOfTab = (tabId: number) => boundSpace(tabId) ?? assignedSpace(tabId);

  const assignTab = (tabId: number, spaceId: string) =>
    sessionStore.update(current => ({ ...current, tabSpaces: { ...current.tabSpaces, [tabId]: spaceId } }));

  const bindTab = (itemId: string, tabId: number) =>
    sessionStore.update(current => ({ ...current, boundTabs: { ...current.boundTabs, [windowKey(windowId, itemId)]: tabId } }));

  const setActiveSpace = (spaceId: string) =>
    sessionStore.update(current => ({ ...current, activeSpaceByWindow: { ...current.activeSpaceByWindow, [windowId]: spaceId } }));

  const openTab = async (spaceId: string, url?: string) => {
    const created = await chrome.tabs.create({ url, active: true, windowId });
    await assignTab(created.id!, spaceId);
  };

  useEffect(() => {
    const onMessage = (message: RuntimeMessage) => {
      if (message.type === "copied") setToast({ text: LINK_COPIED });
    };
    chrome.runtime.onMessage.addListener(onMessage);
    return () => chrome.runtime.onMessage.removeListener(onMessage);
  }, [setToast]);

  useEffect(() => {
    if (!ready) return;
    const candidates = [
      ...favorites,
      ...preferences.saved.filter(item => item.spaceId === activeSpace.id)
    ];
    const taken = new Set([...liveTabs.values()].map(tab => tab.id));
    const additions: Record<string, number> = {};
    for (const { id, url } of candidates) {
      if (liveTabs.has(id)) continue;
      const tab = tabs.find(item => !taken.has(item.id) && sameUrl(item.url, url));
      if (tab) { taken.add(tab.id); additions[windowKey(windowId, id)] = tab.id; }
    }
    if (Object.keys(additions).length) {
      sessionStore.update(current => ({ ...current, boundTabs: { ...current.boundTabs, ...additions } })).catch(onError);
    }
  }, [ready, tabs, tree, session, preferences, windowId, activeSpace.id]);

  useEffect(() => {
    if (!ready || !activeTab) return;
    const key = windowKey(windowId, spaceOfTab(activeTab.id));
    if (session.lastTabBySpace[key] === activeTab.id) return;
    sessionStore.update(current => ({ ...current, lastTabBySpace: { ...current.lastTabBySpace, [key]: activeTab.id } })).catch(onError);
  }, [ready, activeTab?.id, session, preferences, windowId]);

  const context: ArcsideContext = {
    tabs, windowId, preferences, session, activeSpace, activeTab, liveTabs, bookmarkById,
    findTab, assignedSpace, boundSpace, spaceOfTab, assignTab, bindTab, setActiveSpace, openTab, remember, setToast, refreshClosed
  };

  return {
    tabs, tree, preferences, ready, windowId, activeTab, activeSpace, favorites, liveTabs, closed,
    toast, setToast, onError, run, undo, assignedSpace, assignTab,
    ...tabActions(context), ...spaceActions(context), ...libraryActions(context)
  };
}
