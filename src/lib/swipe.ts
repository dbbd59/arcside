export interface SwipeState {
  distance: number;
  last: number;
  lockUntil: number;
}

export const INITIAL_SWIPE: SwipeState = { distance: 0, last: 0, lockUntil: 0 };

const GAP_MS = 200;
const LOCK_MS = 700;

export function swipeStep(
  state: SwipeState, deltaX: number, deltaY: number, now: number, canStep: (step: number) => boolean,
  threshold: number
): { state: SwipeState; step: number } {
  if (Math.abs(deltaX) <= Math.abs(deltaY) || now < state.lockUntil) return { state, step: 0 };
  const distance = (now - state.last > GAP_MS ? 0 : state.distance) + deltaX;
  const direction = Math.sign(distance);
  if (Math.abs(distance) < threshold) return { state: { ...state, distance, last: now }, step: 0 };
  if (!canStep(direction)) return { state: { ...state, distance: direction * threshold, last: now }, step: 0 };
  return { state: { distance: 0, last: now, lockUntil: now + LOCK_MS }, step: direction };
}
