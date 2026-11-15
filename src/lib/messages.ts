import type { PaletteItem } from "./palette-search";

export type RuntimeMessage =
  | { type: "copy-to-clipboard"; text: string }
  | { type: "copied" }
  | { type: "ambient-ping"; rows: number[][] | null }
  | { type: "palette-query"; query: string }
  | { type: "palette-open"; item: PaletteItem };

export const LINK_COPIED = "Link copied";
