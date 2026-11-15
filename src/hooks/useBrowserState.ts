import { useCallback, useEffect, useState } from "react";
import type { BookmarkNode } from "@/lib/bookmarks";
import type { Tab } from "@/lib/tabs";
import { RECENTLY_CLOSED_LIMIT } from "@/lib/browser";
import type { ClosedEntry } from "@/lib/models";

const TAB_REFRESH_MS = 80;

function closedEntries(sessions: chrome.sessions.Session[]): ClosedEntry[] {
  return sessions.flatMap((entry): ClosedEntry[] => {
    if (entry.tab?.sessionId) return [{ sessionId: entry.tab.sessionId, title: entry.tab.title || entry.tab.url || "", url: entry.tab.url || "" }];
    const tabs = entry.window?.tabs ?? [];
    return entry.window?.sessionId
      ? [{ sessionId: entry.window.sessionId, title: `Window (${tabs.length} tabs)`, url: tabs[0]?.url ?? "", count: tabs.length }]
      : [];
  });
}

export function useBrowserState(onError: (error: unknown) => void) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [tree, setTree] = useState<BookmarkNode[]>([]);
  const [windowId, setWindowId] = useState<number>(chrome.windows.WINDOW_ID_CURRENT);
  const [closed, setClosed] = useState<ClosedEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refreshClosed = useCallback(async () => {
    setClosed(closedEntries(await chrome.sessions.getRecentlyClosed({ maxResults: RECENTLY_CLOSED_LIMIT })));
  }, []);

  useEffect(() => {
    const onChanged = () => { refreshClosed().catch(onError); };
    onChanged();
    chrome.sessions.onChanged.addListener(onChanged);
    return () => chrome.sessions.onChanged.removeListener(onChanged);
  }, [refreshClosed, onError]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let signature = "";
    const refreshTabs = async () => {
      const next = (await chrome.tabs.query({ currentWindow: true }))
        .filter((tab): tab is Tab => tab.id !== undefined)
        .sort((a, b) => a.index - b.index);
      const nextSignature = JSON.stringify(next);
      if (alive && nextSignature !== signature) { signature = nextSignature; setTabs(next); }
    };
    const refreshBookmarks = async () => {
      const next = await chrome.bookmarks.getTree();
      if (alive) setTree(next);
    };
    const scheduleTabs = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { refreshTabs().catch(onError); }, TAB_REFRESH_MS);
    };
    const scheduleBookmarks = () => { refreshBookmarks().catch(onError); };
    const events: [{ addListener: (cb: () => void) => void; removeListener: (cb: () => void) => void }, () => void][] = [
      [chrome.tabs.onCreated, scheduleTabs], [chrome.tabs.onUpdated, scheduleTabs],
      [chrome.tabs.onRemoved, scheduleTabs], [chrome.tabs.onMoved, scheduleTabs],
      [chrome.tabs.onActivated, scheduleTabs], [chrome.tabs.onAttached, scheduleTabs],
      [chrome.tabs.onDetached, scheduleTabs], [chrome.tabs.onReplaced, scheduleTabs],
      [chrome.bookmarks.onCreated, scheduleBookmarks], [chrome.bookmarks.onRemoved, scheduleBookmarks],
      [chrome.bookmarks.onChanged, scheduleBookmarks], [chrome.bookmarks.onMoved, scheduleBookmarks],
      [chrome.bookmarks.onChildrenReordered, scheduleBookmarks]
    ];
    events.forEach(([event, listener]) => event.addListener(listener));
    Promise.all([refreshTabs(), refreshBookmarks(), chrome.windows.getCurrent()])
      .then(([, , current]) => {
        if (!alive) return;
        if (current.id !== undefined) setWindowId(current.id);
        setLoaded(true);
      })
      .catch(onError);
    return () => {
      alive = false;
      clearTimeout(timer);
      events.forEach(([event, listener]) => event.removeListener(listener));
    };
  }, [onError]);

  return { tabs, tree, windowId, closed, refreshClosed, loaded };
}
