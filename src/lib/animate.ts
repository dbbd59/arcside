import autoAnimate from "@formkit/auto-animate";

export const EASE_SPRING = "cubic-bezier(0.22, 1, 0.36, 1)";
export const EASE_OVERSHOOT = "cubic-bezier(0.34, 1.56, 0.64, 1)";

const seen = new WeakSet<HTMLElement>();

export function animated(element: HTMLElement | null) {
  if (!element || seen.has(element)) return;
  seen.add(element);
  autoAnimate(element, { duration: 200, easing: EASE_SPRING });
}
