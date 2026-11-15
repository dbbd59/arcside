import { useState, type ReactNode } from "react";
import { matchBookmarks, type BookmarkEntry } from "@/lib/bookmarks";
import { matches, searchNeedle } from "@/lib/selectors";
import { hostname } from "@/lib/urls";
import { tabTitle, type Tab } from "@/lib/tabs";
import type { SavedItem, Space } from "@/lib/models";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Favicon } from "./Favicon";

interface PaletteAction {
  id: string;
  label: string;
  icon?: ReactNode;
  run: () => void;
}

interface Props {
  tabs: Tab[];
  saved: SavedItem[];
  bookmarks: BookmarkEntry[];
  spaces: Space[];
  activeSpaceId: string;
  actions: PaletteAction[];
  onClose: () => void;
  onOpenTab: (id: number) => void;
  onOpenSaved: (item: SavedItem) => void;
  onOpenUrl: (url: string) => void;
  onSwitchSpace: (id: string) => void;
}

const LIMIT = 6;
const IDLE_COMMANDS = 12;

export default function CommandPalette({ tabs, saved, bookmarks, spaces, activeSpaceId, actions, onClose, onOpenTab, onOpenSaved, onOpenUrl, onSwitchSpace }: Props) {
  const [query, setQuery] = useState("");
  const needle = searchNeedle(query);
  const contains = (text: string) => matches(needle, text);
  const finish = (action: () => void) => () => { onClose(); action(); };

  const tabHits = tabs.filter(tab => contains(`${tab.title} ${tab.url}`)).slice(0, LIMIT);
  const savedHits = saved.filter(item => contains(`${item.title} ${item.url}`)).slice(0, LIMIT);
  const bookmarkHits = needle ? matchBookmarks(bookmarks, query).slice(0, LIMIT) : [];
  const commandHits = [
    ...actions,
    ...spaces.filter(space => space.id !== activeSpaceId).map(space => ({
      id: `space-${space.id}`, label: `Switch to ${space.name}`, icon: <span>{space.emoji}</span>, run: () => onSwitchSpace(space.id)
    }))
  ].filter(action => contains(action.label)).slice(0, needle ? LIMIT : IDLE_COMMANDS);

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent showCloseButton={false} className="top-[20%] max-w-[calc(100%-1.5rem)] translate-y-0 gap-0 overflow-hidden bg-popover p-0" aria-describedby={undefined}>
      <DialogTitle className="sr-only">Command palette</DialogTitle>
      <DialogDescription className="sr-only">Search tabs, saved links and bookmarks, or run a command</DialogDescription>
      <Command shouldFilter={false} loop>
        <CommandInput value={query} onValueChange={setQuery} placeholder="Search or run a command…" />
        <CommandList className="max-h-[55vh]">
          <CommandEmpty>No results.</CommandEmpty>
          {tabHits.length > 0 && <CommandGroup heading="Tabs">
            {tabHits.map(tab => <CommandItem key={`t${tab.id}`} value={`tab-${tab.id}`} onSelect={finish(() => onOpenTab(tab.id))}>
              <Favicon url={tab.url} custom={tab.favIconUrl} size={16} /><span className="truncate">{tabTitle(tab)}</span></CommandItem>)}
          </CommandGroup>}
          {savedHits.length > 0 && <CommandGroup heading="Saved">
            {savedHits.map(item => <CommandItem key={`s${item.id}`} value={`saved-${item.id}`} onSelect={finish(() => onOpenSaved(item))}>
              <Favicon url={item.url} size={16} /><span className="truncate">{item.title || hostname(item.url)}</span></CommandItem>)}
          </CommandGroup>}
          {bookmarkHits.length > 0 && <CommandGroup heading="Bookmarks">
            {bookmarkHits.map(({ node }) => <CommandItem key={`b${node.id}`} value={`bookmark-${node.id}`} onSelect={finish(() => onOpenUrl(node.url!))}>
              <Favicon url={node.url} size={16} /><span className="truncate">{node.title || hostname(node.url)}</span></CommandItem>)}
          </CommandGroup>}
          {commandHits.length > 0 && <>
            {(tabHits.length + savedHits.length + bookmarkHits.length > 0) && <CommandSeparator />}
            <CommandGroup heading="Commands">
              {commandHits.map(action => <CommandItem key={action.id} value={`cmd-${action.id}`} onSelect={finish(action.run)}>
                {action.icon}<span className="truncate">{action.label}</span></CommandItem>)}
            </CommandGroup>
          </>}
        </CommandList>
      </Command>
    </DialogContent>
  </Dialog>;
}
