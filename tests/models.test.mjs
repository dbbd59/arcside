import { expect, test } from 'bun:test';
import { DEFAULT_SPACE_ID, omitKey, validPreferences, validSession, sessionWithoutSpace, withoutTab, withoutWindow } from '../src/lib/models.ts';
import { flattenFolders, folderPath, folderStats, folderSubtree, mergeRestored, moveFolder } from '../src/lib/folders.ts';
import { INITIAL_SWIPE, swipeStep } from '../src/lib/swipe.ts';
import { backupFilename, buildBackup, hasBackupContent, isBackupDue, parseBackup } from '../src/lib/backup.ts';
import { faviconHost } from '../src/lib/favicons.ts';
import { keepLast } from '../src/lib/utils.ts';
import { contrast, fitToInk, luminance, pickInk } from '../src/lib/contrast.ts';
import { importInto, insertBefore, mergeFavorites, placement, reorderBy, resolveLegacyFavorites, withFavorites, withoutFolder, withoutSpace } from '../src/lib/prefs-ops.ts';
import { paletteItems } from '../src/lib/palette-search.ts';
import { isBlankTab } from '../src/lib/tabs.ts';
import { MAX_URL_SPACES, mergeUrlSpaces, spaceForUrl } from '../src/lib/url-spaces.ts';
import { staleTabIds } from '../src/lib/archive.ts';
import { bookmarkMap, flattenBookmarks, matchBookmarks } from '../src/lib/bookmarks.ts';
import { countImported, exportBookmarksHtml, parseBookmarksHtml } from '../src/lib/bookmark-html.ts';
import { hostname, safeWebUrl, sameUrl } from '../src/lib/urls.ts';
import { readFileSync } from 'node:fs';
import { DEFAULT_FONT, FONTS, fontStack, isFontId } from '../src/lib/fonts.ts';

test('initial preferences: Personal Space always present', () => {
  const prefs = validPreferences(null);
  expect(prefs.spaces[0].id).toBe(DEFAULT_SPACE_ID);
  expect(prefs.favorites).toEqual({});
});

test('saved preferences: keep Spaces; old bookmark IDs stay pending, invalid ones are dropped', () => {
  const prefs = validPreferences({ spaces: [{ id:'work', name:'Lavoro', color:'#fff', emoji:'◈' }], favoriteIds:['8', 9, '10'] });
  expect(prefs.spaces[0].id).toBe(DEFAULT_SPACE_ID);
  expect(prefs.spaces[1].id).toBe('work');
  expect(prefs.favorites).toEqual({ personal: [{ id: '8', title: '', url: '' }, { id: '10', title: '', url: '' }] });
});

test('session handles empty state and saved data', () => {
  expect(validSession(null)).toEqual({ tabSpaces: {}, activeSpaceByWindow: {}, boundTabs: {}, lastActive: {}, lastTabBySpace: {} });
  expect(validSession({ tabSpaces: { 17: 'work' } }).tabSpaces['17']).toBe('work');
});

test('omitKey removes only the given key', () => {
  expect(omitKey({ 1: 'a', 2: 'b' }, 1)).toEqual({ 2: 'b' });
});

const tree = [{ id:'0', title:'', children:[{ id:'1', title:'Barra', children:[
  { id:'2', title:'Documentazione', children:[{ id:'3', title:'Vite', url:'https://vite.dev/' }] },
  { id:'4', title:'GitHub', url:'https://github.com/' }
] }] }];

test('bookmark flatten and map support nested folders', () => {
  const flat = flattenBookmarks(tree);
  expect(flat.length).toBe(2);
  expect(flat[0].path).toBe('Barra / Documentazione');
  expect(bookmarkMap(tree).get('4')?.title).toBe('GitHub');
});

test('bookmark search by title, url and folder; empty query finds nothing', () => {
  const flat = flattenBookmarks(tree);
  expect(matchBookmarks(flat, 'documentazione').map(e => e.node.id)).toEqual(['3']);
  expect(matchBookmarks(flat, 'GITHUB.com').map(e => e.node.id)).toEqual(['4']);
  expect(matchBookmarks(flat, '  ')).toEqual([]);
});

test('safe URLs and hostname', () => {
  expect(safeWebUrl('https://example.com/a')).toBe(true);
  expect(safeWebUrl('javascript:alert(1)')).toBe(false);
  expect(safeWebUrl('chrome://settings')).toBe(false);
  expect(hostname('https://www.example.com/path')).toBe('example.com');
});

test('tab close: removes Space assignment and favorite/saved binding', () => {
  const session = { tabSpaces: { 5: 'work', 6: 'work' }, activeSpaceByWindow: {}, boundTabs: { '1:10': 5, '1:11': 6 }, lastActive: { 5: 1, 6: 2 }, lastTabBySpace: { '1:work': 5, '1:personal': 6 } };
  const next = withoutTab(session, 5);
  expect(next.tabSpaces).toEqual({ 6: 'work' });
  expect(next.boundTabs).toEqual({ '1:11': 6 });
  expect(next.lastTabBySpace).toEqual({ '1:personal': 6 });
});

test('folder subtree includes descendants, not siblings', () => {
  const folders = [
    { id: 'a', name: 'A', spaceId: 'p', parentId: null },
    { id: 'b', name: 'B', spaceId: 'p', parentId: 'a' },
    { id: 'c', name: 'C', spaceId: 'p', parentId: 'b' },
    { id: 'd', name: 'D', spaceId: 'p', parentId: null }
  ];
  expect([...folderSubtree(folders, 'a')].sort()).toEqual(['a', 'b', 'c']);
});

test('HTML import: nested folders, root links, entities and unsafe URLs', () => {
  const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<DL><p>
  <DT><H3>Lavoro</H3>
  <DL><p>
    <DT><A HREF="https://a.dev/?x=1&amp;y=2">A &amp; B</A>
    <DT><H3>Sotto</H3>
    <DL><p>
      <DT><A HREF="https://b.dev/">B</A>
      <DT><A HREF="javascript:alert(1)">Bookmarklet</A>
    </DL><p>
  </DL><p>
  <DT><A HREF="https://c.dev/">C</A>
</DL><p>`;
  const tree = parseBookmarksHtml(html);
  expect(tree.length).toBe(2);
  expect(tree[0].title).toBe('Lavoro');
  expect(tree[0].children[0]).toEqual({ title: 'A & B', url: 'https://a.dev/?x=1&y=2' });
  expect(tree[0].children[1].title).toBe('Sotto');
  expect(tree[0].children[1].children).toEqual([{ title: 'B', url: 'https://b.dev/' }]);
  expect(tree[1]).toEqual({ title: 'C', url: 'https://c.dev/' });
  expect(countImported(tree)).toEqual({ links: 3, folders: 2 });
});

test('HTML import: strips browser roots, merges same-name folders, dedups links, drops empty folders', () => {
  const html = `<DL><p>
  <DT><H3>Bookmarks Bar</H3><DL><p>
    <DT><H3>Arc</H3><DL><p><DT><A HREF="https://a.dev/">A</A><DT><A HREF="https://a.dev/">A bis</A></DL><p>
    <DT><H3>Arc</H3><DL><p><DT><A HREF="https://b.dev/">B</A></DL><p>
    <DT><H3>Vuota</H3><DL><p></DL><p>
  </DL><p>
  <DT><H3>Other Bookmarks</H3><DL><p></DL><p>
</DL><p>`;
  const tree = parseBookmarksHtml(html);
  expect(tree.length).toBe(1);
  expect(tree[0].title).toBe('Arc');
  expect(tree[0].children.map(n => n.url)).toEqual(['https://a.dev/', 'https://b.dev/']);
});

test('preferences: per-Space favorites and folders closed by default', () => {
  const prefs = validPreferences({
    favorites: { work: [{ id: '1', title: 'One', url: 'https://one.dev/' }, 2, { id: 'x' }], personal: ['3'] },
    folders: [{ id: 'f', name: 'F', spaceId: 'work', parentId: null }, { id: 'g', name: 'G', spaceId: 'work', parentId: 'f', open: true }]
  });
  expect(prefs.favorites).toEqual({ work: [{ id: '1', title: 'One', url: 'https://one.dev/' }], personal: [{ id: '3', title: '', url: '' }] });
  expect(prefs.folders.map(f => f.open)).toEqual([false, true]);
});

test('sameUrl ignores www, trailing slash and hash but not query', () => {
  expect(sameUrl('https://www.a.dev/x/#top', 'https://a.dev/x')).toBe(true);
  expect(sameUrl('https://a.dev/x?q=1', 'https://a.dev/x?q=2')).toBe(false);
  expect(sameUrl(undefined, 'https://a.dev')).toBe(false);
});

test('folder stats: counts and open-tab path bubble up to parents', () => {
  const folders = [
    { id: 'a', name: 'A', spaceId: 'p', parentId: null, open: false },
    { id: 'b', name: 'B', spaceId: 'p', parentId: 'a', open: false },
    { id: 'c', name: 'C', spaceId: 'p', parentId: null, open: false }
  ];
  const items = [
    { id: '1', title: '', url: 'https://x.dev/', spaceId: 'p', folderId: 'b' },
    { id: '2', title: '', url: 'https://y.dev/', spaceId: 'p', folderId: 'a' },
    { id: '3', title: '', url: 'https://z.dev/', spaceId: 'p', folderId: null }
  ];
  const { counts, live } = folderStats(folders, items, id => id === '1');
  expect(counts.get('a')).toBe(2);
  expect(counts.get('b')).toBe(1);
  expect(counts.get('c')).toBeUndefined();
  expect([...live].sort()).toEqual(['a', 'b']);
});

test('window close: removes active Space and window bindings, not other windows\'', () => {
  const session = { tabSpaces: {}, activeSpaceByWindow: { 1: 'work', 2: 'personal' }, boundTabs: { '1:x': 5, '2:x': 6 }, lastActive: {}, lastTabBySpace: { '1:work': 5, '2:personal': 6 } };
  const next = withoutWindow(session, 1);
  expect(next.activeSpaceByWindow).toEqual({ 2: 'personal' });
  expect(next.boundTabs).toEqual({ '2:x': 6 });
  expect(next.lastTabBySpace).toEqual({ '2:personal': 6 });
});

test('HTML export and re-import: structure, titles and entities stay identical', () => {
  const folders = [{ id: 'a', name: 'Work & Co', parentId: null }, { id: 'b', name: 'Sub', parentId: 'a' }];
  const items = [
    { title: 'A <b>', url: 'https://a.dev/?x=1&y=2', folderId: 'b' },
    { title: 'Root', url: 'https://r.dev/', folderId: null }
  ];
  const tree = parseBookmarksHtml(exportBookmarksHtml(folders, items));
  expect(tree).toEqual([
    { title: 'Work & Co', children: [{ title: 'Sub', children: [{ title: 'A <b>', url: 'https://a.dev/?x=1&y=2' }] }] },
    { title: 'Root', url: 'https://r.dev/' }
  ]);
});

test('flat folder tree with depth and path', () => {
  const folders = [
    { id: 'a', name: 'A', spaceId: 'p', parentId: null, open: false },
    { id: 'b', name: 'B', spaceId: 'p', parentId: 'a', open: false },
    { id: 'x', name: 'X', spaceId: 'q', parentId: null, open: false }
  ];
  expect(flattenFolders(folders, 'p').map(e => [e.folder.id, e.depth])).toEqual([['a', 0], ['b', 1]]);
  expect(folderPath(folders, 'b')).toBe('A / B');
  expect(folderPath(folders, null)).toBe('');
});

test('archive: only temporary, inactive, old and unprotected tabs', () => {
  const HOUR = 3600_000;
  const now = 100 * HOUR;
  const tab = (id, extra = {}) => ({ id, url: `https://t${id}.dev/`, ...extra });
  const tabs = [tab(1), tab(2, { active: true }), tab(3, { audible: true }), tab(4, { pinned: true }),
    tab(5), tab(6, { url: 'chrome://settings' }), tab(7), tab(8), tab(9)];
  const lastActive = { 1: now - 13 * HOUR, 2: now - 99 * HOUR, 3: now - 99 * HOUR, 4: now - 99 * HOUR,
    5: now - 99 * HOUR, 6: now - 99 * HOUR, 7: now - 99 * HOUR, 8: now - 1 * HOUR };
  const ids = staleTabIds(tabs, { now, maxAgeMs: 12 * HOUR, lastActive, boundTabIds: new Set([5]), protectedUrls: ['https://www.t7.dev/'] });
  expect(ids).toEqual([1]);
});

test('swipe: threshold, direction, lock after trigger and vertical scroll ignored', () => {
  let state = INITIAL_SWIPE;
  const feed = (dx, dy, t, can = () => true) => { const r = swipeStep(state, dx, dy, t, can, 90); state = r.state; return r.step; };
  expect(feed(40, 2, 1000)).toBe(0);
  expect(feed(40, 2, 1050)).toBe(0);
  expect(feed(40, 2, 1100)).toBe(1);
  expect(feed(40, 2, 1150)).toBe(0);
  expect(feed(100, 0, 1500)).toBe(0);
  expect(feed(-100, 0, 2000)).toBe(-1);
  expect(feed(0, 200, 3000)).toBe(0);
  expect(feed(50, 1, 4000)).toBe(0);
  expect(feed(50, 1, 4500)).toBe(0);
});

test('swipe: with no neighbouring Space it doesn\'t trigger and distance stays clamped to the threshold', () => {
  let state = INITIAL_SWIPE;
  let step = 0;
  for (let t = 1000; t < 1300; t += 50) ({ state, step } = swipeStep(state, 60, 0, t, () => false, 90));
  expect(step).toBe(0);
  expect(state.distance).toBe(90);
  expect(state.lockUntil).toBe(0);
});

test('restore: deleted items return to their original position without touching new ones', () => {
  const before = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const current = [{ id: 'a' }, { id: 'd' }, { id: 'e' }];
  expect(mergeRestored(before, current, new Set(['b', 'c'])).map(i => i.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  expect(mergeRestored(before, [{ id: 'a' }, { id: 'e' }], new Set(['b'])).map(i => i.id)).toEqual(['a', 'b', 'e']);
});

test('JSON backup: round trip of Spaces, folders, saved, per-URL Favorites and settings', () => {
  const prefs = validPreferences({
    spaces: [{ id: 'work', name: 'Work', color: '#fff', emoji: 'W' }],
    folders: [{ id: 'f', name: 'F', spaceId: 'work', parentId: null, open: true, color: '#ff6b6b' }],
    saved: [{ id: 's', title: 'S', url: 'https://s.dev/', spaceId: 'work', folderId: 'f' }],
    favorites: { work: [{ id: 'a', title: 'Ten', url: 'https://ten.dev/' }, { id: 'legacy', title: '', url: '' }] },
    ambient: false, ambientIntensity: 40, swipeThreshold: 120, font: 'geist'
  });
  const backup = buildBackup(prefs);
  expect(backup.favorites).toEqual({ work: [{ title: 'Ten', url: 'https://ten.dev/' }] });
  const parsed = parseBackup(JSON.stringify(backup)).preferences;
  expect(parsed.favorites.work.map(item => [item.title, item.url])).toEqual([['Ten', 'https://ten.dev/']]);
  expect(parsed.folders).toEqual(prefs.folders);
  expect(parsed.saved).toEqual(prefs.saved);
  expect(parsed.ambient).toBe(false);
  expect(parsed.ambientIntensity).toBe(40);
  expect(parsed.font).toBe('geist');
  expect(validPreferences({ font: 'comic-sans' }).font).toBe('inter');
  expect(() => parseBackup('{"app":"other"}')).toThrow();
  expect(() => parseBackup('not json')).toThrow();
});

test('swipe: threshold is configurable', () => {
  const first = swipeStep(INITIAL_SWIPE, 60, 0, 1000, () => true, 50);
  expect(first.step).toBe(1);
  expect(swipeStep(INITIAL_SWIPE, 60, 0, 1000, () => true, 200).step).toBe(0);
});

test('favicon: normalized host and persisted cache capped to the most recent', () => {
  expect(faviconHost('https://www.Example.com/a')).toBe('example.com');
  expect(faviconHost('chrome://settings')).toBeNull();
  const trimmed = keepLast({ a: '1', b: '2', c: '3' }, 2);
  expect(Object.keys(trimmed)).toEqual(['b', 'c']);
  expect(keepLast({ a: '1' }, 2)).toEqual({ a: '1' });
});

test('dynamic contrast: ink, hysteresis and WCAG color adaptation', () => {
  expect(pickInk(0.02, 'light')).toBe('light');
  expect(pickInk(0.6, 'light')).toBe('dark');
  expect(pickInk(0.2, 'dark')).toBe('dark');
  expect(pickInk(0.18, 'light')).toBe('light');
  const white = luminance(255, 255, 255);
  const parse = css => css.match(/\d+/g).map(Number);
  for (const [r, g, b] of [[240, 240, 240], [255, 200, 0], [20, 20, 120], [200, 40, 40], [120, 120, 120]]) {
    const dark = parse(fitToInk(r, g, b, 'dark'));
    expect(contrast(luminance(...dark), 0.0033)).toBeGreaterThanOrEqual(4.5);
    const light = parse(fitToInk(r, g, b, 'light'));
    expect(contrast(white, luminance(...light))).toBeGreaterThanOrEqual(4.5);
  }
});

const base = () => validPreferences({
  spaces: [{ id: 'work', name: 'Work', color: '#fff', emoji: 'W' }],
  folders: [
    { id: 'f1', name: 'F1', spaceId: 'work', parentId: null, open: true, color: null },
    { id: 'f2', name: 'F2', spaceId: 'work', parentId: 'f1', open: false, color: null }
  ],
  saved: [
    { id: 's1', title: 'One', url: 'https://one.dev/', spaceId: 'work', folderId: 'f2' },
    { id: 's2', title: 'Two', url: 'https://two.dev/', spaceId: 'work', folderId: null }
  ],
  favorites: { work: [{ id: 'b1', title: 'B1', url: 'https://b1.dev/' }, { id: 'b2', title: 'B2', url: 'https://b2.dev/' }], personal: [{ id: 'b3', title: 'B3', url: 'https://b3.dev/' }] }
});

test('reorder and insert: moves before the target, ignores unknown keys', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  expect(reorderBy(list, i => i.id, 'c', 'a').map(i => i.id)).toEqual(['c', 'a', 'b']);
  expect(reorderBy(list, i => i.id, 'a', 'zzz')).toBe(list);
  expect(insertBefore(list, { id: 'x' }, 'b').map(i => i.id)).toEqual(['a', 'x', 'b', 'c']);
  expect(insertBefore(list, { id: 'x' }).map(i => i.id)).toEqual(['a', 'b', 'c', 'x']);
});

test('placement: inherits folder and Space from the reference item', () => {
  const prefs = base();
  expect(placement(prefs, null, 's1', 'personal')).toEqual({ folderId: 'f2', spaceId: 'work' });
  expect(placement(prefs, 'f1', undefined, 'personal')).toEqual({ folderId: 'f1', spaceId: 'work' });
  expect(placement(prefs, 'missing', undefined, 'personal')).toEqual({ folderId: null, spaceId: 'personal' });
});

test('delete Space: items and Favorites move to Personal, folders to the root, session reassigned', () => {
  const next = withoutSpace(base(), 'work');
  expect(next.spaces.map(s => s.id)).toEqual(['personal']);
  expect(next.saved.every(item => item.spaceId === 'personal')).toBe(true);
  expect(next.folders.every(f => f.spaceId === 'personal' && f.parentId === null)).toBe(true);
  expect(next.favorites.personal.map(item => item.id)).toEqual(['b3', 'b1', 'b2']);
  expect(next.favorites.work).toBeUndefined();
  const session = sessionWithoutSpace({ tabSpaces: { 1: 'work', 2: 'x' }, activeSpaceByWindow: { 9: 'work' }, boundTabs: {}, lastActive: {}, lastTabBySpace: {} }, 'work');
  expect(session.tabSpaces).toEqual({ 1: 'personal', 2: 'x' });
  expect(session.activeSpaceByWindow).toEqual({ 9: 'personal' });
});

test('delete folder: takes subfolders and links with it, leaves the rest', () => {
  const next = withoutFolder(base(), 'f1');
  expect(next.folders).toEqual([]);
  expect(next.saved.map(item => item.id)).toEqual(['s2']);
});

test('per-Space Favorites: transforms only the given Space', () => {
  const next = withFavorites(base(), 'work', items => items.filter(item => item.id !== 'b1'));
  expect(next.favorites.work.map(item => item.id)).toEqual(['b2']);
  expect(next.favorites.personal.map(item => item.id)).toEqual(['b3']);
});

test('import into a Space: merges same-name folders, avoids duplicates, creates the rest', () => {
  const nodes = [
    { title: 'F1', children: [{ title: 'New', children: [{ title: 'Three', url: 'https://three.dev/' }] }] },
    { title: 'Two', url: 'https://two.dev/' },
    { title: 'Four', url: 'https://four.dev/' }
  ];
  const { folders, saved } = importInto(base(), nodes, 'work');
  expect(folders.map(f => f.name)).toEqual(['F1', 'F2', 'New']);
  expect(folders[2]).toMatchObject({ parentId: 'f1', spaceId: 'work' });
  expect(saved.map(item => item.url)).toEqual(['https://one.dev/', 'https://two.dev/', 'https://three.dev/', 'https://four.dev/']);
  expect(saved[2].folderId).toBe(folders[2].id);
});

test('daily backup: weekday filename, never on empty data, only after a day has passed', () => {
  expect(backupFilename(new Date(2026, 10, 13))).toBe('Arcside backups/arcside-backup-fri.json');
  const empty = validPreferences(null);
  const full = validPreferences({ saved: [{ id: 's', title: 'S', url: 'https://s.dev/', spaceId: 'personal', folderId: null }], lastBackupAt: 1000 });
  expect(hasBackupContent(empty)).toBe(false);
  expect(isBackupDue({ ...empty, lastBackupAt: 0 }, 10 ** 12)).toBe(false);
  expect(isBackupDue(full, 1000 + 86_400_000 - 1)).toBe(false);
  expect(isBackupDue(full, 1000 + 86_400_000)).toBe(true);
  expect(isBackupDue({ ...full, dailyBackup: false }, 10 ** 12)).toBe(false);
});

test('reusable empty tab: new tab, about:blank and Arcside\'s new tab, not pinned and without a real page', () => {
  const ext = 'chrome-extension://abc/newtab.html';
  expect(isBlankTab({ url: 'chrome://newtab/' }, ext)).toBe(true);
  expect(isBlankTab({ url: 'about:blank' }, ext)).toBe(true);
  expect(isBlankTab({ url: '', pendingUrl: '' }, ext)).toBe(true);
  expect(isBlankTab({ url: ext }, ext)).toBe(true);
  expect(isBlankTab({ url: 'https://a.dev/' }, ext)).toBe(false);
  expect(isBlankTab({ url: 'chrome://newtab/', pinned: true }, ext)).toBe(false);
});

test('URL spaces: remembers by host+path, ignores non-web pages, reassigns only existing Spaces, caps memory', () => {
  const map = mergeUrlSpaces({}, [
    { url: 'https://www.a.dev/x/#top', spaceId: 'work' },
    { url: 'chrome://settings', spaceId: 'work' },
    { url: 'https://b.dev/', spaceId: undefined }
  ]);
  expect(map).toEqual({ 'a.dev/x': 'work' });
  expect(spaceForUrl(map, 'https://a.dev/x', ['personal', 'work'])).toBe('work');
  expect(spaceForUrl(map, 'https://a.dev/x', ['personal'])).toBeUndefined();
  expect(spaceForUrl(map, 'https://a.dev/other', ['work'])).toBeUndefined();
  const many = mergeUrlSpaces({}, Array.from({ length: MAX_URL_SPACES + 5 }, (_, i) => ({ url: `https://s${i}.dev/`, spaceId: 'work' })));
  expect(Object.keys(many).length).toBe(MAX_URL_SPACES);
  expect(many['s0.dev']).toBeUndefined();
});

test('HTML export with Favorites: dedicated folder, re-imports as Favorites with folders and subfolders, no duplicates', () => {
  const folders = [{ id: 'a', name: 'A', parentId: null }, { id: 'b', name: 'B', parentId: 'a' }];
  const items = [{ title: 'Deep', url: 'https://deep.dev/', folderId: 'b' }];
  const favorites = [{ title: 'Gmail', url: 'https://mail.google.com/' }, { title: 'Cal', url: 'https://calendar.google.com/' }];
  const html = exportBookmarksHtml(folders, items, favorites);
  expect(html).toContain('ARCSIDE_FAVORITES="true"');
  const tree = parseBookmarksHtml(html);
  expect(tree[0]).toMatchObject({ title: 'Favorites', favorites: true });
  expect(countImported(tree)).toEqual({ links: 3, folders: 2 });
  const prefs = validPreferences(null);
  const first = importInto(prefs, tree, 'personal');
  expect(first.favorites.map(item => item.url)).toEqual(['https://mail.google.com/', 'https://calendar.google.com/']);
  expect(first.folders.map(folder => folder.name)).toEqual(['A', 'B']);
  expect(first.saved.map(item => item.url)).toEqual(['https://deep.dev/']);
  const again = importInto({ ...prefs, folders: first.folders, saved: first.saved, favorites: { personal: first.favorites } }, tree, 'personal');
  expect(again.favorites.length).toBe(2);
  expect(again.saved.length).toBe(1);
});

test('Favorites: merge by URL and resolution of old bookmark IDs', () => {
  const list = [{ id: '1', title: 'One', url: 'https://one.dev/' }];
  expect(mergeFavorites(list, [{ title: 'dup', url: 'https://www.one.dev' }, { title: 'Two', url: 'https://two.dev/' }], () => 'n').map(item => item.id)).toEqual(['1', 'n']);
  const legacy = { personal: [{ id: '7', title: '', url: '' }, { id: '8', title: '', url: '' }, { id: 'ok', title: 'K', url: 'https://k.dev/' }] };
  expect(resolveLegacyFavorites(legacy, new Map([['7', { title: 'Seven', url: 'https://seven.dev/' }]])).personal)
    .toEqual([{ id: '7', title: 'Seven', url: 'https://seven.dev/' }, { id: 'ok', title: 'K', url: 'https://k.dev/' }]);
});

test('move folder: reorders among siblings, changes parent, goes to root, rejects cycles', () => {
  const f = (id, parentId) => ({ id, name: id, spaceId: 'p', parentId, open: false, color: null });
  const folders = [f('a', null), f('b', null), f('c', 'a'), f('d', 'c')];
  const names = list => list.map(item => `${item.id}<${item.parentId ?? '-'}`);
  expect(names(moveFolder(folders, 'b', null, 'a'))).toEqual(['b<-', 'a<-', 'c<a', 'd<c']);
  expect(names(moveFolder(folders, 'b', 'a'))).toEqual(['a<-', 'c<a', 'd<c', 'b<a']);
  expect(names(moveFolder(folders, 'd', null))).toEqual(['a<-', 'b<-', 'c<a', 'd<-']);
  expect(names(moveFolder(folders, 'c', 'a', 'c'))).toEqual(names(folders));
  expect(moveFolder(folders, 'a', 'd')).toBe(folders);
  expect(moveFolder(folders, 'a', 'a')).toBe(folders);
  expect(moveFolder(folders, 'zzz', null)).toBe(folders);
});

test('fonts: default exists, system has no family, every font resolves to a usable stack', () => {
  expect(isFontId(DEFAULT_FONT)).toBe(true);
  expect(isFontId('comic-sans')).toBe(false);
  expect(fontStack('system')).not.toContain('Variable');
  FONTS.filter(font => font.id !== 'system').forEach(font => expect(fontStack(font.id).startsWith(`"${font.family}"`)).toBe(true));
});

test('CSS: the font rule is unlayered and more specific than the stylesheet Chrome injects into extension pages', () => {
  const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  expect(css).toMatch(/^html body \{ font-family: var\(--arcside-font/m);
  expect(css.match(/@layer base \{[\s\S]*?\n\}/)?.[0]).not.toContain('font-family');
});
