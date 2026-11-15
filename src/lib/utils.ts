import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function keepLast<T>(entries: Record<string, T>, max: number): Record<string, T> {
  const keys = Object.keys(entries);
  return keys.length <= max ? entries : Object.fromEntries(keys.slice(keys.length - max).map(key => [key, entries[key]]));
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
