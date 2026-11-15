import type { RuntimeMessage } from "./lib/messages";
import type { PaletteItem } from "./lib/palette-search";

const HOST_ID = "arcside-palette";
const DEBOUNCE_MS = 60;

const STYLE = `
  .backdrop { position: fixed; inset: 0; background: rgba(8, 8, 14, 0.45); backdrop-filter: blur(3px); display: flex; justify-content: center; align-items: flex-start; padding-top: 14vh; font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .box { width: min(560px, calc(100vw - 32px)); background: #1d1c28; color: #f4f2fa; border: 1px solid rgba(255,255,255,.12); border-radius: 14px; box-shadow: 0 24px 70px rgba(0,0,0,.55); overflow: hidden; }
  input { width: 100%; box-sizing: border-box; padding: 15px 18px; font-size: 16px; color: inherit; background: transparent; border: 0; border-bottom: 1px solid rgba(255,255,255,.1); outline: none; }
  input::placeholder { color: #8f8ba3; }
  ul { list-style: none; margin: 0; padding: 6px; max-height: 50vh; overflow: auto; }
  li { display: flex; align-items: center; gap: 12px; padding: 9px 12px; border-radius: 9px; cursor: pointer; }
  li[aria-selected="true"] { background: rgba(255,255,255,.12); }
  img { width: 18px; height: 18px; border-radius: 4px; flex: none; }
  .text { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .title { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .url { font-size: 11.5px; color: #9a96ac; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .hint { font-size: 11px; color: #9a96ac; flex: none; }
  .empty { padding: 14px 18px; font-size: 13px; color: #9a96ac; }
`;

const existing = document.getElementById(HOST_ID);
if (existing) {
  existing.remove();
} else {
  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText = "all: initial; position: fixed; inset: 0; z-index: 2147483647;";
  const root = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = STYLE;
  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  const box = document.createElement("div");
  box.className = "box";
  const input = document.createElement("input");
  input.placeholder = "Jump to a tab or saved link…";
  input.setAttribute("aria-label", "Search tabs and saved links");
  const list = document.createElement("ul");
  list.setAttribute("role", "listbox");
  box.append(input, list);
  backdrop.append(box);
  root.append(style, backdrop);

  let items: PaletteItem[] = [];
  let selected = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const close = () => host.remove();
  const send = <T>(message: RuntimeMessage): Promise<T> => chrome.runtime.sendMessage(message);

  const paintSelection = () => list.querySelectorAll("li").forEach((row, index) => {
    row.setAttribute("aria-selected", String(index === selected));
    if (index === selected) row.scrollIntoView({ block: "nearest" });
  });

  const choose = (item: PaletteItem) => { close(); void send({ type: "palette-open", item }); };

  const render = () => {
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "empty";
      empty.textContent = "No results";
      list.append(empty);
      return;
    }
    items.forEach((item, index) => {
      const row = document.createElement("li");
      row.setAttribute("role", "option");
      const icon = document.createElement("img");
      icon.alt = "";
      icon.src = `${chrome.runtime.getURL("_favicon/")}?pageUrl=${encodeURIComponent(item.url)}&size=32`;
      const text = document.createElement("div");
      text.className = "text";
      const title = document.createElement("span");
      title.className = "title";
      title.textContent = item.title || item.url;
      const url = document.createElement("span");
      url.className = "url";
      url.textContent = item.url;
      text.append(title, url);
      const hint = document.createElement("span");
      hint.className = "hint";
      hint.textContent = item.hint;
      row.append(icon, text, hint);
      row.addEventListener("mousemove", () => { selected = index; paintSelection(); });
      row.addEventListener("click", () => choose(item));
      list.append(row);
    });
    paintSelection();
  };

  const search = async () => {
    items = (await send<PaletteItem[]>({ type: "palette-query", query: input.value })) ?? [];
    selected = 0;
    render();
  };

  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => void search(), DEBOUNCE_MS); });
  input.addEventListener("keydown", event => {
    event.stopPropagation();
    if (event.key === "Escape") close();
    else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (items.length) { selected = (selected + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length; paintSelection(); }
    } else if (event.key === "Enter" && items[selected]) { event.preventDefault(); choose(items[selected]); }
  });
  backdrop.addEventListener("mousedown", event => { if (event.target === backdrop) close(); });
  for (const type of ["keyup", "keypress"] as const) input.addEventListener(type, event => event.stopPropagation());

  document.documentElement.append(host);
  input.focus();
  void search();
}
