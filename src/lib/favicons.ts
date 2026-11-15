import { bareHost, safeWebUrl } from "./urls";
import { keepLast } from "./utils";

const STORE_KEY = "arcsideFavicons";
const MAX_STORED = 400;
const MAX_ICON_BYTES = 40_000;
const FETCH_TIMEOUT_MS = 4000;
const FLUSH_DELAY_MS = 800;
const MEMORY_TTL_MS = 5 * 60_000;
const DEFAULT_PROBE = "https://arcside-missing-favicon.invalid/";

interface Entry { src: string | null; at: number }

const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<string | null>>();
const remembered = new Set<string>();
let stored: Promise<Record<string, string>> | undefined;
let defaultSignature: Promise<string> | undefined;
let flushTimer: ReturnType<typeof setTimeout> | undefined;

export function faviconHost(url?: string): string | null {
  if (!safeWebUrl(url)) return null;
  try { return bareHost(url!); } catch { return null; }
}

export function peekFavicon(host: string): string | null | undefined {
  const entry = memory.get(host);
  return entry && Date.now() - entry.at < MEMORY_TTL_MS ? entry.src : undefined;
}

const chromeFavicon = (pageUrl: string) => chrome.runtime.getURL(`_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=32`);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function signatureOf(image: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 8;
  const context = canvas.getContext("2d", { willReadFrequently: true })!;
  context.drawImage(image, 0, 0, 8, 8);
  return Array.from(context.getImageData(0, 0, 8, 8).data, value => value >> 4).join("");
}

async function isChromeDefault(image: HTMLImageElement): Promise<boolean> {
  defaultSignature ??= loadImage(chromeFavicon(DEFAULT_PROBE)).then(signatureOf, () => "");
  const known = await defaultSignature;
  return known !== "" && signatureOf(image) === known;
}

function loadStored(): Promise<Record<string, string>> {
  stored ??= chrome.storage.local.get(STORE_KEY).then(data => (data[STORE_KEY] ?? {}) as Record<string, string>, () => ({}));
  return stored;
}

async function persist(host: string, dataUrl: string) {
  const entries = await loadStored();
  delete entries[host];
  entries[host] = dataUrl;
  stored = Promise.resolve(keepLast(entries, MAX_STORED));
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    void stored?.then(value => chrome.storage.local.set({ [STORE_KEY]: value })).catch(console.error);
  }, FLUSH_DELAY_MS);
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchIcon(source: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(source, { signal: controller.signal, credentials: "omit" });
    const blob = await response.blob();
    if (!response.ok || !blob.type.startsWith("image/") || blob.size === 0 || blob.size > MAX_ICON_BYTES) return null;
    return await toDataUrl(blob);
  } catch { return null; }
  finally { clearTimeout(timer); }
}

export function resolveFavicon(pageUrl: string, fetchMissing: boolean): Promise<string | null> {
  const host = faviconHost(pageUrl);
  if (!host) return Promise.resolve(null);
  const fresh = peekFavicon(host);
  if (fresh !== undefined) return Promise.resolve(fresh);
  const running = inflight.get(host);
  if (running) return running;
  const task = (async () => {
    let result: string | null = null;
    try {
      const source = chromeFavicon(pageUrl);
      if (!(await isChromeDefault(await loadImage(source)))) result = source;
    } catch { /* not in Chrome's favicon cache */ }
    result ??= (await loadStored())[host] ?? null;
    if (!result && fetchMissing) {
      result = await fetchIcon(`${new URL(pageUrl).origin}/favicon.ico`);
      if (result) void persist(host, result);
    }
    memory.set(host, { src: result, at: Date.now() });
    return result;
  })().finally(() => inflight.delete(host));
  inflight.set(host, task);
  return task;
}

export async function rememberLiveFavicon(pageUrl: string, liveSrc: string) {
  const host = faviconHost(pageUrl);
  if (!host || remembered.has(`${host}|${liveSrc}`)) return;
  remembered.add(`${host}|${liveSrc}`);
  memory.set(host, { src: liveSrc, at: Date.now() });
  const dataUrl = liveSrc.startsWith("data:") ? liveSrc : await fetchIcon(liveSrc);
  if (dataUrl) { memory.set(host, { src: dataUrl, at: Date.now() }); void persist(host, dataUrl); }
}
