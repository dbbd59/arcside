import type { RuntimeMessage } from "./lib/messages";

const GAP_MS = 250;
const ROWS = 32;
const SAMPLE_X = 3;
const OPAQUE = 0.98;
const BLOCKING_TAGS = new Set(["IMG", "VIDEO", "CANVAS", "SVG", "IFRAME", "EMBED", "OBJECT", "PICTURE"]);

type Rgba = [number, number, number, number];

let timer = 0;
let last = 0;

function parseColor(color: string): Rgba | null {
  const match = /^rgba?\(([^)]+)\)$/.exec(color);
  if (!match) return null;
  const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
  return parts.length >= 3 && parts.every(Number.isFinite) ? [parts[0], parts[1], parts[2], parts[3] ?? 1] : null;
}

function layerOf(element: Element, cache: Map<Element, Rgba | null | "skip">): Rgba | null | "skip" {
  const known = cache.get(element);
  if (known !== undefined) return known;
  let result: Rgba | null | "skip";
  if (BLOCKING_TAGS.has(element.tagName.toUpperCase())) result = null;
  else {
    const style = getComputedStyle(element);
    if (style.backgroundImage !== "none" || style.opacity !== "1" || style.filter !== "none" || style.mixBlendMode !== "normal") result = null;
    else {
      const color = parseColor(style.backgroundColor);
      result = !color ? null : color[3] === 0 ? "skip" : color;
    }
  }
  cache.set(element, result);
  return result;
}

function pointColor(y: number, cache: Map<Element, Rgba | null | "skip">): number[] | null {
  const layers: Rgba[] = [];
  for (const element of document.elementsFromPoint(SAMPLE_X, y)) {
    const layer = layerOf(element, cache);
    if (layer === null) return null;
    if (layer === "skip") continue;
    layers.push(layer);
    if (layer[3] >= OPAQUE) break;
  }
  if (!layers.length || layers[layers.length - 1][3] < OPAQUE) return null;
  const [base, ...above] = layers.reverse();
  return above.reduce<number[]>((mix, layer) => mix.map((value, channel) => value * (1 - layer[3]) + layer[channel] * layer[3]), base.slice(0, 3));
}

function sampleRows(): number[][] | null {
  const cache = new Map<Element, Rgba | null | "skip">();
  const rows: number[][] = [];
  for (let row = 0; row < ROWS; row++) {
    const color = pointColor((row + 0.5) / ROWS * innerHeight, cache);
    if (!color) return null;
    rows.push(color);
  }
  return rows;
}

const ping = () => {
  timer = 0;
  last = Date.now();
  if (document.visibilityState !== "visible") return;
  const message: RuntimeMessage = { type: "ambient-ping", rows: sampleRows() };
  try { void chrome.runtime.sendMessage(message).catch(() => {}); } catch {}
};

const schedule = () => {
  if (!timer) timer = window.setTimeout(ping, Math.max(0, GAP_MS - (Date.now() - last)));
};

addEventListener("scroll", schedule, { capture: true, passive: true });
addEventListener("resize", schedule, { passive: true });
