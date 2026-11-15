import { expect, test } from 'bun:test';
import { buildBackup, manualBackupFilename, parseBackup, summarize } from '../src/lib/backup.ts';
import { validPreferences } from '../src/lib/models.ts';
import { mergeBackup } from '../src/lib/prefs-ops.ts';

const prefs = validPreferences({
  spaces: [
    { id: 'work', name: 'Work', color: '#111111', emoji: 'W' },
    { id: 'fun', name: 'Fun', color: '#222222', emoji: 'F' }
  ],
  folders: [
    { id: 'f1', name: 'Docs', spaceId: 'work', parentId: null, open: true, color: '#ff6b6b' },
    { id: 'f2', name: 'API', spaceId: 'work', parentId: 'f1', open: false, color: null },
    { id: 'f3', name: 'Games', spaceId: 'fun', parentId: null, open: false, color: null }
  ],
  saved: [
    { id: 's1', title: 'Spec', url: 'https://spec.dev/', spaceId: 'work', folderId: 'f2' },
    { id: 's2', title: 'Loose', url: 'https://loose.dev/', spaceId: 'work', folderId: null },
    { id: 's3', title: 'Chess', url: 'https://chess.dev/', spaceId: 'fun', folderId: 'f3' }
  ],
  favorites: { work: [{ id: 'a', title: 'Mail', url: 'https://mail.dev/' }], fun: [{ id: 'b', title: 'Tube', url: 'https://tube.dev/' }] }
});

test('full backup carries a timestamp, scope and settings; a Space backup carries only that Space', () => {
  const all = buildBackup(prefs, { now: 1700000000000 });
  expect(all).toMatchObject({ app: 'arcside', version: 2, scope: 'all', exportedAt: 1700000000000 });
  expect(all.settings).toBeDefined();
  const one = buildBackup(prefs, { spaceId: 'work' });
  expect(one.scope).toBe('space');
  expect(one.settings).toBeUndefined();
  expect(one.spaces.map(space => space.id)).toEqual(['work']);
  expect(one.folders.map(folder => folder.id)).toEqual(['f1', 'f2']);
  expect(one.saved.map(item => item.id)).toEqual(['s1', 's2']);
  expect(Object.keys(one.favorites)).toEqual(['work']);
});

test('parsing reports a summary, the export date and how many entries were invalid', () => {
  const file = structuredClone(buildBackup(prefs, { now: 1700000000000 }));
  file.saved.push({ id: 'bad', title: 'Bad', url: 5, spaceId: 'work', folderId: null });
  file.favorites.work.push({ title: 'Evil', url: 'javascript:alert(1)' });
  const parsed = parseBackup(JSON.stringify(file));
  expect(parsed.exportedAt).toBe(1700000000000);
  expect(parsed.scope).toBe('all');
  expect(parsed.summary).toEqual({ spaces: 3, folders: 3, links: 3, favorites: 2 });
  expect(parsed.skipped).toBe(2);
});

test('a Space backup keeps only its own Spaces, so the default Space is not injected into a merge', () => {
  const parsed = parseBackup(JSON.stringify(buildBackup(prefs, { spaceId: 'fun' })));
  expect(parsed.scope).toBe('space');
  expect(parsed.preferences.spaces.map(space => space.id)).toEqual(['fun']);
});

test('old version 1 and legacy dock backups still import', () => {
  const v1 = { app: 'dock', version: 1, spaces: [], folders: [], saved: [{ id: 's', title: 'S', url: 'https://s.dev/', spaceId: 'personal', folderId: null }], favorites: {}, settings: { ambient: false } };
  const parsed = parseBackup(JSON.stringify(v1));
  expect(parsed.exportedAt).toBeNull();
  expect(parsed.preferences.ambient).toBe(false);
  expect(parsed.summary.links).toBe(1);
  expect(() => parseBackup(JSON.stringify({ app: 'arcside', version: 9 }))).toThrow();
  expect(() => parseBackup('null')).toThrow();
});

test('merge: matches Spaces by id or name, combines folders, skips duplicate links, keeps colors', () => {
  const current = validPreferences({
    spaces: [{ id: 'w2', name: 'work', color: '#333333', emoji: 'w' }],
    folders: [{ id: 'c1', name: 'docs', spaceId: 'w2', parentId: null, open: false, color: null }],
    saved: [{ id: 'cs', title: 'Spec', url: 'https://spec.dev/', spaceId: 'w2', folderId: null }],
    favorites: { w2: [{ id: 'm', title: 'Mail', url: 'https://mail.dev/' }] }
  });
  const merged = mergeBackup(current, parseBackup(JSON.stringify(buildBackup(prefs))).preferences);
  expect(merged.spaces.map(space => space.id)).toContain('fun');
  expect(merged.spaces.filter(space => space.name.toLowerCase() === 'work')).toHaveLength(1);
  const docs = merged.folders.filter(folder => folder.name.toLowerCase() === 'docs');
  expect(docs).toHaveLength(1);
  const api = merged.folders.find(folder => folder.name === 'API');
  expect(api.parentId).toBe(docs[0].id);
  expect(api.spaceId).toBe('w2');
  expect(merged.saved.filter(item => item.url === 'https://spec.dev/')).toHaveLength(2);
  expect(merged.saved.find(item => item.url === 'https://loose.dev/').spaceId).toBe('w2');
  expect(merged.saved.find(item => item.url === 'https://chess.dev/').folderId).toBe(merged.folders.find(folder => folder.name === 'Games').id);
  expect(merged.favorites.w2.filter(item => item.url === 'https://mail.dev/')).toHaveLength(1);
  expect(merged.favorites.fun.map(item => item.url)).toEqual(['https://tube.dev/']);
  expect(summarize(merged).links).toBe(4);
  const again = mergeBackup(merged, parseBackup(JSON.stringify(buildBackup(prefs))).preferences);
  expect(again.saved).toHaveLength(merged.saved.length);
  expect(again.folders).toHaveLength(merged.folders.length);
});

test('manual backup file names carry the date and, for one Space, its name', () => {
  const date = new Date(2026, 10, 15);
  expect(manualBackupFilename(date)).toBe('arcside-backup-2026-11-15.json');
  expect(manualBackupFilename(date, 'Side Projects!')).toBe('arcside-side-projects-backup-2026-11-15.json');
});

test('a backup without a settings block is flagged so a replace keeps current settings; duplicate favorites are not counted as invalid', () => {
  const file = structuredClone(buildBackup(prefs));
  file.favorites.work.push({ title: 'Mail again', url: 'https://mail.dev/' });
  expect(parseBackup(JSON.stringify(file)).hasSettings).toBe(true);
  expect(parseBackup(JSON.stringify(file)).skipped).toBe(0);
  delete file.settings;
  expect(parseBackup(JSON.stringify(file)).hasSettings).toBe(false);
});
