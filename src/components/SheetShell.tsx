import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { IconButton } from "./IconButton";

interface Props {
  title: string;
  description: string;
  eyebrow?: string;
  visibleDescription?: boolean;
  actions?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

export function SheetShell({ title, description, eyebrow, visibleDescription = false, actions, closeLabel, onClose, children }: Props) {
  return <Sheet open onOpenChange={open => { if (!open) onClose(); }}>
    <SheetContent showCloseButton={false} className="w-full gap-0 bg-card p-0 sm:max-w-none" aria-describedby={undefined}>
      <div className="flex items-center justify-between py-5 pr-3.5 pl-[18px]">
        <div>
          {eyebrow && <div className="text-[11px] font-bold tracking-[0.12em] text-muted-foreground">{eyebrow}</div>}
          <SheetTitle className="text-xl tracking-tight">{title}</SheetTitle>
          <SheetDescription className={visibleDescription ? "mt-1 text-xs" : "sr-only"}>{description}</SheetDescription>
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <IconButton label={closeLabel} onClick={onClose}><X size={18} /></IconButton>
        </div>
      </div>
      {children}
    </SheetContent>
  </Sheet>;
}
