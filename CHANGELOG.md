# Changelog

All notable changes to Arcside are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.0.3] - 2026-11-15

### Added

- **Brand identity.** New logo, icon, banner and Web Store artwork in a synthwave style. The sidebar, dialogs and new tab use the same palette, and new installs start with a pink-to-orange Personal Space. New "Synthwave" and "Neon" gradient presets.

### Fixed

- **Fonts now apply.** Chrome injects its own `body` font into extension pages, which overrode the font you picked, so every font looked like the system one. The rule now wins, and only the selected font is downloaded.

## [0.0.2] - 2026-11-15

### Changed

- **Smaller package.** Fonts ship only their Latin subset (480 KB down to 178 KB), and the font you picked is the only one downloaded, loaded when the panel opens. Inter is the default, and the font buttons in Settings no longer preview each family.
- **Faster start.** Settings, the command palette, the Space and folder dialogs, the bookmark library, History and the backup preview load on demand. The panel's own script is about 40% smaller.

## [0.0.1] - 2026-11-15

First public release.

### Added

- **Spaces.** Workspaces with a name, an emoji and a solid color or a custom gradient (color picker, eight presets, swap). Switch by click, two-finger swipe with live preview, `Ctrl+Alt+←/→` or by dragging a tab onto a Space.
- **Saved tabs and folders.** Permanent tabs per Space in nested folders, with colors, drag-and-drop reordering, "Move to…" and "Open all".
- **Favorites, Today and History.** A tile grid per Space, the unsaved tabs of the active Space with *Clear* and *Duplicates*, recently closed tabs and an automatic archive of inactive tabs.
- **Search and command palette.** Search in the panel with `/`, a palette with `Cmd+K`, and the same palette over any web page with `Cmd+Shift+K`.
- **Ambient color.** The sidebar follows the colors along the left edge of the active page in 16 smoothly animated zones with a soft aura. Solid-color pages are read from the page, everything else from a local screenshot. Calm and Vivid modes, intensity, a per-Space override and an optional mix of the Space color.
- **Backups.** Export everything or a single Space as JSON. Import shows a preview and lets you merge or replace, with undo. Daily automatic backup, back up now and show in folder.
- **Bookmarks.** Import from HTML with folders and export HTML per Space.
- **New tab page.** Greeting, clock, search, Favorites, saved links and a button to open or close the sidebar.
- **Polish.** In-app confirmation dialogs, toasts with a progress bar, undo with `Cmd+Z`, bundled fonts, keyboard navigation and reduced-motion support.

[Unreleased]: https://github.com/dbbd59/arcside/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/dbbd59/arcside/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/dbbd59/arcside/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/dbbd59/arcside/releases/tag/v0.0.1
