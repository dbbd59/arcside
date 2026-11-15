export function safeWebUrl(url?: string): boolean {
  return Boolean(url && /^https?:\/\//i.test(url));
}

export function bareHost(url: string): string {
  return new URL(url).host.replace(/^www\./, "");
}

export function hostname(url?: string): string {
  try { return bareHost(url ?? ""); }
  catch { return url?.replace(/^\w+:\/\//, "") || "New tab"; }
}

export function urlKey(url: string): string {
  try {
    const parsed = new URL(url);
    return `${bareHost(url)}${parsed.pathname.replace(/\/+$/, "")}${parsed.search}`;
  } catch { return url; }
}

export function sameUrl(a?: string, b?: string): boolean {
  return Boolean(a && b) && urlKey(a!) === urlKey(b!);
}
