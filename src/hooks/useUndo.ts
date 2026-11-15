import { useCallback, useRef, useState } from "react";

export interface Toast { text: string; error?: boolean; action?: { label: string; run: () => void } }

const LIMIT = 20;

export function useUndo() {
  const [toast, setToast] = useState<Toast | null>(null);
  const stack = useRef<{ label: string; revert: () => Promise<void> }[]>([]);

  const onError = useCallback((error: unknown) =>
    setToast({ text: error instanceof Error ? error.message : String(error), error: true }), []);
  const run = useCallback((action: Promise<unknown>) => { action.catch(onError); }, [onError]);

  const undo = async () => {
    const entry = stack.current.pop();
    if (!entry) { setToast({ text: "Nothing to undo" }); return; }
    await entry.revert();
    setToast({ text: `Undone: ${entry.label}` });
  };

  const remember = (label: string, revert: () => Promise<void>) => {
    stack.current = [...stack.current.slice(-(LIMIT - 1)), { label, revert }];
    setToast({ text: label, action: { label: "Undo", run: () => run(undo()) } });
  };

  return { toast, setToast, onError, run, remember, undo };
}
