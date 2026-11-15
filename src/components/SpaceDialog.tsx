import { useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { useAttempt } from "@/hooks/useAttempt";
import { SPACE_COLORS } from "@/lib/palette";
import { SpaceColorPicker, type SpaceColors } from "./SpaceColorPicker";
import { AMBIENT_MODES, isSpaceAmbient, type Space, type SpaceAmbient, type SpaceFields } from "@/lib/models";
import { useConfirm } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Props {
  space?: Space;
  onClose: () => void;
  onSave: (fields: SpaceFields) => Promise<void>;
  onDelete?: () => Promise<void>;
}

const AMBIENT_CHOICES = ["default", "off", ...AMBIENT_MODES];

const EMOJIS = ["✦", "◈", "☀", "◇", "✳", "◉", "☁", "✿", "🏠", "💼", "🎯", "🚀", "💡", "📚", "🎨", "🎮", "🎵", "🛒", "✈️", "🧪", "🔥", "🌱", "⭐", "💬"];

export default function SpaceDialog({ space, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(space?.name ?? "");
  const [emoji, setEmoji] = useState(space?.emoji ?? EMOJIS[0]);
  const [colors, setColors] = useState<SpaceColors>({ color: space?.color ?? SPACE_COLORS[0], color2: space?.color2 });
  const [ambient, setAmbient] = useState<SpaceAmbient | undefined>(space?.ambient);
  const confirm = useConfirm();
  const { busy, error: formError, attempt } = useAttempt(onClose);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() && !busy) void attempt(() => onSave({ name: name.trim(), emoji, ...colors, ambient }));
  };

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-w-[345px] bg-popover" aria-describedby={undefined}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <DialogTitle>{space ? "Edit Space" : "New Space"}</DialogTitle>
        <DialogDescription className="sr-only">Space name, symbol and color</DialogDescription>
        <label className="text-xs font-semibold text-muted-foreground" htmlFor="space-name">Space name</label>
        <Input id="space-name" value={name} autoFocus maxLength={32} placeholder="e.g. Side projects"
          onChange={event => setName(event.target.value)} />
        <div className="text-xs font-semibold text-muted-foreground">Symbol</div>
        <div className="flex flex-wrap gap-1.5">{(EMOJIS.includes(emoji) ? EMOJIS : [emoji, ...EMOJIS]).map(value => <button type="button" key={value}
          className={cn("size-8 rounded-lg border border-transparent text-xl hover:border-primary hover:bg-primary/15",
            emoji === value && "border-primary bg-primary/15")}
          onClick={() => setEmoji(value)}>{value}</button>)}</div>
        <Input aria-label="Custom symbol" placeholder="Or type any emoji" maxLength={4} className="h-9 w-40 text-center"
          onChange={event => { const value = event.target.value.trim(); if (value) setEmoji(value); }} />
        <div className="text-xs font-semibold text-muted-foreground">Color</div>
        <SpaceColorPicker value={colors} onChange={setColors} />
        <div className="text-xs font-semibold text-muted-foreground">Ambient color</div>
        <ToggleGroup type="single" variant="outline" size="sm" value={ambient ?? "default"} aria-label="Ambient color"
          onValueChange={value => { if (value) setAmbient(isSpaceAmbient(value) ? value : undefined); }}>
          {AMBIENT_CHOICES.map(choice => <ToggleGroupItem key={choice} value={choice} className="capitalize">{choice}</ToggleGroupItem>)}
        </ToggleGroup>
        {formError && <p className="text-xs leading-normal text-destructive" role="alert">{formError}</p>}
        <div className="mt-3 flex items-center gap-1.5">
          {onDelete && <Button type="button" variant="ghost" className="px-0 text-destructive hover:bg-transparent" disabled={busy}
            onClick={async () => {
              if (await confirm({ title: `Delete “${space?.name}”?`, description: "Its tabs, folders and saved items will move to Personal.", confirmLabel: "Delete", destructive: true })) void attempt(onDelete);
            }}>Delete</Button>}
          <div className="flex-1" />
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!name.trim() || busy}>Save</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
