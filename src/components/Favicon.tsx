import { createContext, useContext, useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import { faviconHost, peekFavicon, rememberLiveFavicon, resolveFavicon } from "@/lib/favicons";

function hueOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}

const usable = (src?: string) => Boolean(src && /^(https?:|data:)/.test(src));

export const FetchMissingFavicons = createContext(true);

interface Props { url?: string; custom?: string; size?: number; loading?: boolean }

export function Favicon({ url, custom, size = 16, loading = false }: Props) {
  const fetchMissing = useContext(FetchMissingFavicons);
  const host = faviconHost(url);
  const [resolved, setResolved] = useState<string | null | undefined>(() => (host ? peekFavicon(host) : null));
  const [failedLive, setFailedLive] = useState<string>();
  const live = usable(custom) && custom !== failedLive ? custom : undefined;

  useEffect(() => {
    if (!host || !url) { setResolved(null); return; }
    let alive = true;
    resolveFavicon(url, fetchMissing).then(src => { if (alive) setResolved(src); });
    return () => { alive = false; };
  }, [host, url, fetchMissing]);

  useEffect(() => {
    if (live && url) void rememberLiveFavicon(url, live);
  }, [live, url]);

  const src = live ?? resolved;
  const icon = src
    ? <img className="block shrink-0 rounded object-contain" width={size} height={size} src={src} alt=""
        onError={() => { if (live) setFailedLive(live); else setResolved(null); }} />
    : host
      ? <span aria-hidden="true" className="grid shrink-0 place-items-center rounded font-semibold text-white uppercase"
          style={{ width: size, height: size, fontSize: size * 0.6, background: `hsl(${hueOf(host)} 55% 42%)` }}>{host[0]}</span>
      : <Globe2 size={size} className="text-muted-foreground" aria-hidden="true" />;
  if (!loading) return icon;
  return <span className="relative grid place-items-center">
    {icon}
    <span className="pointer-events-none absolute -inset-[3px] animate-spin rounded-full border-2 border-white/20 border-t-white" />
  </span>;
}
