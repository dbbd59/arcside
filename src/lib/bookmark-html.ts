import type { BookmarkLink } from "./bookmarks";
import { hostname, safeWebUrl } from "./urls";

interface BookmarkFolderNode {
  title: string;
  children: ImportedNode[];
  favorites?: boolean;
}

export type ImportedNode = BookmarkLink | BookmarkFolderNode;

const FAVORITES_ATTRIBUTE = /(?:arcside|dock)_favorites\s*=\s*"true"/i;

const HTML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'" };

function decodeHtml(text: string): string {
  return text.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, name: string) => HTML_ENTITIES[name]).trim();
}

export function parseBookmarksHtml(html: string): ImportedNode[] {
  const root: BookmarkFolderNode = { title: "", children: [] };
  const stack = [root];
  let pending: BookmarkFolderNode | null = null;
  for (const match of html.matchAll(/<(\/?)dl\b[^>]*>|<h3\b([^>]*)>([\s\S]*?)<\/h3>|<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const top = stack[stack.length - 1];
    if (match[3] !== undefined) {
      pending = { title: decodeHtml(match[3]), children: [], ...(FAVORITES_ATTRIBUTE.test(match[2]) && { favorites: true }) };
      top.children.push(pending);
    } else if (match[4] !== undefined) {
      const url = /href\s*=\s*"([^"]*)"/i.exec(match[4])?.[1];
      if (url && safeWebUrl(decodeHtml(url))) {
        top.children.push({ title: decodeHtml(match[5]) || hostname(url), url: decodeHtml(url) });
      }
    } else if (match[1]) {
      if (stack.length > 1) stack.pop();
    } else {
      stack.push(pending ?? top);
      pending = null;
    }
  }
  return tidyImport(root.children);
}

const BROWSER_ROOTS = new Set([
  "bookmarks", "bookmarks bar", "bookmarks toolbar", "other bookmarks", "mobile bookmarks",
  "barra dei preferiti", "altri preferiti", "preferiti"
]);

function tidyImport(nodes: ImportedNode[]): ImportedNode[] {
  const merged: ImportedNode[] = [];
  const folders = new Map<string, BookmarkFolderNode>();
  const urls = new Set<string>();
  const add = (node: ImportedNode) => {
    if ("url" in node) {
      if (!urls.has(node.url)) { urls.add(node.url); merged.push(node); }
      return;
    }
    const key = `${node.favorites ? "favorites" : "folder"}:${node.title.toLocaleLowerCase()}`;
    const existing = folders.get(key);
    if (existing) { existing.children.push(...node.children); return; }
    const folder: BookmarkFolderNode = { title: node.title, children: [...node.children], ...(node.favorites && { favorites: true }) };
    folders.set(key, folder);
    merged.push(folder);
  };
  nodes.forEach(node => {
    if (!("url" in node) && BROWSER_ROOTS.has(node.title.toLocaleLowerCase())) node.children.forEach(add);
    else add(node);
  });
  return merged
    .map(node => "url" in node ? node : { ...node, children: tidyImport(node.children) })
    .filter(node => "url" in node || node.children.length > 0);
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function exportBookmarksHtml(
  folders: { id: string; name: string; parentId: string | null }[],
  items: { title: string; url: string; folderId: string | null }[],
  favorites: { title: string; url: string }[] = []
): string {
  const link = (indent: string, entry: { title: string; url: string }) =>
    `${indent}<DT><A HREF="${escapeHtml(entry.url)}">${escapeHtml(entry.title || entry.url)}</A>`;
  const render = (parentId: string | null, indent: string): string[] => [
    ...folders.filter(folder => folder.parentId === parentId).flatMap(folder => [
      `${indent}<DT><H3>${escapeHtml(folder.name)}</H3>`,
      `${indent}<DL><p>`,
      ...render(folder.id, indent + "    "),
      `${indent}</DL><p>`
    ]),
    ...items.filter(item => item.folderId === parentId).map(item => link(indent, item))
  ];
  return [
    "<!DOCTYPE NETSCAPE-Bookmark-file-1>",
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    "<TITLE>Bookmarks</TITLE>", "<H1>Bookmarks</H1>", "<DL><p>",
    ...(favorites.length ? ['    <DT><H3 ARCSIDE_FAVORITES="true">Favorites</H3>', "    <DL><p>", ...favorites.map(entry => link("        ", entry)), "    </DL><p>"] : []),
    ...render(null, "    "),
    "</DL><p>"
  ].join("\n");
}

export function countImported(nodes: ImportedNode[]): { links: number; folders: number } {
  return nodes.reduce((total, node) => {
    if ("url" in node) return { ...total, links: total.links + 1 };
    const inner = countImported(node.children);
    return { links: total.links + inner.links, folders: total.folders + inner.folders + (node.favorites ? 0 : 1) };
  }, { links: 0, folders: 0 });
}
