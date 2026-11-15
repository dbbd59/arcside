import { useEffect, useState } from "react";
import { Check, CircleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Toast } from "@/hooks/useUndo";
import { Button } from "@/components/ui/button";
import { IconButton } from "./IconButton";

const DISMISS_MS = 4500;
const DISMISS_WITH_ACTION_MS = 7000;

export function ToastBar({ toast, onDismiss }: { toast: Toast | null; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const [cycle, setCycle] = useState(0);
  const duration = toast?.action ? DISMISS_WITH_ACTION_MS : DISMISS_MS;

  useEffect(() => {
    if (!toast || toast.error || paused) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [toast, paused, cycle]);

  if (!toast) return null;
  const Icon = toast.error ? CircleAlert : Check;
  return <div key={toast.text} role={toast.error ? "alert" : "status"}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => { setPaused(false); setCycle(count => count + 1); }}
    className={cn(
      "animate-in fade-in slide-in-from-bottom-3 zoom-in-95 absolute inset-x-2.5 bottom-3 z-[60] flex items-center gap-2.5 overflow-hidden rounded-xl border py-2.5 pr-2 pl-3 text-[13px] leading-snug shadow-xl backdrop-blur-md duration-300 ease-spring",
      toast.error ? "border-[#c9788a]/60 bg-[#4d2934]/92 text-[#ffdbdb]" : "border-white/15 bg-[#1f1e2b]/92 text-white")}>
    <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", toast.error ? "bg-[#f2aaa9]/25" : "bg-emerald-400/25 text-emerald-300")}>
      <Icon size={12} strokeWidth={3} />
    </span>
    <span className="flex-1">{toast.text}</span>
    {toast.action && <Button size="xs" variant="secondary" onClick={() => { toast.action?.run(); onDismiss(); }}>{toast.action.label}</Button>}
    <IconButton label="Dismiss message" size="icon-xs" onClick={onDismiss}><X size={14} /></IconButton>
    {!toast.error && !paused && <span key={cycle} className="toast-progress absolute inset-x-0 bottom-0 h-0.5 origin-left bg-white/35" style={{ animationDuration: `${duration}ms` }} />}
  </div>;
}
