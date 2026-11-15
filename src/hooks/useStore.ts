import { useEffect, useState } from "react";
import type { Store } from "@/lib/models";

export function useStore<T>(store: Store<T>, onError: (error: unknown) => void) {
  const [value, setValue] = useState(() => store.parse(undefined));
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let alive = true;
    const unsubscribe = store.subscribe(setValue);
    store.read().then(next => {
      if (alive) { setValue(next); setLoaded(true); }
    }).catch(onError);
    return () => { alive = false; unsubscribe(); };
  }, [store, onError]);
  return [value, loaded] as const;
}
