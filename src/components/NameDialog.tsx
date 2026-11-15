import { useState, type FormEvent } from "react";
import { useAttempt } from "@/hooks/useAttempt";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface Props {
  title: string;
  initial?: string;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}

export default function NameDialog({ title, initial = "", onClose, onSave }: Props) {
  const [name, setName] = useState(initial);
  const { busy, error, attempt } = useAttempt(onClose);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim() && !busy) void attempt(() => onSave(name.trim()));
  };

  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className="max-w-[345px] bg-popover" aria-describedby={undefined}>
      <form onSubmit={submit} className="flex flex-col gap-3.5">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">Enter a name</DialogDescription>
        <Input value={name} autoFocus maxLength={40} placeholder="Name" aria-label="Name"
          onChange={event => setName(event.target.value)} />
        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
        <div className="flex justify-end gap-1.5">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!name.trim() || busy}>Save</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
