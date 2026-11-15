import { useEffect, useLayoutEffect, useRef, type ReactNode, type RefObject, type WheelEventHandler } from "react";
import { ambientStyle, ZONES, zoneVars } from "@/lib/ambient";
import type { Ink } from "@/lib/contrast";
import { ensureFont, fontStack, type FontId } from "@/lib/fonts";
import type { AmbientMode } from "@/lib/models";
import { cn } from "@/lib/utils";

const SMOOTH_MS = 300;
const SETTLED = 0.35;

const parseRgb = (color: string) => (color.match(/\d+/g) ?? [0, 0, 0]).slice(0, 3).map(Number);

function useAmbientZones(ref: RefObject<HTMLElement | null>, colors: string[] | null, intensity: number) {
  const current = useRef({ rgb: Array.from({ length: ZONES }, () => [128, 128, 128]), weight: 0, seeded: false, frame: 0 });

  useLayoutEffect(() => {
    const state = current.current;
    const goal = colors?.map(parseRgb) ?? null;
    const goalWeight = goal ? intensity : 0;
    if (goal && !state.seeded) { state.rgb = goal.map(color => [...color]); state.seeded = true; }
    const instant = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const write = () => {
      const element = ref.current;
      if (!element) return;
      for (const [name, value] of Object.entries(zoneVars(state.rgb, state.weight))) element.style.setProperty(name, value);
    };
    write();
    cancelAnimationFrame(state.frame);
    let last = performance.now();
    const step = (now: number) => {
      const k = instant ? 1 : 1 - Math.exp(-(now - last) / SMOOTH_MS);
      last = now;
      let moving = Math.abs(goalWeight - state.weight) > SETTLED;
      state.weight += (goalWeight - state.weight) * k;
      if (goal) state.rgb.forEach((color, zone) => color.forEach((value, channel) => {
        if (Math.abs(goal[zone][channel] - value) > SETTLED) moving = true;
        color[channel] = value + (goal[zone][channel] - value) * k;
      }));
      if (!moving) {
        state.weight = goalWeight;
        if (goal) state.rgb = goal.map(color => [...color]);
      }
      write();
      if (moving) state.frame = requestAnimationFrame(step);
    };
    state.frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(state.frame);
  }, [colors, intensity, ref]);
}

interface Props {
  accent: string;
  accent2: string;
  ink: Ink;
  colors: string[] | null;
  intensity: number;
  mode: AmbientMode;
  spaceColor: boolean;
  font?: FontId;
  className?: string;
  onWheel?: WheelEventHandler<HTMLDivElement>;
  children: ReactNode;
}

export function PageShell({ accent, accent2, ink, colors, intensity, mode, spaceColor, font, className, onWheel, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useAmbientZones(ref, colors, intensity);
  useEffect(() => {
    if (!font) return;
    document.documentElement.style.setProperty("--arcside-font", fontStack(font));
    ensureFont(font).catch(error => console.error(error));
  }, [font]);
  return <div ref={ref} data-ambient={mode} className={cn("space-bg relative isolate", className)} onWheel={onWheel}
    style={ambientStyle({ accent, accent2, ink, mode, spaceColor })}>{children}</div>;
}
