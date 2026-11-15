export type Ink = "light" | "dark";

export const INK_COLOR: Record<Ink, string> = { light: "#ffffff", dark: "#0b0b12" };

const INK_LUMINANCE: Record<Ink, number> = { light: 1, dark: 0.0033 };
const TARGET_CONTRAST = 5.6;
const SWITCH_AT = 0.19;
const HYSTERESIS = 0.04;

export function luminance(red: number, green: number, blue: number): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

export function contrast(a: number, b: number): number {
  const [high, low] = a > b ? [a, b] : [b, a];
  return (high + 0.05) / (low + 0.05);
}

export function pickInk(averageLuminance: number, previous: Ink): Ink {
  if (Math.abs(averageLuminance - SWITCH_AT) < HYSTERESIS) return previous;
  return averageLuminance > SWITCH_AT ? "dark" : "light";
}

function toHsl(red: number, green: number, blue: number): [number, number, number] {
  const r = red / 255, g = green / 255, b = blue / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const delta = max - min;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
  }
  return [((h * 60) + 360) % 360, s, l];
}

function fromHsl(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

export function fitToInk(red: number, green: number, blue: number, ink: Ink): string {
  const [h, s, l] = toHsl(red, green, blue);
  const passes = (lightness: number) => contrast(INK_LUMINANCE[ink], luminance(...fromHsl(h, s, lightness))) >= TARGET_CONTRAST;
  let lightness = l;
  if (!passes(lightness)) {
    let near = l;
    let far = ink === "light" ? 0.04 : 0.97;
    for (let i = 0; i < 14; i++) {
      const mid = (near + far) / 2;
      if (passes(mid)) far = mid; else near = mid;
    }
    lightness = far;
  }
  const [r, g, b] = fromHsl(h, s, lightness);
  return `rgb(${r} ${g} ${b})`;
}
