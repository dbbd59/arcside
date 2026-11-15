import { buildBackup, manualBackupFilename, summarize, type BackupScope, type ImportMode, type ParsedBackup } from "@/lib/backup";
import { countImported, exportBookmarksHtml, parseBookmarksHtml } from "@/lib/bookmark-html";
import { downloadFile } from "@/lib/browser";
import { folderSubtree, mergeRestored, moveFolder } from "@/lib/folders";
import { insertBefore, importInto, mergeBackup, mergeFavorites, placement, reorderBy, withFavorites, withoutFolder } from "@/lib/prefs-ops";
import { pickSettings, preferencesStore, sessionStore, sessionWithoutSpace, validPreferences, windowKey, type Folder, type SavedItem } from "@/lib/models";
import { safeWebUrl, sameUrl } from "@/lib/urls";
import { tabTitle } from "@/lib/tabs";
import type { ArcsideContext } from "./arcside-context";

export function libraryActions(ctx: ArcsideContext) {
  const { windowId, preferences, activeSpace, activeTab, liveTabs, bookmarkById, findTab, bindTab, openTab, remember, setToast } = ctx;

  const favoritesHere = preferences.favorites[activeSpace.id] ?? [];
  const favoriteWith = (url: string) => favoritesHere.find(item => sameUrl(item.url, url));

  const addFavorite = (title: string, url: string, id: string = crypto.randomUUID()) =>
    preferencesStore.update(current => withFavorites(current, activeSpace.id, list => mergeFavorites(list, [{ id, title, url }])));

  const removeFavorite = async (id: string) => {
    const spaceId = activeSpace.id;
    const removed = (preferences.favorites[spaceId] ?? []).find(item => item.id === id);
    const index = (preferences.favorites[spaceId] ?? []).findIndex(item => item.id === id);
    if (!removed) return;
    await preferencesStore.update(current => withFavorites(current, spaceId, list => list.filter(item => item.id !== id)));
    remember("Favorite removed", () => preferencesStore.update(current => withFavorites(current, spaceId, list => {
      if (list.some(item => item.id === id)) return list;
      const next = [...list];
      next.splice(Math.min(index, next.length), 0, removed);
      return next;
    })));
  };

  const favoriteTab = async (tabId: number) => {
    const tab = findTab(tabId);
    if (!tab || !safeWebUrl(tab.url)) throw new Error("This page can't be added to Favorites.");
    const existing = favoriteWith(tab.url!);
    const id = existing?.id ?? crypto.randomUUID();
    if (!existing) await addFavorite(tabTitle(tab), tab.url!, id);
    await bindTab(id, tabId);
  };

  const addFavoriteBookmark = async (bookmarkId: string) => {
    const node = bookmarkById.get(bookmarkId);
    if (node?.url && safeWebUrl(node.url) && !favoriteWith(node.url)) await addFavorite(node.title, node.url);
  };

  return {
    removeFavorite,
    addFavoriteBookmark,
    toggleBookmarkFavorite: async (bookmarkId: string) => {
      const node = bookmarkById.get(bookmarkId);
      const existing = node?.url ? favoriteWith(node.url) : undefined;
      if (existing) await removeFavorite(existing.id); else await addFavoriteBookmark(bookmarkId);
    },
    favoriteTab,
    favoriteActiveTab: async () => { if (activeTab) await favoriteTab(activeTab.id); },
    reorderFavorite: (sourceId: string, targetId: string) =>
      preferencesStore.update(current => withFavorites(current, activeSpace.id, list => reorderBy(list, item => item.id, sourceId, targetId))),

    async saveTab(tabId: number, folderId: string | null = null, beforeId?: string) {
      const tab = findTab(tabId);
      if (!tab || !safeWebUrl(tab.url)) throw new Error("This page can't be saved.");
      const item: SavedItem = { id: crypto.randomUUID(), title: tabTitle(tab), url: tab.url!, ...placement(preferences, folderId, beforeId, activeSpace.id) };
      await preferencesStore.update(current => ({ ...current, saved: insertBefore(current.saved, item, beforeId) }));
      await bindTab(item.id, tabId);
    },

    moveSaved(id: string, folderId: string | null, beforeId?: string) {
      if (id === beforeId) return Promise.resolve();
      const where = placement(preferences, folderId, beforeId, activeSpace.id);
      return preferencesStore.update(current => {
        const moving = current.saved.find(item => item.id === id);
        if (!moving) return current;
        const rest = current.saved.filter(item => item.id !== id);
        return { ...current, saved: insertBefore(rest, { ...moving, ...where }, beforeId) };
      });
    },

    async unsave(id: string) {
      const before = preferences.saved;
      if (!before.some(item => item.id === id)) return;
      await preferencesStore.update(current => ({ ...current, saved: current.saved.filter(item => item.id !== id) }));
      remember("Saved link removed", () => preferencesStore.update(current => ({
        ...current,
        saved: mergeRestored(before, current.saved, new Set([id])).map(item =>
          item.id === id && item.folderId && !current.folders.some(folder => folder.id === item.folderId) ? { ...item, folderId: null } : item)
      })));
    },

    async openFolder(folderId: string) {
      const subtree = folderSubtree(preferences.folders, folderId);
      const pending = preferences.saved.filter(item => item.folderId && subtree.has(item.folderId) && !liveTabs.has(item.id));
      if (!pending.length) return;
      const additions: Record<string, number> = {};
      let first: number | undefined;
      for (const item of pending) {
        const created = await chrome.tabs.create({ url: item.url, active: false, windowId });
        additions[windowKey(windowId, item.id)] = created.id!;
        first ??= created.id;
      }
      await sessionStore.update(current => ({ ...current, boundTabs: { ...current.boundTabs, ...additions } }));
      if (first !== undefined) await chrome.tabs.update(first, { active: true });
    },

    addFolder: (name: string, parentId: string | null) =>
      preferencesStore.update(current => ({
        ...current,
        folders: [
          ...current.folders.map(folder => folder.id === parentId ? { ...folder, open: true } : folder),
          { id: crypto.randomUUID(), name, spaceId: activeSpace.id, parentId, open: false, color: null }
        ]
      })),

    async moveFolder(id: string, parentId: string | null, beforeId?: string) {
      const before = preferences.folders;
      const moved = moveFolder(before, id, parentId, beforeId);
      if (moved === before) return;
      await preferencesStore.update(current => ({
        ...current,
        folders: moveFolder(current.folders, id, parentId, beforeId).map(folder => folder.id === parentId ? { ...folder, open: true } : folder)
      }));
      remember("Folder moved", () => preferencesStore.update(current => ({ ...current, folders: before })));
    },

    toggleFolder: (id: string) => patchFolder(id, folder => ({ open: !folder.open })),
    renameFolder: (id: string, name: string) => patchFolder(id, () => ({ name })),
    setFolderColor: (id: string, color: string | null) => patchFolder(id, () => ({ color })),

    async removeFolder(id: string) {
      const foldersBefore = preferences.folders;
      const savedBefore = preferences.saved;
      const doomedFolders = folderSubtree(foldersBefore, id);
      const doomedItems = new Set(savedBefore.filter(item => item.folderId && doomedFolders.has(item.folderId)).map(item => item.id));
      await preferencesStore.update(current => withoutFolder(current, id));
      remember("Folder deleted", () => preferencesStore.update(current => ({
        ...current,
        folders: mergeRestored(foldersBefore, current.folders, doomedFolders),
        saved: mergeRestored(savedBefore, current.saved, doomedItems)
      })));
    },

    async importBookmarks(file: File) {
      const nodes = parseBookmarksHtml(await file.text());
      if (!countImported(nodes).links) throw new Error("No links found in the HTML file.");
      const { folders, saved, favorites } = importInto(preferences, nodes, activeSpace.id);
      await preferencesStore.update(current => ({ ...current, folders, saved, favorites: { ...current.favorites, [activeSpace.id]: favorites } }));
      const added = saved.length - preferences.saved.length + favorites.length - favoritesHere.length;
      setToast({ text: `Imported ${added} links into ${activeSpace.name}` });
    },

    exportSpace() {
      const folders = preferences.folders.filter(folder => folder.spaceId === activeSpace.id);
      const items = preferences.saved.filter(item => item.spaceId === activeSpace.id);
      const favorites = favoritesHere.filter(item => item.url);
      downloadFile(`arcside-${activeSpace.name.toLowerCase().replace(/\W+/g, "-")}.html`, "text/html", exportBookmarksHtml(folders, items, favorites));
      setToast({ text: `Exported ${items.length + favorites.length} links` });
    },

    exportBackup(scope: BackupScope = "all") {
      const now = new Date();
      const file = buildBackup(preferences, { spaceId: scope === "space" ? activeSpace.id : undefined, now: now.getTime() });
      downloadFile(manualBackupFilename(now, scope === "space" ? activeSpace.name : undefined), "application/json", JSON.stringify(file, null, 2));
      const { links, favorites } = summarize(file);
      setToast({ text: `Backup exported (${links + favorites} links)` });
    },

    async importBackup(backup: ParsedBackup, mode: ImportMode) {
      const before = preferences;
      const { spaces, folders, saved, favorites } = backup.preferences;
      const settings = mode === "replace" && backup.hasSettings ? pickSettings(backup.preferences) : {};
      await preferencesStore.update(current => mode === "merge"
        ? mergeBackup(current, backup.preferences)
        : validPreferences({ ...current, spaces, folders, saved, favorites, ...settings }));
      if (mode === "replace") {
        for (const space of before.spaces) {
          if (!spaces.some(item => item.id === space.id)) await sessionStore.update(current => sessionWithoutSpace(current, space.id));
        }
      }
      const undoSettings = Object.fromEntries(Object.keys(settings).map(key => [key, before[key as keyof typeof before]]));
      remember(mode === "merge" ? "Backup merged" : "Backup restored", () => preferencesStore.update(current => ({
        ...current, spaces: before.spaces, folders: before.folders, saved: before.saved, favorites: before.favorites, ...undoSettings
      })));
    },

    async restoreArchived(id: string) {
      const entry = preferences.archived.find(item => item.id === id);
      if (!entry) return;
      await openTab(preferences.spaces.some(space => space.id === entry.spaceId) ? entry.spaceId : activeSpace.id, entry.url);
      await preferencesStore.update(current => ({ ...current, archived: current.archived.filter(item => item.id !== id) }));
    },
    removeArchived: (id: string) => preferencesStore.update(current => ({ ...current, archived: current.archived.filter(item => item.id !== id) })),
    clearArchive: () => preferencesStore.update(current => ({ ...current, archived: [] }))
  };

  function patchFolder(id: string, patch: (folder: Folder) => Partial<Folder>) {
    return preferencesStore.update(current => ({
      ...current, folders: current.folders.map(folder => folder.id === id ? { ...folder, ...patch(folder) } : folder)
    }));
  }
}
