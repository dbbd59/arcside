import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { FetchMissingFavicons, Favicon } from "@/components/Favicon";
import { useStore } from "@/hooks/useStore";
import { DEFAULT_SPACE_ID, preferencesStore, sessionStore } from "@/lib/models";
import { togglePanel, usePanelOpen } from "@/lib/panel";
import { hostname, safeWebUrl } from "@/lib/urls";
import { mount } from "./bootstrap";

const CLOCK_MS = 15_000;
const SAVED_LIMIT = 12;

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function greeting(date: Date) {
  const hour = date.getHours();
  return hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

function go(text: string) {
  const value = text.trim();
  if (!value) return;
  if (safeWebUrl(value)) location.href = value;
  else if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value)) location.href = `https://${value}`;
  else void chrome.search.query({ text: value, disposition: "CURRENT_TAB" });
}

function NewTab() {
  const onError = (error: unknown) => console.error(error);
  const [preferences, loaded] = useStore(preferencesStore, onError);
  const [session] = useStore(sessionStore, onError);
  const [windowId, setWindowId] = useState<number>();
  const [query, setQuery] = useState("");
  const panelOpen = usePanelOpen(windowId);
  const now = useClock();

  useEffect(() => {
    void chrome.windows.getCurrent().then(window => setWindowId(window.id));
  }, []);

  const space = preferences.spaces.find(item => item.id === (windowId === undefined ? undefined : session.activeSpaceByWindow[windowId]))
    ?? preferences.spaces.find(item => item.id === DEFAULT_SPACE_ID)!;
  const favorites = (preferences.favorites[space.id] ?? []).filter(item => item.url);
  const saved = preferences.saved.filter(item => item.spaceId === space.id).slice(0, SAVED_LIMIT);

  const chooseSpace = (spaceId: string) =>
    windowId === undefined ? undefined : sessionStore.update(current => ({ ...current, activeSpaceByWindow: { ...current.activeSpaceByWindow, [windowId]: spaceId } }));

  return <FetchMissingFavicons.Provider value={preferences.fetchFavicons}>
    <PageShell accent={space.color} accent2={space.color2 ?? space.color} ink="light" colors={null} intensity={100} mode="vivid" spaceColor font={loaded ? preferences.font : undefined}
      className="flex min-h-screen flex-col items-center px-6 pt-[13vh] pb-10">
      <button type="button" aria-label={panelOpen ? "Close Arcside" : "Open Arcside"} title={panelOpen ? "Close Arcside" : "Open Arcside"} disabled={windowId === undefined}
        onClick={() => { if (windowId !== undefined) void togglePanel(windowId, panelOpen).catch(error => console.error(error)); }}
        className="focus-ring fixed top-1/2 left-0 z-10 flex h-14 w-8 -translate-y-1/2 items-center justify-center rounded-r-xl bg-ink/15 text-ink/80 ring-1 ring-ink/10 backdrop-blur-md transition-[background-color,width,color] duration-200 ease-spring hover:w-10 hover:bg-ink/25 hover:text-ink">
        {panelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
      </button>
      <div className="stagger-in flex w-full max-w-xl flex-col items-center gap-7">
        <div className="text-center">
          <div className="text-[13px] font-medium tracking-wide text-ink/70">{greeting(now)}</div>
          <div className="mt-1 text-7xl leading-none font-semibold tracking-tight tabular-nums">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="mt-2.5 text-sm text-ink/70">{now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>

        <form className="group relative w-full" onSubmit={event => { event.preventDefault(); go(query); }}>
          <Search size={17} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink/70" />
          <input autoFocus value={query} onChange={event => setQuery(event.target.value)} aria-label="Search or enter address" placeholder="Search or enter address"
            className="focus-ring h-13 w-full rounded-2xl bg-ink/15 pr-14 pl-12 text-base text-ink shadow-lg ring-1 shadow-black/10 ring-ink/12 backdrop-blur-md transition-[background-color,box-shadow] duration-200 placeholder:text-ink/60 focus:bg-ink/22 focus:ring-ink/30" />
          <kbd className={`absolute top-1/2 right-4 -translate-y-1/2 rounded-md bg-ink/15 px-1.5 py-0.5 font-sans text-[11px] text-ink/75 transition-opacity ${query ? "opacity-100" : "opacity-0"}`}>↵</kbd>
        </form>

        <div role="tablist" aria-label="Spaces" className="flex flex-wrap justify-center gap-1.5">
          {preferences.spaces.map(item => <button key={item.id} role="tab" aria-selected={item.id === space.id} onClick={() => void chooseSpace(item.id)}
            className={`focus-ring rounded-full px-3.5 py-1.5 text-xs transition-[background-color,color,transform] duration-200 active:scale-95 ${item.id === space.id ? "bg-ink/25 text-ink shadow-sm ring-1 ring-ink/15" : "text-ink/70 hover:bg-ink/12 hover:text-ink"}`}>
            {item.emoji} {item.name}</button>)}
        </div>

        {favorites.length > 0 && <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(78px,1fr))] gap-2.5">
          {favorites.map(node => <a key={node.id} href={node.url} title={node.title || hostname(node.url)}
            className="focus-ring group/tile flex flex-col items-center gap-1.5 rounded-2xl bg-ink/12 px-2 py-3 ring-1 ring-ink/10 transition-[background-color,transform,box-shadow] duration-200 ease-spring hover:-translate-y-0.5 hover:bg-ink/22 hover:shadow-lg active:scale-95">
            <Favicon url={node.url} size={26} />
            <span className="w-full truncate text-center text-[11px] text-ink/80">{node.title || hostname(node.url)}</span></a>)}
        </div>}

        {saved.length > 0 && <section className="w-full">
          <h2 className="mb-1.5 px-3 text-xs font-medium text-ink/65">{space.emoji} {space.name}</h2>
          <div className="grid grid-cols-2 gap-1">
            {saved.map(item => <a key={item.id} href={item.url} title={item.url}
              className="focus-ring flex h-11 items-center gap-2.5 rounded-xl px-3 text-sm text-ink/90 transition-[background-color,transform] duration-150 hover:bg-ink/15 active:scale-[.98]">
              <Favicon url={item.url} size={16} /><span className="truncate">{item.title || hostname(item.url)}</span></a>)}
          </div>
        </section>}

      </div>
    </PageShell>
  </FetchMissingFavicons.Provider>;
}

mount(<NewTab />);
