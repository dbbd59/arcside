import { useState } from "react";
import { Heart, HeartOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "@/lib/nav";
import { animated } from "@/lib/animate";
import type { FavoriteItem } from "@/lib/models";
import type { Tab } from "@/lib/tabs";
import { dragSource, readDrag, type Dragged } from "@/lib/drag";
import { hostname } from "@/lib/urls";
import { Favicon } from "./Favicon";
import { IconButton } from "./IconButton";

interface Props {
  favorites: FavoriteItem[];
  liveTabs: Map<string, Tab>;
  onOpen: (item: FavoriteItem, altKey: boolean) => void;
  onCloseTab: (tabId: number) => void;
  onRemove: (id: string) => void;
  onAddActive: () => void;
  onDrop: (dragged: Dragged | null, beforeId?: string) => void;
}

const OVERLAY_BUTTON = "absolute top-0.5 hidden size-4 bg-black/50 text-white group-focus-within:flex group-hover:flex";

export function FavoritesGrid({ favorites, liveTabs, onOpen, onCloseTab, onRemove, onAddActive, onDrop }: Props) {
  const [over, setOver] = useState<string | null>(null);

  return <section
    onDragOver={event => { event.preventDefault(); setOver("grid"); }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOver(null); }}
    onDrop={event => { event.preventDefault(); setOver(null); onDrop(readDrag(event)); }}>
    <div ref={animated} className={cn("grid grid-cols-[repeat(auto-fit,minmax(56px,1fr))] gap-1.5 rounded-xl border border-transparent",
      over === "grid" && "border-ink/40 bg-ink/10")}>
      {favorites.map(node => {
        const live = liveTabs.get(node.id);
        const name = node.title || hostname(node.url);
        return <div key={node.id} {...dragSource("favorite", node.id)}
          className={cn("group relative h-11 min-w-0 overflow-hidden rounded-[10px] border border-transparent bg-ink/18 ring-1 ring-ink/10 transition hover:bg-ink/28",
            live?.active && "bg-ink/35 ring-ink/50 hover:bg-ink/40", over === node.id && "border-ink/70")}
          onDragOver={event => { event.preventDefault(); event.stopPropagation(); setOver(node.id); }}
          onDrop={event => { event.preventDefault(); event.stopPropagation(); setOver(null); onDrop(readDrag(event), node.id); }}>
          <button className="focus-ring grid size-full place-items-center rounded-[10px] transition-transform ease-spring active:scale-90"
            {...NAV} aria-current={live?.active || undefined} aria-label={name} title={name}
            onClick={event => onOpen(node, event.altKey)}>
            <Favicon url={node.url} size={22} loading={live?.status === "loading"} />
          </button>
          {live && <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-ink/80 group-hover:hidden" />}
          {live && <IconButton label="Close tab (stays in Favorites)" size="icon-xs" className={cn(OVERLAY_BUTTON, "left-0.5")}
            onClick={() => onCloseTab(live.id)}><X size={10} /></IconButton>}
          <IconButton label="Remove from Favorites" size="icon-xs" className={cn(OVERLAY_BUTTON, "right-0.5")}
            onClick={() => onRemove(node.id)}><HeartOff size={10} /></IconButton>
        </div>;
      })}
      {favorites.length === 0 && <button className="col-span-full flex h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-ink/25 text-xs text-ink/70 hover:bg-ink/10 hover:text-ink"
        onClick={onAddActive}>
        <Heart size={13} /> Drag favorites here
      </button>}
    </div>
  </section>;
}
