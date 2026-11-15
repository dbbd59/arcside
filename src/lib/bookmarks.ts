export type BookmarkNode = chrome.bookmarks.BookmarkTreeNode;

export interface BookmarkEntry {
  node: BookmarkNode;
  path: string;
}

export interface BookmarkLink {
  title: string;
  url: string;
}

export function flattenBookmarks(nodes: BookmarkNode[], path = ""): BookmarkEntry[] {
  return nodes.flatMap((node) => {
    if (node.url) return [{ node, path }];
    const childPath = node.title ? (path ? `${path} / ${node.title}` : node.title) : path;
    return flattenBookmarks(node.children ?? [], childPath);
  });
}

export function matchBookmarks(entries: BookmarkEntry[], query: string): BookmarkEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  return needle
    ? entries.filter(({ node, path }) => `${node.title} ${node.url} ${path}`.toLocaleLowerCase().includes(needle))
    : [];
}

export function bookmarkMap(nodes: BookmarkNode[]): Map<string, BookmarkNode> {
  const items = new Map<string, BookmarkNode>();
  const visit = (list: BookmarkNode[]) => list.forEach(node => {
    items.set(node.id, node);
    visit(node.children ?? []);
  });
  visit(nodes);
  return items;
}
