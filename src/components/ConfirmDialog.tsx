import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

interface Options { title: string; description?: string; confirmLabel?: string; destructive?: boolean }
type Confirm = (options: Options) => Promise<boolean>;
type Pending = Options & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<Confirm>(() => Promise.resolve(false));

export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirm = useCallback<Confirm>(options => new Promise<boolean>(resolve => setPending(previous => { previous?.resolve(false); return { ...options, resolve }; })), []);
  const settle = (ok: boolean) => { pending?.resolve(ok); setPending(null); };

  return <ConfirmContext.Provider value={confirm}>
    {children}
    {pending && <Dialog open onOpenChange={open => { if (!open) settle(false); }}>
      <DialogContent showCloseButton={false} className="max-w-[320px] gap-4 bg-popover" onOpenAutoFocus={event => event.preventDefault()}>
        <DialogTitle className="text-base">{pending.title}</DialogTitle>
        <DialogDescription className={pending.description ? "text-[13px] leading-normal" : "sr-only"}>{pending.description ?? pending.title}</DialogDescription>
        <div className="flex justify-end gap-1.5">
          <Button variant="ghost" onClick={() => settle(false)}>Cancel</Button>
          <Button variant={pending.destructive ? "destructive" : "default"} autoFocus onClick={() => settle(true)}>{pending.confirmLabel ?? "Confirm"}</Button>
        </div>
      </DialogContent>
    </Dialog>}
  </ConfirmContext.Provider>;
}
