import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function IconButton({ label, variant = "ghost", size = "icon-sm", ...props }:
  ComponentProps<typeof Button> & { label: string }) {
  return <Tooltip>
    <TooltipTrigger asChild><Button variant={variant} size={size} aria-label={label} {...props} /></TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>;
}
