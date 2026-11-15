import { useState } from "react";
import { BookmarkPlus, Heart, Volume2, VolumeX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/nav";
import { tabTitle, type Tab } from "@/lib/tabs";
import { dragSource, readDrag } from "@/lib/drag";
import { Favicon } from "./Favicon";
import { IconButton } from "./IconButton";
import { RowActions } from "./rows";

interface Props {
  tab: Tab;
  onActivate: (id: number) => void;
  onClose: (id: number) => void;
  onSave: (id: number) => void;
  onFavorite: (id: number) => void;
  onToggleMute: (id: number) => void;
  onDropTab: (sourceId: number, targetId: number) => void;
}

export function TabRow({ tab, onActivate, onClose, onSave, onFavorite, onToggleMute, onDropTab }: Props) {
  const [over, setOver] = useState(false);
  const title = tabTitle(tab);
  const muted = tab.mutedInfo?.muted === true;
  return <div {...dragSource("tab", String(tab.id))}
    className={cn(
      "group list-row relative", tab.active && "list-row-active", over && "shadow-[0_-2px_0_0_var(--space-accent)]")}
    onDragOver={event => { event.preventDefault(); setOver(true); }}
    onDragLeave={() => setOver(false)}
    onDrop={event => {
      event.preventDefault(); event.stopPropagation(); setOver(false);
      const dragged = readDrag(event);
      if (dragged?.kind === "tab") onDropTab(Number(dragged.id), tab.id);
    }}>
    <div className="flex h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md focus-ring" role="button" tabIndex={0} {...NAV}
      aria-current={tab.active || undefined} aria-label={`Open ${title}`} title={tab.url || title} onClick={() => onActivate(tab.id)}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onActivate(tab.id); }
        if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); onClose(tab.id); }
      }}>
      <span className="grid size-[18px] shrink-0 place-items-center">
        <Favicon url={tab.url} custom={tab.favIconUrl} size={18} loading={tab.status === "loading"} />
      </span>
      <span className={cn("min-w-0 flex-1 truncate text-sm text-ink/85", tab.active && "font-medium text-ink")}>{title}</span>
      {tab.discarded && <span className="size-1 shrink-0 rounded-full bg-ink/40" role="img" aria-label="Tab suspended" />}
    </div>
    {(tab.audible || muted) && <IconButton label={muted ? "Unmute tab" : "Mute tab"} size="icon-xs"
      className={cn("shrink-0", tab.audible && !muted && "animate-pulse")} onClick={() => onToggleMute(tab.id)}>
      {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}</IconButton>}
    <RowActions>
      <IconButton label="Add to Favorites" size="icon-xs" onClick={() => onFavorite(tab.id)}><Heart size={13} /></IconButton>
      <IconButton label="Save in Space" size="icon-xs" onClick={() => onSave(tab.id)}><BookmarkPlus size={13} /></IconButton>
      <IconButton label="Close tab" size="icon-xs" onClick={() => onClose(tab.id)}><X size={14} /></IconButton>
    </RowActions>
  </div>;
}
