import { matches, searchNeedle } from "./selectors";
import { sameUrl } from "./urls";

export interface PaletteItem {
  kind: "tab" | "saved" | "favorite";
  id: string;
  title: string;
  url: string;
  hint: string;
  spaceId?: string;
}

interface Source { id: string; title: string; url: string; hint: string; spaceId?: string }

const LIMIT = 8;

export function paletteItems(query: string, tabs: Source[], saved: Source[], favorites: Source[]): PaletteItem[] {
  const needle = searchNeedle(query);
  const pick = (kind: PaletteItem["kind"], list: Source[]) =>
    list.filter(item => matches(needle, `${item.title} ${item.url}`)).map(item => ({ kind, ...item }));
  const all = [...pick("tab", tabs), ...pick("favorite", favorites), ...pick("saved", saved)];
  const unique: PaletteItem[] = [];
  for (const item of all) if (!unique.some(other => sameUrl(other.url, item.url))) unique.push(item);
  return unique.slice(0, LIMIT);
}
