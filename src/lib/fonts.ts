const SANS_FALLBACK = 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const FONTS = [
  { id: "inter", label: "Inter", stack: `"Inter Variable", ${SANS_FALLBACK}` },
  { id: "geist", label: "Geist", stack: `"Geist Variable", ${SANS_FALLBACK}` },
  { id: "dm-sans", label: "DM Sans", stack: `"DM Sans Variable", ${SANS_FALLBACK}` },
  { id: "jakarta", label: "Plus Jakarta", stack: `"Plus Jakarta Sans Variable", ${SANS_FALLBACK}` },
  { id: "mono", label: "JetBrains Mono", stack: '"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace' },
  { id: "system", label: "System", stack: SANS_FALLBACK }
] as const;

export type FontId = (typeof FONTS)[number]["id"];

export const DEFAULT_FONT: FontId = "inter";

export const fontStack = (id: FontId) => FONTS.find(font => font.id === id)!.stack;
export const isFontId = (value: unknown): value is FontId => FONTS.some(font => font.id === value);
