import { safeWebUrl, sameUrl } from "./urls";

interface ArchiveCandidate {
  id: number;
  url?: string;
  active?: boolean;
  audible?: boolean;
  pinned?: boolean;
}

interface ArchiveContext {
  now: number;
  maxAgeMs: number;
  lastActive: Record<string, number>;
  boundTabIds: Set<number>;
  protectedUrls: string[];
}

export function staleTabIds(tabs: ArchiveCandidate[], context: ArchiveContext): number[] {
  return tabs.filter(tab =>
    !tab.active && !tab.audible && !tab.pinned && safeWebUrl(tab.url) &&
    !context.boundTabIds.has(tab.id) &&
    !context.protectedUrls.some(url => sameUrl(url, tab.url)) &&
    context.now - (context.lastActive[tab.id] ?? context.now) > context.maxAgeMs
  ).map(tab => tab.id);
}
