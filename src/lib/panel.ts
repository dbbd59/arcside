import { useEffect, useState } from "react";

const key = (windowId: number) => `arcsidePanel:${windowId}`;

export function trackPanel(windowId: number) {
  const remove = () => { void chrome.storage.session.remove(key(windowId)); };
  void chrome.storage.session.set({ [key(windowId)]: true });
  addEventListener("pagehide", remove);
  return () => { removeEventListener("pagehide", remove); remove(); };
}

export function usePanelOpen(windowId: number | undefined) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (windowId === undefined) return;
    const name = key(windowId);
    const refresh = () => { void chrome.storage.session.get(name).then(stored => setOpen(stored[name] === true)); };
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === "session" && name in changes) setOpen(changes[name].newValue === true);
    };
    refresh();
    chrome.storage.onChanged.addListener(onChange);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      chrome.storage.onChanged.removeListener(onChange);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [windowId]);
  return open;
}

export async function togglePanel(windowId: number, open: boolean) {
  if (!open) { await chrome.sidePanel.open({ windowId }); return; }
  try {
    const panel = chrome.sidePanel as { close?: (options: { windowId: number }) => Promise<void> };
    if (panel.close) await panel.close({ windowId });
    else {
      await chrome.sidePanel.setOptions({ enabled: false });
      await chrome.sidePanel.setOptions({ enabled: true, path: "sidepanel.html" });
    }
  } finally {
    await chrome.storage.session.remove(key(windowId));
  }
}
