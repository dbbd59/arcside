const SANS_FALLBACK = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface FontOption {
  id: string;
  label: string;
  family?: string;
  weight?: string;
  fallback: string;
  file?: () => Promise<{ default: string }>;
}

export const FONTS = [
  { id: "inter", label: "Inter", family: "Inter Variable", weight: "100 900", fallback: SANS_FALLBACK, file: () => import("@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url") },
  { id: "geist", label: "Geist", family: "Geist Variable", weight: "100 900", fallback: SANS_FALLBACK, file: () => import("@fontsource-variable/geist/files/geist-latin-wght-normal.woff2?url") },
  { id: "dm-sans", label: "DM Sans", family: "DM Sans Variable", weight: "100 1000", fallback: SANS_FALLBACK, file: () => import("@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?url") },
  { id: "jakarta", label: "Plus Jakarta", family: "Plus Jakarta Sans Variable", weight: "200 800", fallback: SANS_FALLBACK, file: () => import("@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2?url") },
  { id: "mono", label: "JetBrains Mono", family: "JetBrains Mono Variable", weight: "100 800", fallback: "ui-monospace, SFMono-Regular, Menlo, monospace", file: () => import("@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2?url") },
  { id: "system", label: "System", fallback: SANS_FALLBACK }
] as const satisfies readonly FontOption[];

export type FontId = (typeof FONTS)[number]["id"];

export const DEFAULT_FONT: FontId = "inter";

const optionOf = (id: FontId): FontOption => FONTS.find(font => font.id === id)!;

export const fontStack = (id: FontId) => {
  const { family, fallback } = optionOf(id);
  return family ? `"${family}", ${fallback}` : fallback;
};

export const isFontId = (value: unknown): value is FontId => FONTS.some(font => font.id === value);

const loaded = new Set<FontId>();

export async function ensureFont(id: FontId) {
  const { family, weight, file } = optionOf(id);
  if (!family || !file || loaded.has(id)) return;
  loaded.add(id);
  try {
    const face = new FontFace(family, `url(${(await file()).default})`, { weight, display: "swap" });
    document.fonts.add(await face.load());
  } catch (error) {
    loaded.delete(id);
    throw error;
  }
}
