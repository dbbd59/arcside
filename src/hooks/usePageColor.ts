import { useEffect, useRef, useState } from "react";
import type { Tab } from "@/lib/tabs";
import { safeWebUrl } from "@/lib/urls";
import { chromaOf, hexToRgb, MODE_TUNING, rowsToZones, smoothZones, tintZones, ZONES, type Rgb } from "@/lib/ambient";
import { fitToInk, luminance, pickInk, type Ink } from "@/lib/contrast";
import type { AmbientMode } from "@/lib/models";
import type { RuntimeMessage } from "@/lib/messages";

const ROWS_PER_ZONE = 2;
const HEIGHT = ZONES * ROWS_PER_ZONE;
const BITMAP_WIDTH = 40;
const EDGE_COLUMNS = 4;
const FIRST_CAPTURE_MS = 120;
const FAST_MS = 500;
const IDLE_MS = 1500;
const IDLE_AFTER = 6;
const MIN_GAP_MS = 500;
const MAX_FAILURES = 3;
const DOM_TRUST_MS = 2000;

interface PageColors { colors: string[]; ink: Ink }

let context: OffscreenCanvasRenderingContext2D | undefined;
const edgeContext = () => (context ??= new OffscreenCanvas(EDGE_COLUMNS, HEIGHT).getContext("2d", { willReadFrequently: true })!);

function edgeZones(bitmap: ImageBitmap): Rgb[] {
  const canvas = edgeContext();
  canvas.drawImage(bitmap, 0, 0, EDGE_COLUMNS, HEIGHT, 0, 0, EDGE_COLUMNS, HEIGHT);
  const { data } = canvas.getImageData(0, 0, EDGE_COLUMNS, HEIGHT);
  return Array.from({ length: ZONES }, (_, zone) => {
    let r = 0, g = 0, b = 0, total = 0;
    for (let row = zone * ROWS_PER_ZONE; row < (zone + 1) * ROWS_PER_ZONE; row++) {
      for (let column = 0; column < EDGE_COLUMNS; column++) {
        const i = (row * EDGE_COLUMNS + column) * 4;
        const weight = (1 - (column / EDGE_COLUMNS) * 0.7) * (1 + chromaOf([data[i], data[i + 1], data[i + 2]]) * 1.5);
        r += data[i] * weight; g += data[i + 1] * weight; b += data[i + 2] * weight; total += weight;
      }
    }
    return [r / total, g / total, b / total] as Rgb;
  });
}

async function captureZones(windowId: number): Promise<Rgb[]> {
  const shot = await chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 20 });
  const bytes = Uint8Array.from(atob(shot.slice(shot.indexOf(",") + 1)), char => char.charCodeAt(0));
  const bitmap = await createImageBitmap(new Blob([bytes], { type: "image/jpeg" }),
    { resizeWidth: BITMAP_WIDTH, resizeHeight: HEIGHT, resizeQuality: "low" });
  try { return edgeZones(bitmap); } finally { bitmap.close(); }
}

export function usePageColors(windowId: number, tab: Tab | undefined, accent: string, mode: AmbientMode): PageColors | null {
  const [state, setState] = useState<PageColors | null>(null);
  const ink = useRef<Ink>("light");
  const tabId = tab?.id;
  const status = tab?.status;
  const url = tab?.url;

  useEffect(() => {
    if (tabId === undefined || !safeWebUrl(url)) { setState(null); return; }
    const accentRgb = hexToRgb(accent);
    const { vibrance } = MODE_TUNING[mode];
    let alive = true;
    let busy = false;
    let timer: ReturnType<typeof setTimeout>;
    let last = "";
    let steady = 0;
    let failures = 0;
    let lastShot = 0;
    let domUntil = 0;

    const apply = (raw: Rgb[]) => {
      const zones = tintZones(smoothZones(raw, vibrance), accentRgb);
      const average = zones.reduce((sum, [r, g, b]) => sum + luminance(r, g, b), 0) / zones.length;
      ink.current = pickInk(average, ink.current);
      const next: PageColors = { colors: zones.map(([r, g, b]) => fitToInk(r, g, b, ink.current)), ink: ink.current };
      const key = next.colors.join() + next.ink;
      const changed = key !== last;
      last = key;
      if (alive && changed) setState(next);
      return changed;
    };

    const schedule = () => { if (alive) timer = setTimeout(tick, steady >= IDLE_AFTER ? IDLE_MS : FAST_MS); };
    const tick = async () => {
      clearTimeout(timer);
      if (busy) return;
      busy = true;
      try {
        if (Date.now() < domUntil) { schedule(); return; }
        const wait = MIN_GAP_MS - (Date.now() - lastShot);
        if (wait > 0) { timer = setTimeout(tick, wait); return; }
        if (document.visibilityState !== "visible" || !(await chrome.windows.get(windowId)).focused) { schedule(); return; }
        lastShot = Date.now();
        steady = apply(await captureZones(windowId)) ? 0 : steady + 1;
        failures = 0;
      } catch {
        steady = IDLE_AFTER;
        failures++;
        if (alive && failures >= MAX_FAILURES) setState(null);
      } finally {
        busy = false;
      }
      schedule();
    };

    const onFocus = () => { steady = 0; void tick(); };
    const onMessage = (message: RuntimeMessage, sender: chrome.runtime.MessageSender) => {
      if (message.type !== "ambient-ping" || sender.tab?.id !== tabId) return;
      steady = 0;
      if (message.rows) { domUntil = Date.now() + DOM_TRUST_MS; apply(rowsToZones(message.rows)); }
      else void tick();
    };
    chrome.windows.onFocusChanged.addListener(onFocus);
    chrome.runtime.onMessage.addListener(onMessage);
    timer = setTimeout(tick, FIRST_CAPTURE_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
      chrome.windows.onFocusChanged.removeListener(onFocus);
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, [windowId, tabId, status, url, accent, mode]);

  return state;
}
