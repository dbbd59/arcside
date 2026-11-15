import type { BookmarkNode } from "@/lib/bookmarks";
import type { Tab } from "@/lib/tabs";
import type { Preferences, SessionData, Space } from "@/lib/models";
import type { Toast } from "./useUndo";

export interface ArcsideContext {
  tabs: Tab[];
  windowId: number;
  preferences: Preferences;
  session: SessionData;
  activeSpace: Space;
  activeTab: Tab | undefined;
  liveTabs: Map<string, Tab>;
  bookmarkById: Map<string, BookmarkNode>;
  findTab: (tabId: number) => Tab | undefined;
  assignedSpace: (tabId: number) => string;
  boundSpace: (tabId: number) => string | undefined;
  spaceOfTab: (tabId: number) => string;
  assignTab: (tabId: number, spaceId: string) => Promise<void>;
  bindTab: (itemId: string, tabId: number) => Promise<void>;
  setActiveSpace: (spaceId: string) => Promise<void>;
  openTab: (spaceId: string, url?: string) => Promise<void>;
  remember: (label: string, revert: () => Promise<void>) => void;
  setToast: (toast: Toast | null) => void;
  refreshClosed: () => Promise<void>;
}
