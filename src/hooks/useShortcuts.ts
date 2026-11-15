import { useEffect, useRef } from "react";

interface Shortcuts {
  undo: () => void;
  openPalette: () => void;
  focusSearch: () => void;
  blurSearch: () => void;
  stepSpace: (step: number) => void;
}

const typing = (target: EventTarget | null) => Boolean((target as HTMLElement).closest("input, textarea, [contenteditable]"));

export function useShortcuts(shortcuts: Shortcuts) {
  const latest = useRef(shortcuts);
  latest.current = shortcuts;

  useEffect(() => {
    const onKeydown = (event: KeyboardEvent) => {
      const { undo, openPalette, focusSearch, blurSearch, stepSpace } = latest.current;
      const command = event.metaKey || event.ctrlKey;
      if (command && !event.shiftKey && event.key.toLowerCase() === "z" && !typing(event.target)) { event.preventDefault(); undo(); }
      if (event.ctrlKey && event.altKey && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
        event.preventDefault();
        stepSpace(event.key === "ArrowRight" ? 1 : -1);
      }
      if (command && event.key.toLowerCase() === "k") { event.preventDefault(); openPalette(); }
      if (event.key === "/" && !typing(event.target)) { event.preventDefault(); focusSearch(); }
      if (event.key === "Escape") blurSearch();
    };
    document.addEventListener("keydown", onKeydown);
    return () => document.removeEventListener("keydown", onKeydown);
  }, []);
}
