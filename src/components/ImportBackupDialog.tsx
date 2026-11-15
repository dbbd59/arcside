import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import type { ImportMode, ParsedBackup } from "@/lib/backup";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Props {
  backup: ParsedBackup;
  onImport: (mode: ImportMode) => void;
  onClose: () => void;
}

const MODE_HINT: Record<ImportMode, string> = {
  merge: "Adds what is missing and keeps everything you already have. Spaces with the same name are combined.",
  replace: "Overwrites your Spaces, folders, saved links, Favorites and settings. You can undo with ⌘Z."
};

export default function ImportBackupDialog({ backup, onImport, onClose }: Props) {
  const [mode, setMode] = useState<ImportMode>("merge");
  const { summary, scope, exportedAt, skipped } = backup;
  const stats = [["Spaces", summary.spaces], ["Folders", summary.folders], ["Links", summary.links], ["Favorites", summary.favorites]] as const;

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent showCloseButton={false} className="max-w-[345px] gap-4 bg-popover" aria-describedby="import-backup-description">
      <DialogTitle className="text-base">Import backup</DialogTitle>
      <DialogDescription id="import-backup-description" className="text-[13px]">
        {scope === "space" ? "Single Space" : "Full backup"} · {exportedAt ? new Date(exportedAt).toLocaleString() : "date unknown"}
      </DialogDescription>
      <div className="grid grid-cols-4 gap-1.5">
        {stats.map(([label, value]) => <div key={label} className="rounded-lg bg-secondary/60 px-2 py-2 text-center">
          <div className="text-lg leading-none font-semibold tabular-nums">{value}</div>
          <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
        </div>)}
      </div>
      {skipped > 0 && <p className="flex items-start gap-2 text-xs leading-normal text-muted-foreground" role="status">
        <TriangleAlert size={14} className="mt-px shrink-0" /> {skipped} invalid {skipped === 1 ? "entry was" : "entries were"} skipped.
      </p>}
      <ToggleGroup type="single" variant="outline" size="sm" value={mode} aria-label="Import mode"
        onValueChange={value => { if (value === "merge" || value === "replace") setMode(value); }}>
        <ToggleGroupItem value="merge">Merge</ToggleGroupItem>
        <ToggleGroupItem value="replace" disabled={scope === "space"}>Replace</ToggleGroupItem>
      </ToggleGroup>
      <p className="text-xs leading-normal text-muted-foreground">{MODE_HINT[mode]}</p>
      <div className="flex justify-end gap-1.5">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant={mode === "replace" ? "destructive" : "default"} onClick={() => onImport(mode)}>{mode === "replace" ? "Replace" : "Merge"}</Button>
      </div>
    </DialogContent>
  </Dialog>;
}
