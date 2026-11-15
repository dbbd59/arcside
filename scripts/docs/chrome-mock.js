(() => {
  const SEED = window.__ARC_SEED__;
  const clone = value => JSON.parse(JSON.stringify(value));
  const event = () => {
    const listeners = new Set();
    return { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn), fire: (...args) => listeners.forEach(fn => fn(...args)) };
  };

  const area = (name, initial) => {
    const data = clone(initial);
    return {
      get: async keys => {
        if (keys == null) return clone(data);
        const list = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
        return Object.fromEntries(list.filter(key => key in data).map(key => [key, clone(data[key])]));
      },
      set: async items => {
        const changes = {};
        for (const [key, value] of Object.entries(items)) {
          changes[key] = { oldValue: data[key], newValue: clone(value) };
          data[key] = clone(value);
        }
        storageChanged.fire(changes, name);
      },
      remove: async key => {
        const changes = {};
        for (const name of [].concat(key)) { changes[name] = { oldValue: data[name] }; delete data[name]; }
        storageChanged.fire(changes, name);
      }
    };
  };
  const storageChanged = event();

  const tabs = clone(SEED.tabs).map((tab, index) => ({ windowId: 1, index, pinned: false, status: "complete", highlighted: tab.active, incognito: false, groupId: -1, ...tab }));
  const tabEvents = Object.fromEntries(["onCreated", "onUpdated", "onRemoved", "onMoved", "onActivated", "onAttached", "onDetached", "onReplaced"].map(name => [name, event()]));
  const tell = message => { try { parent !== window && parent.postMessage({ source: "arcside-mock", ...message }, "*"); } catch {} };
  let nextTabId = 1000;

  const activate = id => {
    tabs.forEach(tab => { tab.active = tab.id === id; tab.highlighted = tab.active; });
    const tab = tabs.find(item => item.id === id);
    tabEvents.onActivated.fire({ tabId: id, windowId: 1 });
    tell({ type: "activated", theme: tab?.theme, url: tab?.url, title: tab?.title });
  };

  const edgeColors = () => {
    try { return window.parent.__edge ?? window.__edge; } catch { return window.__edge; }
  };

  const bookmarkTree = [{ id: "0", title: "", children: [
    { id: "1", title: "Bookmarks bar", children: SEED.bookmarks.map((entry, index) => entry.children
      ? { id: `f${index}`, title: entry.title, children: entry.children.map((child, i) => ({ id: `b${index}-${i}`, title: child[0], url: child[1] })) }
      : { id: `b${index}`, title: entry[0], url: entry[1] }) },
    { id: "2", title: "Other bookmarks", children: [] }
  ] }];

  document.addEventListener("mousemove", move => tell({ type: "mouse", x: move.clientX, y: move.clientY }), true);
  setTimeout(() => { const first = tabs.find(tab => tab.active); if (first) tell({ type: "activated", theme: first.theme, url: first.url, title: first.title }); }, 0);

  window.chrome = {
    runtime: {
      id: "arcside-docs",
      getURL: path => `${location.origin}/${String(path).replace(/^\//, "")}`,
      onMessage: event(),
      sendMessage: async () => undefined,
      getContexts: async () => [],
      ContextType: { SIDE_PANEL: "SIDE_PANEL", OFFSCREEN_DOCUMENT: "OFFSCREEN_DOCUMENT" },
      onStartup: event()
    },
    storage: { local: area("local", SEED.local), session: area("session", SEED.session), onChanged: storageChanged },
    tabs: {
      ...tabEvents,
      TAB_ID_NONE: -1,
      query: async () => clone(tabs),
      get: async id => clone(tabs.find(tab => tab.id === id)),
      update: async (id, props = {}) => {
        const tab = tabs.find(item => item.id === id);
        if (!tab) return undefined;
        Object.assign(tab, props, { active: tab.active });
        if (props.active) activate(id);
        else tabEvents.onUpdated.fire(id, props, clone(tab));
        return clone(tab);
      },
      create: async props => {
        const tab = { id: nextTabId++, windowId: 1, index: tabs.length, active: Boolean(props.active), pinned: false, status: "complete", title: props.url ?? "New tab", url: props.url ?? "chrome://newtab/", theme: "paper" };
        tabs.push(tab);
        tabEvents.onCreated.fire(clone(tab));
        if (props.active) activate(tab.id);
        return clone(tab);
      },
      remove: async ids => { [].concat(ids).forEach(id => { const index = tabs.findIndex(tab => tab.id === id); if (index >= 0) tabs.splice(index, 1); tabEvents.onRemoved.fire(id, { windowId: 1 }); }); },
      move: async () => undefined,
      reload: async () => undefined,
      goBack: async () => undefined,
      goForward: async () => undefined,
      captureVisibleTab: async () => {
        const stops = edgeColors() ?? ["#444", "#222"];
        const canvas = document.createElement("canvas");
        canvas.width = 120; canvas.height = 480;
        const context = canvas.getContext("2d");
        const gradient = context.createLinearGradient(0, 0, 0, 480);
        stops.forEach((color, index) => gradient.addColorStop(index / (stops.length - 1), color));
        context.fillStyle = gradient;
        context.fillRect(0, 0, 120, 480);
        return canvas.toDataURL("image/jpeg", 0.9);
      }
    },
    windows: {
      WINDOW_ID_CURRENT: -2,
      getCurrent: async () => ({ id: 1, focused: true, type: "normal", width: 1440, height: 900, left: 0, top: 0 }),
      get: async () => ({ id: 1, focused: true, type: "normal", width: 1440, height: 900, left: 0, top: 0 }),
      create: async () => ({ id: 2 }),
      update: async () => ({ id: 1 }),
      onFocusChanged: event(),
      onRemoved: event()
    },
    bookmarks: {
      getTree: async () => clone(bookmarkTree),
      get: async () => [],
      onCreated: event(), onRemoved: event(), onChanged: event(), onMoved: event(), onChildrenReordered: event()
    },
    sessions: {
      getRecentlyClosed: async () => SEED.closed.map((entry, index) => ({ lastModified: 1, tab: { sessionId: `s${index}`, title: entry[0], url: entry[1], windowId: 1, index: 0, active: false, highlighted: false, pinned: false, incognito: false, groupId: -1 } })),
      restore: async () => ({}),
      onChanged: event()
    },
    sidePanel: { open: async () => undefined, setOptions: async () => undefined, setPanelBehavior: async () => undefined },
    search: { query: async () => undefined },
    scripting: { executeScript: async () => [] },
    commands: { onCommand: event() },
    action: { setBadgeText: async () => undefined },
    downloads: { download: async () => 1, show: () => undefined, search: async () => [{ id: 1 }] },
    offscreen: { createDocument: async () => undefined, Reason: { CLIPBOARD: "CLIPBOARD" } },
    alarms: { create: async () => undefined, get: async () => undefined, onAlarm: event() }
  };
})();
