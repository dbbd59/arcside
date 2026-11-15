import type { Folder, SavedItem } from "./models";

export function folderSubtree(folders: Folder[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const folder of folders) {
      if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) { ids.add(folder.id); grew = true; }
    }
  }
  return ids;
}

export function folderStats(folders: Folder[], items: SavedItem[], isLive: (itemId: string) => boolean) {
  const parentOf = new Map(folders.map(folder => [folder.id, folder.parentId]));
  const counts = new Map<string, number>();
  const live = new Set<string>();
  for (const item of items) {
    const itemLive = isLive(item.id);
    let id = item.folderId;
    for (let depth = 0; id && depth <= folders.length; depth++) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
      if (itemLive) live.add(id);
      id = parentOf.get(id) ?? null;
    }
  }
  return { counts, live };
}

export function flattenFolders(folders: Folder[], spaceId: string): { folder: Folder; depth: number }[] {
  const walk = (parentId: string | null, depth: number): { folder: Folder; depth: number }[] =>
    folders.filter(folder => folder.spaceId === spaceId && folder.parentId === parentId)
      .flatMap(folder => [{ folder, depth }, ...walk(folder.id, depth + 1)]);
  return walk(null, 0);
}

export function folderPath(folders: Folder[], folderId: string | null): string {
  const names: string[] = [];
  for (let id = folderId, guard = 0; id && guard <= folders.length; guard++) {
    const folder = folders.find(item => item.id === id);
    if (!folder) break;
    names.unshift(folder.name);
    id = folder.parentId;
  }
  return names.join(" / ");
}

export function mergeRestored<T extends { id: string }>(before: T[], current: T[], restoredIds: Set<string>): T[] {
  const present = new Map(current.map(item => [item.id, item]));
  const known = new Set(before.map(item => item.id));
  return [
    ...before.filter(item => restoredIds.has(item.id) || present.has(item.id)).map(item => present.get(item.id) ?? item),
    ...current.filter(item => !known.has(item.id))
  ];
}

export function moveFolder(folders: Folder[], id: string, parentId: string | null, beforeId?: string): Folder[] {
  const moving = folders.find(folder => folder.id === id);
  if (!moving || beforeId === id || parentId === id || (parentId !== null && folderSubtree(folders, id).has(parentId))) return folders;
  const rest = folders.filter(folder => folder.id !== id);
  const moved = { ...moving, parentId };
  const index = beforeId ? rest.findIndex(folder => folder.id === beforeId) : -1;
  return index < 0 ? [...rest, moved] : [...rest.slice(0, index), moved, ...rest.slice(index)];
}
