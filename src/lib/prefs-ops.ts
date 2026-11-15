import type { ImportedNode } from "./bookmark-html";
import { folderSubtree } from "./folders";
import { DEFAULT_SPACE_ID, type FavoriteItem, type Folder, type Preferences, type SavedItem, type Space } from "./models";
import { sameUrl } from "./urls";

export function reorderBy<T>(list: T[], keyOf: (item: T) => string, sourceKey: string, targetKey: string): T[] {
  const from = list.findIndex(item => keyOf(item) === sourceKey);
  const to = list.findIndex(item => keyOf(item) === targetKey);
  if (from < 0 || to < 0 || from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function insertBefore<T extends { id: string }>(list: T[], item: T, beforeId?: string): T[] {
  const index = beforeId ? list.findIndex(entry => entry.id === beforeId) : -1;
  return index < 0 ? [...list, item] : [...list.slice(0, index), item, ...list.slice(index)];
}

export function placement(preferences: Preferences, folderId: string | null, beforeId: string | undefined, fallbackSpaceId: string) {
  const before = preferences.saved.find(item => item.id === beforeId);
  const folder = preferences.folders.find(item => item.id === (before ? before.folderId : folderId));
  return { folderId: folder?.id ?? null, spaceId: folder?.spaceId ?? before?.spaceId ?? fallbackSpaceId };
}

export function withFavorites(preferences: Preferences, spaceId: string, transform: (items: FavoriteItem[]) => FavoriteItem[]): Preferences {
  return { ...preferences, favorites: { ...preferences.favorites, [spaceId]: transform(preferences.favorites[spaceId] ?? []) } };
}

export function mergeFavorites(list: FavoriteItem[], incoming: { title: string; url: string; id?: string }[], newId: () => string = () => crypto.randomUUID()): FavoriteItem[] {
  const next = [...list];
  for (const { title, url, id } of incoming) {
    if (!next.some(item => item.id === id || sameUrl(item.url, url))) next.push({ id: id ?? newId(), title, url });
  }
  return next;
}

export function resolveLegacyFavorites(
  favorites: Record<string, FavoriteItem[]>, resolved: Map<string, { title: string; url: string }>
): Record<string, FavoriteItem[]> {
  return Object.fromEntries(Object.entries(favorites).map(([spaceId, items]) => [
    spaceId,
    items.flatMap((item): FavoriteItem[] => {
      if (item.url) return [item];
      const found = resolved.get(item.id);
      return found ? [{ id: item.id, ...found }] : [];
    })
  ]));
}

export function withoutSpace(preferences: Preferences, id: string): Preferences {
  const merged = mergeFavorites(preferences.favorites[DEFAULT_SPACE_ID] ?? [], preferences.favorites[id] ?? []);
  const { [id]: _removed, ...favorites } = preferences.favorites;
  return {
    ...preferences,
    spaces: preferences.spaces.filter(space => space.id !== id),
    folders: preferences.folders.map(folder => folder.spaceId === id ? { ...folder, spaceId: DEFAULT_SPACE_ID, parentId: null } : folder),
    saved: preferences.saved.map(item => item.spaceId === id ? { ...item, spaceId: DEFAULT_SPACE_ID } : item),
    favorites: { ...favorites, [DEFAULT_SPACE_ID]: merged }
  };
}

export function withoutFolder(preferences: Preferences, id: string): Preferences {
  const doomed = folderSubtree(preferences.folders, id);
  return {
    ...preferences,
    folders: preferences.folders.filter(folder => !doomed.has(folder.id)),
    saved: preferences.saved.filter(item => !item.folderId || !doomed.has(item.folderId))
  };
}

export function importInto(preferences: Preferences, nodes: ImportedNode[], spaceId: string): { folders: Folder[]; saved: SavedItem[]; favorites: FavoriteItem[] } {
  const folders = [...preferences.folders];
  const saved = [...preferences.saved];
  let favorites = preferences.favorites[spaceId] ?? [];
  const walk = (list: ImportedNode[], parentId: string | null) => list.forEach(node => {
    if ("url" in node) {
      if (!saved.some(item => item.url === node.url && item.folderId === parentId && item.spaceId === spaceId)) {
        saved.push({ id: crypto.randomUUID(), title: node.title, url: node.url, spaceId, folderId: parentId });
      }
      return;
    }
    if (node.favorites) {
      favorites = mergeFavorites(favorites, node.children.flatMap(child => "url" in child ? [child] : []));
      return;
    }
    const name = node.title.toLocaleLowerCase();
    let folder = folders.find(item => item.spaceId === spaceId && item.parentId === parentId && item.name.toLocaleLowerCase() === name);
    if (!folder) {
      folder = { id: crypto.randomUUID(), name: node.title, spaceId, parentId, open: false, color: null };
      folders.push(folder);
    }
    walk(node.children, folder.id);
  });
  walk(nodes, null);
  return { folders, saved, favorites };
}

export function mergeBackup(current: Preferences, incoming: Pick<Preferences, "spaces" | "folders" | "saved" | "favorites">): Preferences {
  const spaces = [...current.spaces];
  const spaceTarget = new Map<string, string>();
  for (const space of incoming.spaces) {
    const match = spaces.find(item => item.id === space.id) ?? spaces.find(item => item.name.toLocaleLowerCase() === space.name.toLocaleLowerCase());
    if (match) spaceTarget.set(space.id, match.id);
    else { spaces.push(space as Space); spaceTarget.set(space.id, space.id); }
  }

  const folders = [...current.folders];
  const folderTarget = new Map<string, string | null>();
  const pending = incoming.folders.filter(folder => spaceTarget.has(folder.spaceId));
  while (pending.length) {
    const ready = pending.findIndex(folder => folder.parentId === null || folderTarget.has(folder.parentId));
    const [folder] = pending.splice(ready < 0 ? 0 : ready, 1);
    const spaceId = spaceTarget.get(folder.spaceId)!;
    const parentId = folder.parentId === null ? null : folderTarget.get(folder.parentId) ?? null;
    const name = folder.name.toLocaleLowerCase();
    let target = folders.find(item => item.spaceId === spaceId && item.parentId === parentId && item.name.toLocaleLowerCase() === name);
    if (!target) {
      target = { ...folder, id: crypto.randomUUID(), spaceId, parentId };
      folders.push(target);
    }
    folderTarget.set(folder.id, target.id);
  }

  const saved = [...current.saved];
  for (const item of incoming.saved) {
    const spaceId = spaceTarget.get(item.spaceId);
    if (!spaceId) continue;
    const folderId = item.folderId === null ? null : folderTarget.get(item.folderId) ?? null;
    if (!saved.some(entry => entry.url === item.url && entry.spaceId === spaceId && entry.folderId === folderId)) {
      saved.push({ ...item, id: crypto.randomUUID(), spaceId, folderId });
    }
  }

  const favorites = { ...current.favorites };
  for (const [incomingId, items] of Object.entries(incoming.favorites)) {
    const spaceId = spaceTarget.get(incomingId);
    if (spaceId) favorites[spaceId] = mergeFavorites(favorites[spaceId] ?? [], items.map(({ title, url }) => ({ title, url })));
  }
  return { ...current, spaces, folders, saved, favorites };
}
