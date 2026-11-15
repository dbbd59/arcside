import { Trash2, X } from "lucide-react";
import { hostname } from "@/lib/urls";
import type { ArchivedTab, ClosedEntry } from "@/lib/models";
import { Button } from "@/components/ui/button";
import { Favicon } from "./Favicon";
import { IconButton } from "./IconButton";
import { SheetShell } from "./SheetShell";

function ago(timestamp: number): string {
  const minutes = Math.max(1, Math.round((Date.now() - timestamp) / 60_000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

interface Props {
  archived: ArchivedTab[];
  closed: ClosedEntry[];
  onClose: () => void;
  onRestore: (id: string) => void;
  onRestoreClosed: (sessionId: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

function HistoryRow({ url, title, subtitle, onOpen, onRemove }: {
  url: string; title: string; subtitle: string; onOpen: () => void; onRemove?: () => void;
}) {
  return <div className="flex min-h-11 items-center rounded-lg pr-1 pl-2 hover:bg-accent">
    <button className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-md py-1 text-left" title={url} onClick={onOpen}>
      <Favicon url={url} size={16} />
      <span className="flex min-w-0 flex-1 flex-col">
        <strong className="truncate text-[12.5px] font-medium">{title}</strong>
        <small className="truncate text-[11px] text-muted-foreground">{subtitle}</small>
      </span>
    </button>
    {onRemove && <IconButton label="Delete from archive" size="icon-xs" onClick={onRemove}><X size={13} /></IconButton>}
  </div>;
}

export default function ArchiveSheet({ archived, closed, onClose, onRestore, onRestoreClosed, onRemove, onClear }: Props) {
  return <SheetShell title="History" description="Recently closed and auto-archived tabs" visibleDescription closeLabel="Close history" onClose={onClose}>
    <div className="min-h-0 flex-1 overflow-auto px-2 pb-5 [scrollbar-width:thin]">
      <h3 className="px-2 pt-1 pb-1 text-xs font-semibold text-muted-foreground">Recently closed</h3>
      {closed.length === 0
        ? <div className="px-2 pb-3 text-xs text-muted-foreground">No recently closed tabs.</div>
        : closed.map(entry => <HistoryRow key={entry.sessionId} url={entry.url} title={entry.title}
            subtitle={entry.count ? "Restore window" : hostname(entry.url)} onOpen={() => onRestoreClosed(entry.sessionId)} />)}
      <h3 className="px-2 pt-4 pb-1 text-xs font-semibold text-muted-foreground">Archived</h3>
      <div className="mb-2 flex items-center px-2 text-xs text-muted-foreground">
        <span>Unsaved tabs closed after inactivity (see Settings)</span>
        {archived.length > 0 && <Button variant="ghost" size="xs" className="ml-auto" onClick={onClear}><Trash2 size={12} /> Clear</Button>}
      </div>
      {archived.length === 0
        ? <div className="px-5 py-3 text-xs text-muted-foreground">Nothing archived yet.</div>
        : archived.map(entry => <HistoryRow key={entry.id} url={entry.url} title={entry.title}
            subtitle={`${hostname(entry.url)} · ${ago(entry.closedAt)}`} onOpen={() => onRestore(entry.id)} onRemove={() => onRemove(entry.id)} />)}
    </div>
  </SheetShell>;
}
