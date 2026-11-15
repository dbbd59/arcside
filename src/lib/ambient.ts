import type { CSSProperties } from "react";
import { INK_COLOR, luminance, type Ink } from "./contrast";
import type { AmbientMode, Space } from "./models";

export const ZONES = 16;

export type Rgb = [number, number, number];

export const MODE_TUNING: Record<AmbientMode, { vibrance: number; aura: number }> = {
  calm: { vibrance: 1.08, aura: 0.55 },
  vivid: { vibrance: 1.28, aura: 1 }
};

export const NEUTRAL_ACCENT = "#8a8a99";

const AURA_AT = { top: 0.18, bottom: 0.82, mid: 0.4 };
const KERNEL = [1, 2, 3, 2, 1];
const FLATTEN = 0.06;
const MAX_TINT = 0.55;
const GRAY_CHROMA = 0.3;
const TINT_FROM_LUMA = 0.03;
const TINT_FULL_LUMA = 0.3;

export const chromaOf = ([r, g, b]: Rgb) => (Math.max(r, g, b) - Math.min(r, g, b)) / 255;

export function hexToRgb(hex: string): Rgb | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function smoothZones(zones: Rgb[], vibrance: number): Rgb[] {
  const mean = [0, 1, 2].map(channel => zones.reduce((sum, zone) => sum + zone[channel], 0) / zones.length);
  const half = (KERNEL.length - 1) / 2;
  return zones.map((_, index) => {
    let weight = 0;
    const blended = [0, 0, 0];
    KERNEL.forEach((k, offset) => {
      const source = zones[Math.min(zones.length - 1, Math.max(0, index + offset - half))];
      weight += k;
      for (let channel = 0; channel < 3; channel++) blended[channel] += source[channel] * k;
    });
    const flattened = blended.map((value, channel) => (value / weight) * (1 - FLATTEN) + mean[channel] * FLATTEN);
    const gray = (flattened[0] + flattened[1] + flattened[2]) / 3;
    return flattened.map(value => Math.min(255, Math.max(0, gray + (value - gray) * vibrance))) as Rgb;
  });
}

export function tintZones(zones: Rgb[], accent: Rgb | null): Rgb[] {
  if (!accent) return zones;
  return zones.map(zone => {
    const dim = Math.min(1, Math.max(0, (luminance(...zone) - TINT_FROM_LUMA) / (TINT_FULL_LUMA - TINT_FROM_LUMA)));
    const amount = MAX_TINT * Math.max(0, 1 - chromaOf(zone) / GRAY_CHROMA) * dim * dim * (3 - 2 * dim);
    return zone.map((value, channel) => value * (1 - amount) + accent[channel] * amount) as Rgb;
  });
}

export function rowsToZones(rows: number[][]): Rgb[] {
  return Array.from({ length: ZONES }, (_, zone) => {
    const from = Math.floor(zone * rows.length / ZONES);
    const to = Math.max(from + 1, Math.floor((zone + 1) * rows.length / ZONES));
    const group = rows.slice(from, to);
    return [0, 1, 2].map(channel => group.reduce((sum, row) => sum + row[channel], 0) / group.length) as Rgb;
  });
}

export function resolveAmbient(space: Space, enabled: boolean, mode: AmbientMode): { on: boolean; mode: AmbientMode } {
  if (space.ambient === "off") return { on: false, mode };
  if (space.ambient) return { on: true, mode: space.ambient };
  return { on: enabled, mode };
}

export const restingColor = (accent: string, ink: Ink) =>
  ink === "dark" ? `color-mix(in oklab, ${accent} 18%, #ececf4)` : `color-mix(in oklab, ${accent} 20%, #15151d)`;

export const blendColors = (from: string, to: string, progress: number) =>
  progress > 0 ? `color-mix(in oklab, ${from} ${Math.round((1 - progress) * 100)}%, ${to})` : from;

export function zoneVars(rgb: number[][], weight: number): Record<string, string> {
  const color = ([r, g, b]: number[], zone: number) => {
    const along = Math.round(zone / (ZONES - 1) * 100);
    const resting = `color-mix(in oklab, var(--resting) ${100 - along}%, var(--resting-end))`;
    return `color-mix(in oklab, rgb(${r.toFixed(1)} ${g.toFixed(1)} ${b.toFixed(1)}) ${weight.toFixed(1)}%, ${resting})`;
  };
  const zones = rgb.map(color);
  const at = (fraction: number) => zones[Math.round(fraction * (ZONES - 1))];
  return {
    ...Object.fromEntries(zones.map((value, zone) => [`--zone-${zone}`, value])),
    "--aura-top": at(AURA_AT.top),
    "--aura-bottom": at(AURA_AT.bottom),
    "--aura-mid": at(AURA_AT.mid)
  };
}

interface Ambient { accent: string; accent2: string; ink: Ink; mode: AmbientMode; spaceColor: boolean }

export function ambientStyle({ accent, accent2, ink, mode, spaceColor }: Ambient): CSSProperties {
  const stops = Array.from({ length: ZONES }, (_, zone) =>
    `${spaceColor ? `color-mix(in oklab, var(--space-accent) 4%, var(--zone-${zone}))` : `var(--zone-${zone})`} ${Math.round(zone / (ZONES - 1) * 100)}%`);
  return {
    "--space-accent": accent,
    "--resting": restingColor(spaceColor ? accent : NEUTRAL_ACCENT, ink),
    "--resting-end": restingColor(spaceColor ? accent2 : NEUTRAL_ACCENT, ink),
    "--ink": INK_COLOR[ink],
    "--aura": MODE_TUNING[mode].aura,
    "--foreground": "var(--ink)",
    "--muted-foreground": "color-mix(in oklab, var(--ink) 70%, transparent)",
    "--accent": "color-mix(in oklab, var(--ink) 12%, transparent)",
    "--accent-foreground": "var(--ink)",
    "--border": "color-mix(in oklab, var(--ink) 12%, transparent)",
    color: "var(--ink)",
    background: `linear-gradient(180deg, ${stops.join(", ")})`
  } as CSSProperties;
}
