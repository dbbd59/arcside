import type { Tab } from "./tabs";
import { folderPath } from "./folders";
import type { Folder, SavedItem } from "./models";
import { safeWebUrl, sameUrl } from "./urls";

export const searchNeedle = (query: string) => query.trim().toLocaleLowerCase();

export const matches = (needle: string, text: string) => !needle || text.toLocaleLowerCase().includes(needle);

export function todayTabs(tabs: Tab[], liveTabs: Map<string, Tab>, assignedSpace: (tabId: number) => string, spaceId: string): Tab[] {
  const bound = new Set([...liveTabs.values()].map(tab => tab.id));
  return tabs.filter(tab => !bound.has(tab.id) && assignedSpace(tab.id) === spaceId);
}

export function duplicateTabIds(tabs: Tab[]): number[] {
  const kept: Tab[] = [];
  const ids: number[] = [];
  for (const tab of tabs) {
    const original = safeWebUrl(tab.url) ? kept.find(other => sameUrl(other.url, tab.url)) : undefined;
    if (original) ids.push(tab.active ? original.id : tab.id); else kept.push(tab);
  }
  return ids;
}

export function searchTabs(tabs: Tab[], needle: string): Tab[] {
  return needle ? tabs.filter(tab => matches(needle, `${tab.title} ${tab.url}`)) : [];
}

export function searchSaved(saved: SavedItem[], folders: Folder[], needle: string): SavedItem[] {
  return needle
    ? saved.filter(item => matches(needle, `${item.title} ${item.url} ${folderPath(folders, item.folderId)}`))
    : [];
}
