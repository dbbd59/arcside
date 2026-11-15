import { safeWebUrl, urlKey } from "./urls";
import { keepLast } from "./utils";

export type UrlSpaces = Record<string, string>;

export const MAX_URL_SPACES = 1000;

export function mergeUrlSpaces(current: UrlSpaces, tabs: { url?: string; spaceId?: string }[]): UrlSpaces {
  const next = { ...current };
  for (const { url, spaceId } of tabs) {
    if (!spaceId || !safeWebUrl(url)) continue;
    const key = urlKey(url!);
    delete next[key];
    next[key] = spaceId;
  }
  return keepLast(next, MAX_URL_SPACES);
}

export const spaceForUrl = (map: UrlSpaces, url: string | undefined, validSpaceIds: string[]): string | undefined => {
  const spaceId = safeWebUrl(url) ? map[urlKey(url!)] : undefined;
  return spaceId && validSpaceIds.includes(spaceId) ? spaceId : undefined;
};
