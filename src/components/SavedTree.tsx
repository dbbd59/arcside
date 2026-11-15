import { useEffect, useState, type DragEvent, type ReactNode } from "react";
import { BookmarkMinus, ChevronRight, Folder as FolderIcon, FolderOpen, FolderPlus, FolderSymlink, MoreHorizontal, Palette, Pencil, SquareArrowOutUpRight, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tab } from "@/lib/tabs";
import { hostname } from "@/lib/urls";
import { NAV } from "@/lib/nav";
import { animated } from "@/lib/animate";
import { dragSource, isDraggingKind, readDrag } from "@/lib/drag";
import { folderStats } from "@/lib/folders";
import { FOLDER_COLORS } from "@/lib/palette";
import type { Folder, SavedItem } from "@/lib/models";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Favicon } from "./Favicon";
import { IconButton } from "./IconButton";
import { Count, RowActions } from "./rows";

interface Props {
  folders: Folder[];
  items: SavedItem[];
  liveTabs: Map<string, Tab>;
  onOpen: (item: SavedItem) => void;
  onPreview: (url: string) => void;
  onColor: (folderId: string, color: string | null) => void;
  onUnsave: (id: string) => void;
  onCloseTab: (tabId: number) => void;
  folderOptions: { folder: Folder; depth: number }[];
  onMove: (savedId: string, folderId: string | null, beforeId?: string) => void;
  onSaveTab: (tabId: number, folderId: string | null, beforeId?: string) => void;
  onMoveFolder: (folderId: string, parentId: string | null, beforeId?: string) => void;
  onOpenAll: (folderId: string) => void;
  onAdd: (parentId: string | null) => void;
  onRename: (folder: Folder) => void;
  onToggle: (folderId: string) => void;
  onDelete: (folder: Folder) => void;
}

const ROOT = "root";
const BEFORE_ZONE = 0.3;

export function SavedTree({ folders, items, liveTabs, onOpen, onPreview, onColor, onUnsave, onCloseTab, folderOptions, onMove, onSaveTab, onMoveFolder, onOpenAll, onAdd, onRename, onToggle, onDelete }: Props) {
  const [overId, setOverId] = useState<string | null>(null);
  const [folderZone, setFolderZone] = useState<"before" | "inside">("inside");
  const [rendered, setRendered] = useState(() => new Set(folders.filter(folder => folder.open).map(folder => folder.id)));
  const stats = folderStats(folders, items, id => liveTabs.has(id));

  useEffect(() => {
    const opened = folders.filter(folder => folder.open && !rendered.has(folder.id));
    if (opened.length) setRendered(old => new Set([...old, ...opened.map(folder => folder.id)]));
  }, [folders, rendered]);

  const dropTargetProps = (key: string, folderId: string | null, beforeId?: string) => ({
    onDragOver: (event: DragEvent) => { event.preventDefault(); event.stopPropagation(); setOverId(key); },
    onDragLeave: () => setOverId(null),
    onDrop: (event: DragEvent) => {
      event.preventDefault(); event.stopPropagation(); setOverId(null);
      const dragged = readDrag(event);
      if (dragged?.kind === "tab") onSaveTab(Number(dragged.id), folderId, beforeId);
      if (dragged?.kind === "saved") onMove(dragged.id, folderId, beforeId);
      if (dragged?.kind === "folder" && key === ROOT) onMoveFolder(dragged.id, null);
    }
  });

  const folderDropProps = (folder: Folder) => ({
    onDragOver: (event: DragEvent) => {
      event.preventDefault(); event.stopPropagation();
      setOverId(folder.id);
      const bounds = event.currentTarget.getBoundingClientRect();
      setFolderZone(isDraggingKind(event, "folder") && event.clientY - bounds.top < bounds.height * BEFORE_ZONE ? "before" : "inside");
    },
    onDragLeave: () => setOverId(null),
    onDrop: (event: DragEvent) => {
      event.preventDefault(); event.stopPropagation(); setOverId(null);
      const dragged = readDrag(event);
      if (dragged?.kind === "folder") {
        if (folderZone === "before") onMoveFolder(dragged.id, folder.parentId, folder.id); else onMoveFolder(dragged.id, folder.id);
      }
      if (dragged?.kind === "tab") onSaveTab(Number(dragged.id), folder.id);
      if (dragged?.kind === "saved") onMove(dragged.id, folder.id);
    }
  });

  const moveMenu = (currentFolderId: string | null, onPick: (folderId: string | null) => void) => <DropdownMenuSub>
    <DropdownMenuSubTrigger><FolderSymlink size={14} /> Move to</DropdownMenuSubTrigger>
    <DropdownMenuSubContent className="max-h-64 overflow-auto">
      <DropdownMenuItem disabled={currentFolderId === null} onSelect={() => onPick(null)}>No folder</DropdownMenuItem>
      {folderOptions.map(({ folder, depth }) => <DropdownMenuItem key={folder.id} disabled={folder.id === currentFolderId}
        style={{ paddingLeft: 8 + depth * 12 }} onSelect={() => onPick(folder.id)}>
        <FolderIcon size={14} /> <span className="truncate">{folder.name}</span></DropdownMenuItem>)}
    </DropdownMenuSubContent>
  </DropdownMenuSub>;

  const itemRow = (item: SavedItem) => {
    const live = liveTabs.get(item.id);
    const open = (event: { altKey: boolean }) => (event.altKey ? onPreview(item.url) : onOpen(item));
    return <div key={item.id} {...dragSource("saved", item.id)}
      {...dropTargetProps(`item:${item.id}`, item.folderId, item.id)}
      className={cn("group list-row",
        live?.active && "list-row-active",
        overId === `item:${item.id}` && "shadow-[0_-2px_0_0_var(--ink)]")}>
      <button className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-md text-left focus-ring" title={item.url} {...NAV} aria-current={live?.active || undefined} onClick={open}>
        <span key={live ? "live" : "closed"} className={cn("grid size-[18px] shrink-0 place-items-center", live && "animate-in zoom-in-50 duration-300")}>
          <Favicon url={item.url} custom={live?.favIconUrl} size={18} loading={live?.status === "loading"} /></span>
        <span className={cn("min-w-0 flex-1 truncate text-sm", live?.active ? "font-medium text-ink" : live ? "text-ink/85" : "text-ink/70")}>
          {live?.title?.trim() || item.title || hostname(item.url)}</span>
      </button>
      <RowActions>
        {live && <IconButton label="Close tab (stays saved)" size="icon-xs" onClick={() => onCloseTab(live.id)}><X size={14} /></IconButton>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <IconButton label="More actions" size="icon-xs"><MoreHorizontal size={14} /></IconButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {moveMenu(item.folderId, folderId => onMove(item.id, folderId))}
            <DropdownMenuItem onSelect={() => onPreview(item.url)}><SquareArrowOutUpRight size={14} /> Preview (⌥-click)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onUnsave(item.id)}><BookmarkMinus size={14} /> Remove from saved</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </RowActions>
    </div>;
  };

  const branch = (parentId: string | null, liveOnly: boolean): ReactNode[] => folders
    .filter(folder => folder.parentId === parentId && (!liveOnly || stats.live.has(folder.id)))
    .map(folder => {
      const peek = !folder.open && stats.live.has(folder.id);
      const count = stats.counts.get(folder.id) ?? 0;
      return <div key={folder.id}>
        <div className={cn("group flex h-9 items-center rounded-[10px] pr-1 pl-1 text-sm hover:bg-ink/12",
          overId === folder.id && folderZone === "inside" && "bg-ink/25 ring-1 ring-ink/50",
          overId === folder.id && folderZone === "before" && "shadow-[0_-2px_0_0_var(--ink)]")}
          {...dragSource("folder", folder.id)} {...folderDropProps(folder)}>
          <button className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-md text-left text-ink/90 focus-ring" aria-expanded={folder.open} {...NAV}
            onClick={() => onToggle(folder.id)}>
            <ChevronRight size={14} className={cn("text-ink/70 transition-transform duration-200", folder.open && "rotate-90")} />
            <span style={folder.color ? { color: folder.color } : undefined}>{folder.open ? <FolderOpen size={17} /> : <FolderIcon size={17} />}</span>
            <span className="min-w-0 flex-1 truncate font-medium">{folder.name}</span>
            <Count value={count} className="text-xs text-ink/70 group-focus-within:hidden group-hover:hidden" />
          </button>
          <RowActions>
            <IconButton label="Open all tabs" size="icon-xs" onClick={() => onOpenAll(folder.id)}><SquareArrowOutUpRight size={13} /></IconButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <IconButton label="Folder actions" size="icon-xs"><MoreHorizontal size={14} /></IconButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onAdd(folder.id)}><FolderPlus size={14} /> New subfolder</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onRename(folder)}><Pencil size={14} /> Rename</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger><Palette size={14} /> Color</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <div className="grid grid-cols-4 gap-1.5 p-1.5">
                      {FOLDER_COLORS.map(color => <DropdownMenuItem key={color} aria-label={`Color ${color}`} onSelect={() => onColor(folder.id, color)}
                        className="size-7 justify-center rounded-full p-0" style={{ background: color }} />)}
                    </div>
                    <DropdownMenuItem disabled={!folder.color} onSelect={() => onColor(folder.id, null)}>No color</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(folder)}><Trash2 size={14} /> Delete folder</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </RowActions>
        </div>
        <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-spring",
          folder.open || peek ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
          <div className="overflow-hidden" inert={!(folder.open || peek)}>
            {(rendered.has(folder.id) || folder.open || peek) && <div ref={animated} className="ml-3.5 flex flex-col gap-0.5 border-l border-ink/15 pl-1.5">
              {branch(folder.id, liveOnly || !folder.open)}
              <div ref={animated} className="flex flex-col gap-0.5">
                {items.filter(item => item.folderId === folder.id && (!(liveOnly || !folder.open) || liveTabs.has(item.id))).map(itemRow)}
              </div>
            </div>}
          </div>
        </div>
      </div>;
    });

  return <div ref={animated} className={cn("flex min-h-8 flex-col gap-0.5 rounded-[10px]", overId === ROOT && "bg-ink/10 ring-1 ring-ink/40")}
    {...dropTargetProps(ROOT, null)}>
    {branch(null, false)}
    <div ref={animated} className="flex flex-col gap-0.5">
      {items.filter(item => !item.folderId).map(itemRow)}
    </div>
  </div>;
}
