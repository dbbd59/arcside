import { openPopup, RECENTLY_CLOSED_LIMIT } from "@/lib/browser";
import { LINK_COPIED } from "@/lib/messages";
import { safeWebUrl, sameUrl } from "@/lib/urls";
import type { ArcsideContext } from "./arcside-context";

export function tabActions(ctx: ArcsideContext) {
  const { tabs, windowId, activeSpace, activeTab, liveTabs, findTab, setToast, refreshClosed, assignedSpace, spaceOfTab, assignTab, bindTab, setActiveSpace, openTab, remember } = ctx;

  const reopenTab = async (url: string, space: string) => {
    const recent = await chrome.sessions.getRecentlyClosed({ maxResults: RECENTLY_CLOSED_LIMIT });
    const entry = recent.find(item => item.tab?.sessionId && item.tab.url === url);
    const id = entry
      ? (await chrome.sessions.restore(entry.tab!.sessionId!)).tab?.id
      : (await chrome.tabs.create({ url, windowId })).id;
    if (id !== undefined) await assignTab(id, space);
  };

  const closeTabs = async (ids: number[], label: string) => {
    const closing = ids.map(id => ({ tab: findTab(id), space: assignedSpace(id) })).filter(entry => entry.tab);
    if (!closing.length) return;
    if (closing.length === tabs.length) await openTab(activeSpace.id);
    await chrome.tabs.remove(closing.map(entry => entry.tab!.id));
    const restorable = closing.filter(entry => safeWebUrl(entry.tab!.url));
    if (restorable.length) remember(label, async () => { for (const { tab, space } of restorable) await reopenTab(tab!.url!, space); });
  };

  const onActiveTab = (action: (tabId: number) => Promise<unknown>) => async () => {
    if (activeTab) await action(activeTab.id);
  };

  return {
    newTab: () => openTab(activeSpace.id),
    closeTabs,
    closeTab: (tabId: number) => closeTabs([tabId], "Tab closed"),
    goBack: onActiveTab(id => chrome.tabs.goBack(id)),
    goForward: onActiveTab(id => chrome.tabs.goForward(id)),
    reload: onActiveTab(id => chrome.tabs.reload(id)),
    openGlance: async (url: string) => { if (safeWebUrl(url)) await openPopup(url, windowId); },

    async activateTab(tabId: number) {
      if (spaceOfTab(tabId) !== activeSpace.id) await setActiveSpace(spaceOfTab(tabId));
      await chrome.tabs.update(tabId, { active: true });
    },

    async toggleMute(tabId: number) {
      const tab = findTab(tabId);
      if (tab) await chrome.tabs.update(tabId, { muted: !tab.mutedInfo?.muted });
    },

    async reorderTab(sourceId: number, targetId: number) {
      const source = findTab(sourceId);
      const target = findTab(targetId);
      if (!source || !target || source === target) return;
      if (source.groupId !== target.groupId) throw new Error("Can't reorder tabs that belong to different Chrome groups.");
      await chrome.tabs.move(sourceId, { index: target.index });
      await assignTab(sourceId, assignedSpace(targetId));
    },

    async openUrl(url: string) {
      if (!safeWebUrl(url)) return;
      const existing = tabs.find(tab => tab.url === url && assignedSpace(tab.id) === activeSpace.id);
      if (existing) await chrome.tabs.update(existing.id, { active: true });
      else await openTab(activeSpace.id, url);
    },

    async openBound(itemId: string, url: string) {
      if (!safeWebUrl(url)) return;
      const live = liveTabs.get(itemId);
      if (live) { await chrome.tabs.update(live.id, { active: true }); return; }
      const boundIds = new Set([...liveTabs.values()].map(tab => tab.id));
      const adopted = tabs.find(tab => sameUrl(tab.url, url) && !boundIds.has(tab.id));
      const target = adopted ?? await chrome.tabs.create({ url, active: true, windowId });
      await bindTab(itemId, target.id!);
      if (adopted) await chrome.tabs.update(adopted.id, { active: true });
    },

    async copyUrl() {
      if (!activeTab?.url) return;
      await navigator.clipboard.writeText(activeTab.url);
      setToast({ text: LINK_COPIED });
    },

    async restoreClosed(sessionId: string) {
      const restored = await chrome.sessions.restore(sessionId);
      if (restored.tab?.id !== undefined) await assignTab(restored.tab.id, activeSpace.id);
      await refreshClosed();
    }
  };
}
