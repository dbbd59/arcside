import { useState } from "react";

export function useAttempt(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attempt = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await action(); onDone(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : String(failure)); }
    finally { setBusy(false); }
  };

  return { busy, error, attempt };
}
