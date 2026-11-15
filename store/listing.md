# Chrome Web Store listing

Copy for the developer dashboard. Screenshots are in this folder (1280×800), `promo-tile-440x280.png` is the small promo tile and `marquee-1400x560.jpg` is the marquee promo image.

## Basics

- **Name:** Arcside
- **Category:** Productivity
- **Language:** English
- **Summary (max 132 characters):** A vertical sidebar for Chrome: Spaces, folders, favorites and a command bar, tinted by the page you're on.
- **Privacy policy URL:** https://github.com/dbbd59/arcside/blob/main/PRIVACY.md
- **Support URL:** https://github.com/dbbd59/arcside/issues
- **Homepage URL:** https://github.com/dbbd59/arcside

## Description

Arcside brings an Arc-style sidebar to the browser you already use. It lives in Chrome's native side panel, so you keep your extensions, your profile and your sync.

SPACES
Split work, personal life and side projects into Spaces. Each Space has its own tabs, folders, saved links and Favorites, a name, an emoji and a solid color or a custom gradient. Switch with a click, a two-finger swipe, a shortcut or by dragging a tab onto a Space.

FOLDERS AND FAVORITES
Pin the pages you return to into nested folders, keep a tile grid of Favorites per Space, and let everything else live under Today, ready to clear in one click.

AMBIENT COLOR
The sidebar picks up the colors along the left edge of the page you're viewing, in smoothly animated zones. Choose Calm or Vivid, tune the intensity or turn it off per Space.

COMMAND PALETTE
Press Cmd+K to search open tabs and saved links and run commands. Press Cmd+Shift+K to open the same palette over any web page.

BACKUPS YOU CAN TRUST
Export everything or a single Space. Import shows a preview and lets you merge or replace, with undo. A daily automatic backup is saved to your Downloads folder.

PRIVATE BY DESIGN
No account, no server, no analytics. Your data stays in your browser.

## Single purpose

Organize browser tabs, bookmarks and workspaces in a vertical sidebar in Chrome's side panel.

## Permission justifications

- **sidePanel:** Shows the sidebar, which is the extension's main interface.
- **tabs:** Lists, activates, moves and closes tabs shown in the sidebar and assigns them to Spaces.
- **sessions:** Restores recently closed tabs from the History view.
- **bookmarks:** Powers the bookmark library and the HTML import and export.
- **storage:** Saves Spaces, folders, saved links, Favorites and settings locally.
- **favicon:** Displays site icons from Chrome's own cache.
- **alarms:** Schedules the inactive-tab archive and the daily backup.
- **downloads:** Saves backup files to the Downloads folder and reveals the latest one.
- **offscreen, clipboardWrite:** Copies the current tab's link to the clipboard.
- **scripting:** Opens the command palette over the current web page.
- **search:** Runs the search typed on the new tab page.
- **Host access (all sites) and content script:** Reads a few background colors from the left edge of the page for the ambient color effect, fetches missing site icons and shows the in-page command palette. No page content is read, stored or transmitted.

## Data usage disclosures

- Does the extension collect user data? **No.** Everything stays on the device.
- Does it use remote code? **No.**
- It does not sell data, use it for unrelated purposes or use it to determine creditworthiness.
