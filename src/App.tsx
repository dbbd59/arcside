import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive, ArrowLeft, ArrowRight, BookOpen, Command, Download, Eraser, FolderPlus,
  Link, Plus, RotateCw, Search, SlidersHorizontal, Sparkles, Undo2, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useArcside } from "@/hooks/useArcside";
import { usePageColors } from "@/hooks/usePageColor";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useSpaceNavigation } from "@/hooks/useSpaceNavigation";
import { blendColors, resolveAmbient } from "@/lib/ambient";
import { parseBackup, type ParsedBackup } from "@/lib/backup";
import { animated, EASE_OVERSHOOT, EASE_SPRING } from "@/lib/animate";
import { focusFirstRow, focusNextRow, NAV } from "@/lib/nav";
import { flattenBookmarks, matchBookmarks } from "@/lib/bookmarks";
import type { Tab } from "@/lib/tabs";
import { flattenFolders, folderSubtree } from "@/lib/folders";
import { readDrag, type Dragged } from "@/lib/drag";
import { sameUrl } from "@/lib/urls";
import { DEFAULT_SPACE_ID, type Folder, type Space } from "@/lib/models";
import { duplicateTabIds, searchNeedle, searchSaved, searchTabs, todayTabs } from "@/lib/selectors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import ArchiveSheet from "@/components/ArchiveSheet";
import BookmarkDrawer from "@/components/BookmarkDrawer";
import CommandPalette from "@/components/CommandPalette";
import { Count } from "@/components/rows";
import { FetchMissingFavicons } from "@/components/Favicon";
import { FavoritesGrid } from "@/components/FavoritesGrid";
import { IconButton } from "@/components/IconButton";
import NameDialog from "@/components/NameDialog";
import { SavedTree } from "@/components/SavedTree";
import { SearchResults } from "@/components/SearchResults";
import SettingsSheet from "@/components/SettingsSheet";
import SpaceDialog from "@/components/SpaceDialog";
import { SpaceBar } from "@/components/SpaceBar";
import { TabRow } from "@/components/TabRow";
import { trackPanel } from "@/lib/panel";
import { useConfirm } from "@/components/ConfirmDialog";
import ImportBackupDialog from "@/components/ImportBackupDialog";
import { PageShell } from "@/components/PageShell";
import { mount } from "./bootstrap";
import { ToastBar } from "@/components/ToastBar";

const SEARCH_LIMIT = 70;
const OPEN_ALL_CONFIRM_ABOVE = 15;

function ExtensionApp() {
  const arcside = useArcside();
  const { run, activeSpace, favorites } = arcside;
  const { spaces, ambient: ambientSetting, ambientMode, ambientSpaceColor, ambientIntensity, swipeThreshold, font, fetchFavicons, folders, saved, archived } = arcside.preferences;

  const [query, setQuery] = useState("");
  const [spaceDialog, setSpaceDialog] = useState<"new" | Space | null>(null);
  const [folderDialog, setFolderDialog] = useState<{ parentId: string | null } | { folder: Folder } | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<ParsedBackup | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const nav = useSpaceNavigation({ spaces, activeId: activeSpace.id, threshold: swipeThreshold, select: id => run(arcside.selectSpace(id)) });
  useShortcuts({
    undo: () => run(arcside.undo()),
    openPalette: () => setPaletteOpen(true),
    focusSearch: () => searchRef.current?.focus(),
    blurSearch: () => { if (document.activeElement === searchRef.current) { setQuery(""); searchRef.current?.blur(); } },
    stepSpace: nav.step
  });

  const { on: ambient, mode } = resolveAmbient(activeSpace, ambientSetting, ambientMode);
  const pageColors = usePageColors(arcside.windowId, ambient ? arcside.activeTab : undefined, ambientSpaceColor ? activeSpace.color : "", mode);
  const ink = pageColors?.ink ?? "light";
  const { neighbor, progress, shift, active: swiping } = nav.swipe;
  const accent = blendColors(activeSpace.color, neighbor?.color ?? activeSpace.color, neighbor ? progress : 0);
  const accent2 = blendColors(activeSpace.color2 ?? activeSpace.color, neighbor ? neighbor.color2 ?? neighbor.color : activeSpace.color, neighbor ? progress : 0);

  const today = todayTabs(arcside.tabs, arcside.liveTabs, arcside.assignedSpace, activeSpace.id);
  const duplicateIds = duplicateTabIds(today);
  const clearableIds = today.filter(tab => !tab.active).map(tab => tab.id);
  const spaceFolders = folders.filter(folder => folder.spaceId === activeSpace.id);
  const spaceSaved = saved.filter(item => item.spaceId === activeSpace.id);
  const closedHistory = arcside.closed.filter(entry => !archived.some(item => item.url === entry.url));

  const allBookmarks = useMemo(() => flattenBookmarks(arcside.tree), [arcside.tree]);
  const needle = searchNeedle(query);
  const foundTabs = searchTabs(arcside.tabs, needle);
  const foundSaved = searchSaved(saved, folders, needle);
  const foundBookmarks = useMemo(() => matchBookmarks(allBookmarks, query).slice(0, SEARCH_LIMIT), [allBookmarks, query]);

  const isFavorite = (url?: string) => favorites.some(item => sameUrl(item.url, url));
  const toggleFavorite = (bookmarkId: string) => run(arcside.toggleBookmarkFavorite(bookmarkId));
  const closeTabsLabeled = (ids: number[], what: string) => run(arcside.closeTabs(ids, `${ids.length} ${what}`));

  const openFirstResult = () => {
    if (foundTabs[0]) run(arcside.activateTab(foundTabs[0].id));
    else if (foundSaved[0]) run(arcside.openBound(foundSaved[0].id, foundSaved[0].url));
    else if (foundBookmarks[0]) run(arcside.openUrl(foundBookmarks[0].node.url!));
    else return;
    setQuery("");
  };

  const acceptFavorite = (dragged: Dragged | null, beforeId?: string) => {
    if (dragged?.kind === "tab") run(arcside.favoriteTab(Number(dragged.id)));
    if (dragged?.kind === "bookmark") run(arcside.addFavoriteBookmark(dragged.id));
    if (dragged?.kind === "favorite" && beforeId) run(arcside.reorderFavorite(dragged.id, beforeId));
  };

  const renderTab = (tab: Tab) => <TabRow key={tab.id} tab={tab}
    onActivate={id => run(arcside.activateTab(id))}
    onClose={id => run(arcside.closeTab(id))}
    onSave={id => run(arcside.saveTab(id))}
    onFavorite={id => run(arcside.favoriteTab(id))}
    onToggleMute={id => run(arcside.toggleMute(id))}
    onDropTab={(sourceId, targetId) => run(arcside.reorderTab(sourceId, targetId))} />;

  const confirm = useConfirm();
  useEffect(() => trackPanel(arcside.windowId), [arcside.windowId]);

  const openAll = async (folderId: string) => {
    const subtree = folderSubtree(folders, folderId);
    const count = saved.filter(item => item.folderId && subtree.has(item.folderId)).length;
    if (count <= OPEN_ALL_CONFIRM_ABOVE || await confirm({ title: `Open ${count} tabs?`, confirmLabel: "Open all" })) run(arcside.openFolder(folderId));
  };

  const paletteActions = [
    { id: "new-tab", label: "New tab", icon: <Plus size={14} />, run: () => run(arcside.newTab()) },
    { id: "new-folder", label: "New folder", icon: <FolderPlus size={14} />, run: () => setFolderDialog({ parentId: null }) },
    { id: "copy-link", label: "Copy link of current tab", icon: <Link size={14} />, run: () => run(arcside.copyUrl()) },
    { id: "undo", label: "Undo last action", icon: <Undo2 size={14} />, run: () => run(arcside.undo()) },
    { id: "clear", label: "Clear unsaved tabs", icon: <Eraser size={14} />, run: () => closeTabsLabeled(clearableIds, "tabs cleared") },
    { id: "duplicates", label: "Close duplicate tabs", icon: <Eraser size={14} />, run: () => closeTabsLabeled(duplicateIds, "duplicate tabs closed") },
    { id: "ambient", label: ambientSetting ? "Turn ambient color off" : "Turn ambient color on", icon: <Sparkles size={14} />, run: () => run(arcside.setSettings({ ambient: !ambientSetting })) },
    { id: "library", label: "Open bookmark library", icon: <BookOpen size={14} />, run: () => setLibraryOpen(true) },
    { id: "history", label: "Open history", icon: <Archive size={14} />, run: () => setArchiveOpen(true) },
    { id: "settings", label: "Open settings", icon: <SlidersHorizontal size={14} />, run: () => setSettingsOpen(true) },
    { id: "backup", label: "Export backup (JSON)", icon: <Download size={14} />, run: () => arcside.exportBackup("all") }
  ];

  return <FetchMissingFavicons.Provider value={fetchFavicons}><PageShell accent={accent} accent2={accent2} ink={ink} colors={ambient ? pageColors?.colors ?? null : null} intensity={ambientIntensity} mode={mode} spaceColor={!(ambient && pageColors) || ambientSpaceColor} font={font}
    className={cn("flex h-full flex-col", swiping && "swiping")} onWheel={nav.onWheel}>
    <header className="flex h-11 min-h-11 items-center justify-between px-1.5">
      <div className="flex items-center">
        <IconButton label="Back" onClick={() => run(arcside.goBack())}><ArrowLeft size={16} /></IconButton>
        <IconButton label="Forward" onClick={() => run(arcside.goForward())}><ArrowRight size={16} /></IconButton>
        <IconButton label="Reload" onClick={() => run(arcside.reload())}><RotateCw size={15} /></IconButton>
      </div>
      <div className="flex items-center">
        <IconButton label="Copy link (⌘⇧C)" onClick={() => run(arcside.copyUrl())}><Link size={16} /></IconButton>
        <IconButton label={`History (${closedHistory.length + archived.length})`} onClick={() => setArchiveOpen(true)}><Archive size={16} /></IconButton>
        <IconButton label="Bookmark library" onClick={() => setLibraryOpen(true)}><BookOpen size={16} /></IconButton>
        <IconButton label="Settings" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={16} /></IconButton>
      </div>
    </header>

    <div className="px-1.5 pb-2.5"><div className="relative">
      <Search size={15} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink/80" />
      <Input ref={searchRef} className="h-11 rounded-xl border-0 bg-ink/18 pr-14 pl-10 text-sm shadow-none ring-1 ring-ink/12 placeholder:text-ink/70 focus-visible:bg-ink/25"
        value={query} onChange={event => setQuery(event.target.value)}
        onKeyDown={event => {
          if (event.key === "Enter") { event.preventDefault(); openFirstResult(); }
          if (event.key === "ArrowDown") { event.preventDefault(); focusFirstRow(document.querySelector("main") ?? document); }
        }}
        placeholder="Search tabs and bookmarks" aria-label="Search tabs and bookmarks" />
      {query
        ? <IconButton label="Clear search" size="icon-xs" className="absolute top-1/2 right-2 -translate-y-1/2"
            onClick={() => { setQuery(""); searchRef.current?.focus(); }}><X size={13} /></IconButton>
        : <kbd className="absolute top-1/2 right-3 flex -translate-y-1/2 items-center gap-0.5 font-sans text-[11px] text-ink/65">
            <Command size={10} /> K</kbd>}
    </div></div>

    {!arcside.ready ? <div role="status" aria-label="Loading" className="flex flex-col gap-2 px-2 py-2">
        <span className="sr-only">Loading…</span>
        <div className="grid grid-cols-4 gap-1.5">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-11 rounded-[10px] bg-ink/15" />)}</div>
        {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 rounded-[10px] bg-ink/12" style={{ opacity: 1 - i * 0.16 }} />)}
      </div>
      : <main aria-label="Tabs and favorites" onKeyDown={focusNextRow} className="min-h-0 flex-1 overflow-auto px-1.5 [scrollbar-color:#49445b_transparent] [scrollbar-width:thin]">
        {needle
          ? <SearchResults tabs={foundTabs} saved={foundSaved} bookmarks={foundBookmarks} folders={folders} spaces={spaces} isFavorite={isFavorite}
              renderTab={renderTab} onOpenSaved={item => run(arcside.openBound(item.id, item.url))} onOpenUrl={url => run(arcside.openUrl(url))}
              onPreview={url => run(arcside.openGlance(url))} onToggleFavorite={toggleFavorite} />
          : <div key={activeSpace.id} className={cn("animate-in fade-in zoom-in-[.985] duration-300 ease-spring",
              nav.direction > 0 ? "slide-in-from-right-6" : nav.direction < 0 ? "slide-in-from-left-6" : "slide-in-from-bottom-1")}>
            <div className="stagger-in" style={{ transform: `translateX(${shift}px)`, opacity: 1 - progress * 0.45,
              transition: swiping ? "none" : `transform 380ms ${EASE_OVERSHOOT}, opacity 320ms ${EASE_SPRING}` }}>
              <FavoritesGrid favorites={favorites} liveTabs={arcside.liveTabs}
                onOpen={(item, altKey) => run(altKey ? arcside.openGlance(item.url) : arcside.openBound(item.id, item.url))}
                onCloseTab={id => run(arcside.closeTab(id))} onRemove={id => run(arcside.removeFavorite(id))}
                onAddActive={() => run(arcside.favoriteActiveTab())} onDrop={acceptFavorite} />

              <div className="mt-3 flex h-9 items-center gap-2.5 border-b border-ink/20 px-2 text-sm font-medium">
                <span className="text-base leading-none">{activeSpace.emoji}</span><span className="min-w-0 flex-1 truncate">{activeSpace.name}</span>
                <Count value={spaceSaved.length + today.length} className="text-xs font-normal text-ink/70" />
                <IconButton label="New folder" size="icon-xs" onClick={() => setFolderDialog({ parentId: null })}><FolderPlus size={14} /></IconButton>
              </div>

              <div className="mt-2">
                <SavedTree folders={spaceFolders} items={spaceSaved} liveTabs={arcside.liveTabs}
                  folderOptions={flattenFolders(folders, activeSpace.id)}
                  onOpen={item => run(arcside.openBound(item.id, item.url))}
                  onPreview={url => run(arcside.openGlance(url))}
                  onColor={(folderId, color) => run(arcside.setFolderColor(folderId, color))}
                  onUnsave={id => run(arcside.unsave(id))}
                  onCloseTab={id => run(arcside.closeTab(id))}
                  onMove={(savedId, folderId, beforeId) => run(arcside.moveSaved(savedId, folderId, beforeId))}
                  onSaveTab={(tabId, folderId, beforeId) => run(arcside.saveTab(tabId, folderId, beforeId))}
                  onMoveFolder={(folderId, parentId, beforeId) => run(arcside.moveFolder(folderId, parentId, beforeId))}
                  onOpenAll={openAll}
                  onAdd={parentId => setFolderDialog({ parentId })}
                  onRename={folder => setFolderDialog({ folder })}
                  onToggle={folderId => run(arcside.toggleFolder(folderId))}
                  onDelete={async folder => {
                    if (await confirm({ title: `Delete “${folder.name}”?`, description: "Its subfolders and saved tabs will be removed. You can undo with ⌘Z.", confirmLabel: "Delete", destructive: true })) run(arcside.removeFolder(folder.id));
                  }} />
              </div>

              <div className="mx-2 my-2 h-px bg-ink/15" />
              <button {...NAV} className="focus-ring flex h-10 w-full items-center gap-3 rounded-[10px] pl-2.5 text-sm text-ink/70 transition-colors hover:bg-ink/12 hover:text-ink"
                onClick={() => run(arcside.newTab())}>
                <Plus size={16} /> New tab
              </button>
              {(clearableIds.length > 0 || duplicateIds.length > 0) && <div className="flex items-center gap-1 px-1 pb-1 text-xs text-ink/70">
                <span className="px-1">Today</span>
                <div className="ml-auto flex items-center gap-1">
                  {duplicateIds.length > 0 && <Button variant="ghost" size="xs" className="text-ink/80 hover:text-ink"
                    onClick={() => closeTabsLabeled(duplicateIds, "duplicate tabs closed")}>Duplicates ({duplicateIds.length})</Button>}
                  {clearableIds.length > 0 && <Button variant="ghost" size="xs" className="text-ink/80 hover:text-ink"
                    onClick={() => closeTabsLabeled(clearableIds, "tabs cleared")}><Eraser size={12} /> Clear</Button>}
                </div>
              </div>}
              <div ref={animated} className="flex min-h-8 flex-col gap-0.5" onDragOver={event => event.preventDefault()}
                onDrop={event => {
                  event.preventDefault();
                  const dragged = readDrag(event);
                  if (dragged?.kind === "tab") run(arcside.assignTab(Number(dragged.id), activeSpace.id));
                }}>{today.map(renderTab)}</div>
              <div className="h-4" />
            </div>
          </div>}
      </main>}

    <SpaceBar spaces={spaces} activeId={activeSpace.id} onChoose={nav.choose} onNew={() => setSpaceDialog("new")} onEdit={() => setSpaceDialog(activeSpace)}
      onDropTab={(tabId, spaceId) => run(arcside.assignTab(tabId, spaceId))} onReorder={(sourceId, targetId) => run(arcside.reorderSpace(sourceId, targetId))} />

    {libraryOpen && <BookmarkDrawer tree={arcside.tree} isFavorite={isFavorite} onPreview={url => run(arcside.openGlance(url))}
      onClose={() => setLibraryOpen(false)} onOpen={url => run(arcside.openUrl(url))} onAdd={id => run(arcside.addFavoriteBookmark(id))}
      onToggleFavorite={toggleFavorite} onImport={file => run(arcside.importBookmarks(file))} onExport={arcside.exportSpace} />}

    {archiveOpen && <ArchiveSheet archived={archived} closed={closedHistory} onClose={() => setArchiveOpen(false)}
      onRestoreClosed={id => run(arcside.restoreClosed(id))} onRestore={id => run(arcside.restoreArchived(id))}
      onRemove={id => run(arcside.removeArchived(id))} onClear={() => run(arcside.clearArchive())} />}

    {settingsOpen && <SettingsSheet
      settings={arcside.preferences} spaceName={activeSpace.name} onChange={patch => run(arcside.setSettings(patch))}
      onExportBackup={arcside.exportBackup} onFailure={arcside.onError} onClose={() => setSettingsOpen(false)}
      onImportBackup={file => run(file.text().then(text => setPendingBackup(parseBackup(text))))} />}

    {pendingBackup && <ImportBackupDialog backup={pendingBackup} onClose={() => setPendingBackup(null)}
      onImport={mode => { run(arcside.importBackup(pendingBackup, mode)); setPendingBackup(null); }} />}

    {paletteOpen && <CommandPalette tabs={arcside.tabs} saved={saved} bookmarks={allBookmarks} spaces={spaces} activeSpaceId={activeSpace.id}
      onClose={() => setPaletteOpen(false)} onOpenTab={id => run(arcside.activateTab(id))}
      onOpenSaved={item => run(arcside.openBound(item.id, item.url))} onOpenUrl={url => run(arcside.openUrl(url))}
      onSwitchSpace={nav.choose} actions={paletteActions} />}

    {spaceDialog && <SpaceDialog space={spaceDialog === "new" ? undefined : spaceDialog} onClose={() => setSpaceDialog(null)}
      onSave={fields => spaceDialog === "new" ? arcside.addSpace(fields) : arcside.editSpace(spaceDialog.id, fields)}
      onDelete={spaceDialog !== "new" && spaceDialog.id !== DEFAULT_SPACE_ID ? () => arcside.removeSpace(spaceDialog.id) : undefined} />}

    {folderDialog && <NameDialog
      title={"folder" in folderDialog ? "Rename folder" : folderDialog.parentId ? "New subfolder" : "New folder"}
      initial={"folder" in folderDialog ? folderDialog.folder.name : ""}
      onClose={() => setFolderDialog(null)}
      onSave={name => "folder" in folderDialog ? arcside.renameFolder(folderDialog.folder.id, name) : arcside.addFolder(name, folderDialog.parentId)} />}

    <ToastBar toast={arcside.toast} onDismiss={() => arcside.setToast(null)} />
  </PageShell></FetchMissingFavicons.Provider>;
}

mount(<ExtensionApp />);
