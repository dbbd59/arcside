import { NAV } from "@/lib/nav";
import type { ReactNode } from "react";
import { folderPath } from "@/lib/folders";
import type { BookmarkEntry } from "@/lib/bookmarks";
import type { Tab } from "@/lib/tabs";
import type { Folder, SavedItem, Space } from "@/lib/models";
import { hostname } from "@/lib/urls";
import { BookmarkRow } from "./BookmarkRow";
import { Count } from "./rows";
import { Favicon } from "./Favicon";

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode }) {
  return <>
    <div className="mt-3 mb-1 flex h-6 items-center justify-between px-2 text-xs text-ink/70"><span>{title}</span><Count value={count} /></div>
    {count > 0 ? <div className="flex flex-col gap-0.5">{children}</div> : <div className="px-2 pb-4 text-xs text-ink/70">{empty}</div>}
  </>;
}

interface Props {
  tabs: Tab[];
  saved: SavedItem[];
  bookmarks: BookmarkEntry[];
  folders: Folder[];
  spaces: Space[];
  isFavorite: (url?: string) => boolean;
  renderTab: (tab: Tab) => ReactNode;
  onOpenSaved: (item: SavedItem) => void;
  onOpenUrl: (url: string) => void;
  onPreview: (url: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function SearchResults({ tabs, saved, bookmarks, folders, spaces, isFavorite, renderTab, onOpenSaved, onOpenUrl, onPreview, onToggleFavorite }: Props) {
  return <div>
    <Section title="Tabs" count={tabs.length} empty="No tabs found">{tabs.map(renderTab)}</Section>
    <Section title="Saved" count={saved.length} empty="No saved links found">
      {saved.map(item => <button key={item.id} {...NAV} title={item.url}
        className="focus-ring flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-left hover:bg-ink/12" onClick={() => onOpenSaved(item)}>
        <Favicon url={item.url} size={16} />
        <span className="flex min-w-0 flex-1 flex-col">
          <strong className="truncate text-[12.5px] font-medium">{item.title || hostname(item.url)}</strong>
          <small className="truncate text-[11px] text-ink/70">
            {spaces.find(space => space.id === item.spaceId)?.emoji} {folderPath(folders, item.folderId) || hostname(item.url)}</small>
        </span>
      </button>)}
    </Section>
    <Section title="Bookmark" count={bookmarks.length} empty="No bookmarks found">
      {bookmarks.map(({ node, path }) => <BookmarkRow key={node.id} node={node} path={path}
        favorite={isFavorite(node.url)} onOpen={onOpenUrl} onPreview={onPreview} onToggleFavorite={onToggleFavorite} />)}
    </Section>
  </div>;
}
