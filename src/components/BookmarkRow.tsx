import { Heart } from "lucide-react";
import type { BookmarkNode } from "@/lib/bookmarks";
import { hostname } from "@/lib/urls";
import { dragSource } from "@/lib/drag";
import { Favicon } from "./Favicon";
import { IconButton } from "./IconButton";

interface Props {
  node: BookmarkNode;
  path?: string;
  favorite: boolean;
  indent?: number;
  onOpen: (url: string) => void;
  onPreview?: (url: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function BookmarkRow({ node, path, favorite, indent = 0, onOpen, onPreview, onToggleFavorite }: Props) {
  const url = node.url!;
  return <div className="flex min-h-10 items-center rounded-lg lazy-row hover:bg-accent" style={{ paddingLeft: indent }}
    {...dragSource("bookmark", node.id)}>
    <button className="flex min-h-9 min-w-0 flex-1 items-center gap-2.5 px-1 text-left text-secondary-foreground" title={url} onClick={event => (event.altKey && onPreview ? onPreview(url) : onOpen(url))}>
      <Favicon url={url} size={16} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <strong className="truncate text-[12.5px] font-medium">{node.title || hostname(url)}</strong>
        {path !== undefined && <small className="truncate text-[11px] text-muted-foreground">{path || hostname(url)}</small>}
      </span>
    </button>
    <IconButton label={favorite ? "Remove from Favorites" : "Add to Favorites"} size="icon-sm"
      className={favorite ? "text-(--space-accent)" : "text-muted-foreground"}
      onClick={() => onToggleFavorite(node.id)}>
      <Heart key={String(favorite)} size={14} className={favorite ? "animate-pop" : undefined} fill={favorite ? "currentColor" : "none"} />
    </IconButton>
  </div>;
}
