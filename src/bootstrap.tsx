import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ArrowDownToLine, Check, PanelLeft } from "lucide-react";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./styles.css";

function ExtensionOnly() {
  return <div className="min-h-screen bg-linear-to-br from-[#2e243e] to-[#171621] px-6 py-9">
    <div className="grid size-14 place-items-center rounded-[13px] bg-primary/30"><PanelLeft size={30} /></div>
    <h1 className="my-4 text-3xl font-bold">Arcside</h1>
    <p className="max-w-[300px] text-[13px] leading-relaxed text-muted-foreground">This interface must be opened as a Chrome extension.</p>
    <div className="flex flex-col gap-4 py-5 text-xs"><span className="flex items-center gap-2.5"><Check size={14} /> <code>bun run build</code></span>
      <span className="flex items-center gap-2.5"><ArrowDownToLine size={14} /> Open <code>chrome://extensions</code></span>
      <span className="flex items-center gap-2.5"><Check size={14} /> Load the folder <code>dist/</code></span></div>
  </div>;
}

export function mount(page: ReactNode) {
  const isExtension = typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
  createRoot(document.getElementById("root")!).render(
    <StrictMode><ErrorBoundary><TooltipProvider><ConfirmProvider>{isExtension ? page : <ExtensionOnly />}</ConfirmProvider></TooltipProvider></ErrorBoundary></StrictMode>
  );
}
