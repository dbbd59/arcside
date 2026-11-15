# Arcside

**The vertical sidebar Chrome never shipped.** Spaces, folders, favorites and a command bar, built into Chrome's own side panel. No new browser, no account, no tracking.

Love the way Arc organizes tabs, but need to stay on Chrome? Arcside brings that workflow to the browser you already use, with your extensions, your profile and your sync.

## Why Arcside

- **Stay on Chrome.** It's a Manifest V3 extension that lives in the native side panel. Nothing to migrate.
- **Your tabs, finally organized.** Split work, personal and side projects into Spaces, then pin what matters into nested folders.
- **Fast by design.** Keyboard-first, instant search, a command palette on any page.
- **Private by default.** Everything stays in your browser. Arcside has no server and sends no data anywhere.

## Features

### Organize

- **Spaces.** Workspaces with a name, an emoji and a solid color or a custom gradient (color picker, 8 presets, swap). Switch with a click, a two-finger swipe (with live preview), `Ctrl+Alt+←/→`, or by dragging a tab onto a Space. Switching returns you to the last tab you used there and reuses an empty tab if the Space has none.
- **Saved tabs and folders.** Permanent tabs per Space, in nested folders with colors and drag-and-drop reordering, plus "Move to…" and "Open all". Click a saved tab to open or reactivate it. Closing it never deletes it. Folders remember whether they were open, and a collapsed folder keeps its open pages visible.
- **Favorites.** One tile grid per Space with its own title and URL, independent of Chrome bookmarks. A tab bound to a tile stays out of Today.
- **Today.** The unsaved tabs of the active Space, with one-click Clear and Duplicates. New tabs land in the active Space of the window, and after a Chrome restart they return to the Space they were in (matched by URL).

### Move fast

- **Search and command bar.** Search in the panel with `/` and press `Enter` to open the first result, or hit `Cmd+K` for the palette with commands.
- **Palette on any page.** `Cmd+Shift+K` opens a palette over any web page to jump to tabs, Favorites and saved links.
- **Undo.** `Cmd+Z` reverts removed Favorites and saved tabs, deleted folders, closed tabs and backup imports.
- **Preview.** `Alt+click` a link to open it in a popup window.
- **New tab page.** A clean page with search, plus the Favorites and saved tabs of the active Space.

### Make it yours

- **Ambient.** The panel background follows the colors on the left edge of the active page, in 16 smoothly animated zones with a soft drifting aura. Solid-color pages are read straight from the page, everything else from a local screenshot. Pick **Calm** or **Vivid**, tune the intensity, override it per Space, and optionally mix in the Space color (off by default). Text contrast adapts automatically.
- **History.** Recently closed tabs, plus an automatic archive of inactive unsaved tabs (12 h by default).
- **Interface.** Bundled fonts (Inter, Geist, DM Sans, Plus Jakarta Sans, JetBrains Mono, System), full keyboard navigation and reduced-motion support.

### Own your data

- **Import and export.** Import bookmarks from HTML with folders. Export HTML per Space, with Favorites in a dedicated folder that the importer recognizes.
- **Backups.** Export everything or just one Space as JSON. Import shows a preview first (Spaces, folders, links, Favorites, export date, skipped entries), then lets you **merge** into what you have or **replace** it. Both are undoable with `Cmd+Z`.
- **Automatic backup.** A daily copy goes to `Downloads/Arcside backups/` (7 rotating files, never written on empty data). Back up on demand or reveal the latest file from Settings.

## Install

Requires **Bun** and Chrome **116+**.

```bash
bun install
bun run build        # outputs dist/
```

1. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked** and pick the `dist/` folder.
2. Pin the Arcside icon and click it to open the side panel.

To share it: `bun run package` creates `release/arcside-chrome-<version>.zip` and `release/INSTALL.txt`.

> The extension ID depends on the path of the loaded folder. Loading it from another path makes Chrome treat it as a new extension, and your data doesn't follow. Use Settings → Backup → Export JSON, then Import.

## Shortcuts

| Key | Action |
|---|---|
| `Cmd+Shift+D` | Open the panel |
| `Cmd+Shift+C` | Copy the active tab's link |
| `Cmd+Shift+K` | Palette over the page |
| `Cmd+K` | Palette in the panel |
| `Cmd+Z` | Undo the last action |
| `Ctrl+Alt+←/→` | Previous/next Space |
| `/` | Search |

Change them at `chrome://extensions/shortcuts`. Chrome can't reopen the side panel on its own after a restart: it needs a gesture (an icon click or a shortcut).

## Privacy

Arcside has no server, no account and no analytics. The only network request it can make is an optional `/favicon.ico` fetch from the sites of your saved links, which you can turn off.

| What | Where | Lifetime |
|---|---|---|
| Spaces, folders, saved tabs, Favorites, settings, archive | `chrome.storage.local` (`arcsidePreferences`) | Chrome profile |
| Favicon cache, per-URL Space memory | `chrome.storage.local` | Chrome profile |
| Tab → Space, tabs bound to saved items, active Space per window | `chrome.storage.session` | Browser session |
| Chrome bookmarks | Chrome API | Managed by Chrome |

### Permissions

`sidePanel`, `tabs`, `bookmarks`, `storage`, `favicon`, `sessions` (closed tabs), `alarms` (archive and backups), `downloads` (daily backup), `offscreen` and `clipboardWrite` (copy link), `scripting` (in-page palette), a content script on web pages (ambient color probe), `search` (new tab), and `host_permissions: <all_urls>` for the ambient screenshot, missing favicons and the in-page palette.

## Development

Built with React 19, TypeScript 7, Vite 8, Tailwind 4, shadcn/ui and Bun.

```bash
bun run build       # typecheck + build into dist/
bun run typecheck
bun run lint        # oxlint
bun test            # unit tests (bun:test)
bun run package     # distributable zip
```

```text
src/
├── App.tsx, newtab.tsx             # panel and new tab entry points
├── bootstrap.tsx                   # shared root: error boundary, tooltips, confirm dialogs
├── background.ts                   # service worker: session, archive, backups, palette, copy link
├── overlay.ts                      # in-page palette (standalone)
├── ambient-probe.ts                # content script: scroll signal and solid-color sampling
├── hooks/                          # useArcside + actions per area (tab, Space, library), store, undo
├── components/                     # UI (ui/ = shadcn)
└── lib/                            # models and stores, folders, selectors, preference ops,
                                    # bookmarks/HTML, urls, tabs, favicons, ambient, contrast, backup
```
