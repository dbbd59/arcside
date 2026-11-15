import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Count({ value, className }: { value: number; className?: string }) {
  return <span key={value} className={cn("animate-in fade-in slide-in-from-bottom-1 duration-300", className)}>{value}</span>;
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="hidden items-center group-focus-within:flex group-hover:flex group-has-[[data-state=open]]:flex">{children}</div>;
}
