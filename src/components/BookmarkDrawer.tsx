import { useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Download, Folder, Heart, Search, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { flattenBookmarks, matchBookmarks, type BookmarkNode } from "@/lib/bookmarks";
import { readDrag } from "@/lib/drag";
import { Input } from "@/components/ui/input";
import { BookmarkRow } from "./BookmarkRow";
import { IconButton } from "./IconButton";
import { SheetShell } from "./SheetShell";

interface Props {
  tree: BookmarkNode[];
  isFavorite: (url?: string) => boolean;
  onClose: () => void;
  onOpen: (url: string) => void;
  onPreview: (url: string) => void;
  onAdd: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onImport: (file: File) => void;
  onExport: () => void;
}

export default function BookmarkDrawer({ tree, isFavorite, onClose, onOpen, onPreview, onAdd, onToggleFavorite, onImport, onExport }: Props) {
  const [query, setQuery] = useState("");
  const [dropActive, setDropActive] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(tree.flatMap(root => root.children?.map(node => node.id) ?? [])));
  const fileInput = useRef<HTMLInputElement>(null);
  const entries = useMemo(() => flattenBookmarks(tree), [tree]);
  const matches = useMemo(() => matchBookmarks(entries, query), [entries, query]);

  const toggleFolder = (id: string) => {
    setExpanded(old => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const row = (node: BookmarkNode, depth: number) => <BookmarkRow key={node.id} node={node}
    favorite={isFavorite(node.url)} indent={Math.max(0, depth - 1) * 12 + 8}
    onOpen={onOpen} onPreview={onPreview} onToggleFavorite={onToggleFavorite} />;

  const branch = (node: BookmarkNode, depth: number) => {
    if (node.url) return row(node, depth);
    if (!node.children?.length) return null;
    if (depth === 0) return <div key={node.id}>{node.children.map(child => branch(child, depth + 1))}</div>;
    const isOpen = expanded.has(node.id);
    return <div key={node.id}>
      <button className="flex min-h-9 w-full items-center gap-2 rounded-md text-left text-[12.5px] text-secondary-foreground hover:bg-accent"
        style={{ paddingLeft: (depth - 1) * 12 + 8 }} onClick={() => toggleFolder(node.id)} aria-expanded={isOpen}>
        {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <Folder size={14} className="text-muted-foreground" />
        <span className="flex-1 truncate">{node.title || "Favorites"}</span>
        <span className="mr-2 text-[11px] text-muted-foreground">{node.children.length}</span>
      </button>
      {isOpen && node.children.map(child => branch(child, depth + 1))}
    </div>;
  };

  return <SheetShell title="Bookmarks" eyebrow="LIBRARY" description="Browse, search and import your bookmarks" closeLabel="Close library" onClose={onClose}
    actions={<>
      <IconButton label="Import from HTML (folders included)" onClick={() => fileInput.current?.click()}><Upload size={16} /></IconButton>
      <IconButton label="Export saved links of this Space to HTML" onClick={onExport}><Download size={16} /></IconButton>
      <input ref={fileInput} type="file" accept=".html,.htm,text/html" hidden onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) onImport(file);
      }} />
    </>}>
      <div className="relative mx-3.5 mb-3">
        <Search size={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-10 pl-9" placeholder="Search bookmarks…" value={query}
          onChange={event => setQuery(event.target.value)} aria-label="Search bookmarks" />
      </div>
      <div className={cn(
        "mx-3.5 mb-3 flex min-h-10 items-center gap-2 rounded-lg border border-dashed border-input p-2.5 text-[11.5px] leading-snug text-muted-foreground transition-colors",
        dropActive && "border-primary bg-primary/15 text-white")}
        onDragOver={event => { event.preventDefault(); setDropActive(true); }}
        onDragLeave={() => setDropActive(false)}
        onDrop={event => {
          event.preventDefault(); setDropActive(false);
          const dragged = readDrag(event);
          if (dragged?.kind === "bookmark") onAdd(dragged.id);
        }}><Heart size={14} /> Drag a bookmark here to add it to Favorites</div>
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-5 [scrollbar-width:thin]">
        {query.trim()
          ? matches.length
            ? matches.map(({ node, path }) => <BookmarkRow key={node.id} node={node} path={path}
                favorite={isFavorite(node.url)} onOpen={onOpen} onPreview={onPreview} onToggleFavorite={onToggleFavorite} />)
            : <div className="px-5 py-3 text-xs text-muted-foreground">No bookmarks found.</div>
          : tree.map(node => branch(node, 0))}
      </div>
  </SheetShell>;
}
