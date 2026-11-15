export const RECENTLY_CLOSED_LIMIT = 25;

export function downloadFile(name: string, type: string, content: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type }));
  link.download = name;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function openPopup(url: string, windowId: number) {
  const host = await chrome.windows.get(windowId);
  const hostWidth = host.width ?? 1200, hostHeight = host.height ?? 800;
  const width = Math.round(hostWidth * 0.7), height = Math.round(hostHeight * 0.8);
  await chrome.windows.create({
    url, type: "popup", width, height,
    left: (host.left ?? 0) + Math.round((hostWidth - width) / 2),
    top: (host.top ?? 0) + Math.round((hostHeight - height) / 2)
  });
}
