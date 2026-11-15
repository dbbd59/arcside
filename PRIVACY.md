# Privacy policy

_Last updated: November 15, 2026_

Arcside is a Chrome extension that organizes your tabs in the side panel. It is built to work entirely on your device.

## What Arcside stores

Arcside saves your Spaces, folders, saved links, Favorites, settings and an archive of inactive tabs in your browser, using `chrome.storage.local` and `chrome.storage.session`. This data never leaves your device. The developer cannot see it.

## What Arcside does not do

- It has no server, no account and no analytics.
- It does not collect, sell, share or transmit your browsing history, tabs, bookmarks or any personal data.
- It does not use remote code.

## Network requests

The only request Arcside can make is an optional one: for saved links whose site icon Chrome does not have, it asks the site for `/favicon.ico` once and keeps the result locally. You can turn this off in Settings.

## How Arcside uses its permissions

- **Tabs, sessions and bookmarks** are read and changed only to show and organize them in the sidebar.
- **Access to web pages** is used to read a few background colors from the left edge of the page you are viewing (for the ambient color effect), to show missing site icons and to display the in-page command palette. Arcside does not read, store or send the content of pages.
- **Downloads** is used only to save your backup files to your Downloads folder.

## Backups

Backups are plain JSON files saved on your computer when you ask for one, or once a day if you leave the daily backup on. Arcside does not upload them anywhere.

## Contact

Questions or concerns: open an issue at https://github.com/dbbd59/arcside/issues.
