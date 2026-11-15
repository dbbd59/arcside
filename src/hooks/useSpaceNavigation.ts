import { useRef, useState, type WheelEvent } from "react";
import type { Space } from "@/lib/models";
import { INITIAL_SWIPE, swipeStep, type SwipeState } from "@/lib/swipe";

const IDLE_MS = 140;
const MAX_SHIFT = 160;
const DRAG_RESISTANCE = 0.55;
const EDGE_RESISTANCE = 0.18;

interface Options { spaces: Space[]; activeId: string; threshold: number; select: (spaceId: string) => void }

export function useSpaceNavigation({ spaces, activeId, threshold, select }: Options) {
  const [direction, setDirection] = useState(0);
  const [offset, setOffset] = useState(0);
  const swipe = useRef<SwipeState>(INITIAL_SWIPE);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);

  const activeIndex = spaces.findIndex(space => space.id === activeId);
  const neighborOf = (step: number) => spaces[activeIndex + step];

  const choose = (spaceId: string) => {
    const to = spaces.findIndex(space => space.id === spaceId);
    if (to < 0 || to === activeIndex) return;
    setDirection(Math.sign(to - activeIndex));
    select(spaceId);
  };

  const step = (amount: number) => {
    const next = neighborOf(amount);
    if (next) choose(next.id);
  };

  const onWheel = (event: WheelEvent<HTMLElement>) => {
    const result = swipeStep(swipe.current, event.deltaX, event.deltaY, Date.now(), amount => Boolean(neighborOf(amount)), threshold);
    if (result.state === swipe.current) return;
    swipe.current = result.state;
    clearTimeout(idle.current);
    if (result.step) { setOffset(0); step(result.step); return; }
    setOffset(result.state.distance);
    idle.current = setTimeout(() => {
      swipe.current = { ...swipe.current, distance: 0 };
      setOffset(0);
    }, IDLE_MS);
  };

  const neighbor = neighborOf(Math.sign(offset));
  return {
    direction, choose, step, onWheel,
    swipe: {
      active: offset !== 0,
      neighbor,
      progress: neighbor ? Math.min(Math.abs(offset) / threshold, 1) : 0,
      shift: -Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, offset)) * (neighbor ? DRAG_RESISTANCE : EDGE_RESISTANCE)
    }
  };
}
