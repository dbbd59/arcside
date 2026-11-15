import { hostname } from "./urls";

export type Tab = chrome.tabs.Tab & { id: number };

const BLANK_URLS = ["chrome://newtab/", "about:blank"];

export function isBlankTab(tab: Pick<chrome.tabs.Tab, "url" | "pendingUrl" | "pinned">, extensionNewTabUrl: string): boolean {
  const url = tab.url || tab.pendingUrl || "";
  return !tab.pinned && (!url || BLANK_URLS.includes(url) || url.startsWith(extensionNewTabUrl));
}

export function tabTitle(tab: chrome.tabs.Tab): string {
  return tab.title?.trim() || hostname(tab.url);
}
