import { expect, test } from 'bun:test';
import { NEUTRAL_ACCENT, ZONES, ambientStyle, blendColors, hexToRgb, resolveAmbient, rowsToZones, smoothZones, tintZones, zoneVars } from '../src/lib/ambient.ts';
import { validPreferences } from '../src/lib/models.ts';
import { SPACE_COLORS, SPACE_GRADIENTS, spaceFill } from '../src/lib/palette.ts';

const solid = (rgb) => Array.from({ length: ZONES }, () => [...rgb]);

test('smoothing: a flat page stays flat and a hard edge softens without leaving the input range', () => {
  const flat = smoothZones(solid([40, 90, 200]), 1);
  flat.forEach(zone => zone.forEach((value, channel) => expect(value).toBeCloseTo([40, 90, 200][channel], 5)));
  const edge = [...solid([0, 0, 0]).slice(0, 8), ...solid([255, 255, 255]).slice(8)];
  const smooth = smoothZones(edge, 1);
  expect(smooth[0][0]).toBeLessThan(20);
  expect(smooth[15][0]).toBeGreaterThan(235);
  expect(smooth[7][0]).toBeGreaterThan(0);
  expect(smooth[8][0]).toBeLessThan(255);
  smooth.forEach(zone => zone.forEach(value => { expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(255); }));
});

test('vibrance pushes colors away from gray and never touches pure gray', () => {
  const gray = smoothZones(solid([120, 120, 120]), 1.3)[0];
  expect(gray.map(Math.round)).toEqual([120, 120, 120]);
  const muted = smoothZones(solid([150, 100, 100]), 1.3)[0];
  expect(muted[0] - muted[1]).toBeGreaterThan(50);
});

test('space tint colors light grays but leaves black borders and vivid colors alone', () => {
  const accent = hexToRgb('#2f6df6');
  const [lightGray, black, vivid] = tintZones([[200, 200, 200], [0, 0, 0], [220, 30, 30]], accent);
  expect(lightGray[2]).toBeGreaterThan(lightGray[0]);
  expect(black).toEqual([0, 0, 0]);
  expect(vivid.map(Math.round)).toEqual([220, 30, 30]);
  expect(tintZones([[200, 200, 200]], null)).toEqual([[200, 200, 200]]);
  expect(hexToRgb('not-a-color')).toBeNull();
});

test('rows resample into the fixed zone count by averaging', () => {
  const rows = [...Array.from({ length: 32 }, (_, i) => (i < 16 ? [0, 0, 0] : [200, 100, 50]))];
  const zones = rowsToZones(rows);
  expect(zones).toHaveLength(ZONES);
  expect(zones[0]).toEqual([0, 0, 0]);
  expect(zones[ZONES - 1]).toEqual([200, 100, 50]);
  expect(rowsToZones([[10, 20, 30]])).toHaveLength(ZONES);
});

test('zone variables: one per zone plus aura anchors that follow the same zones', () => {
  const vars = zoneVars(solid([10, 20, 30]), 100);
  expect(Object.keys(vars).filter(name => name.startsWith('--zone-'))).toHaveLength(ZONES);
  expect(vars['--zone-0']).toContain('rgb(10.0 20.0 30.0) 100.0%');
  expect(vars['--aura-top']).toBe(vars['--zone-3']);
  expect(vars['--aura-bottom']).toBe(vars['--zone-12']);
});

test('ambient resolution: a Space override wins over the global setting', () => {
  const space = (ambient) => ({ id: 'x', name: 'X', color: '#fff', emoji: 'x', ...(ambient && { ambient }) });
  expect(resolveAmbient(space(), true, 'vivid')).toEqual({ on: true, mode: 'vivid' });
  expect(resolveAmbient(space(), false, 'calm')).toEqual({ on: false, mode: 'calm' });
  expect(resolveAmbient(space('off'), true, 'vivid').on).toBe(false);
  expect(resolveAmbient(space('calm'), false, 'vivid')).toEqual({ on: true, mode: 'calm' });
});

test('preferences: ambient mode and per-Space override are validated', () => {
  expect(validPreferences({ ambientMode: 'calm' }).ambientMode).toBe('calm');
  expect(validPreferences({ ambientMode: 'neon' }).ambientMode).toBe('vivid');
  expect(validPreferences({}).ambientSpaceColor).toBe(false);
  expect(validPreferences({ ambientSpaceColor: true }).ambientSpaceColor).toBe(true);
  const spaces = validPreferences({ spaces: [
    { id: 'a', name: 'A', color: '#fff', emoji: 'a', ambient: 'off' },
    { id: 'b', name: 'B', color: '#fff', emoji: 'b', ambient: 'rainbow' }
  ] }).spaces;
  expect(spaces.find(space => space.id === 'a').ambient).toBe('off');
  expect('ambient' in spaces.find(space => space.id === 'b')).toBe(false);
});

test('Space gradient: resting color runs from the first to the second color down the zones', () => {
  const vars = zoneVars(solid([10, 20, 30]), 0);
  expect(vars['--zone-0']).toContain('var(--resting) 100%, var(--resting-end)');
  expect(vars[`--zone-${ZONES - 1}`]).toContain('var(--resting) 0%, var(--resting-end)');
});

test('Space colors: second color must be a hex value, fills and blends compose', () => {
  const spaces = validPreferences({ spaces: [
    { id: 'a', name: 'A', color: '#111111', emoji: 'a', color2: '#ABCDEF' },
    { id: 'b', name: 'B', color: '#111111', emoji: 'b', color2: 'red' }
  ] }).spaces;
  expect(spaces.find(space => space.id === 'a').color2).toBe('#ABCDEF');
  expect('color2' in spaces.find(space => space.id === 'b')).toBe(false);
  expect(spaceFill('#111111')).toBe('#111111');
  expect(spaceFill('#111111', '#222222')).toBe('linear-gradient(135deg, #111111, #222222)');
  expect(blendColors('red', 'blue', 0)).toBe('red');
  expect(blendColors('red', 'blue', 0.25)).toBe('color-mix(in oklab, red 75%, blue)');
  expect(new Set(SPACE_COLORS).size).toBe(SPACE_COLORS.length);
  SPACE_GRADIENTS.forEach(({ from, to }) => { expect(hexToRgb(from)).not.toBeNull(); expect(hexToRgb(to)).not.toBeNull(); });
});

test('ambient without the Space color: neutral resting color and no accent mixed into the gradient', () => {
  const plain = ambientStyle({ accent: '#2f6df6', accent2: '#7c4dff', ink: 'light', mode: 'vivid', spaceColor: false });
  const tinted = ambientStyle({ accent: '#2f6df6', accent2: '#7c4dff', ink: 'light', mode: 'vivid', spaceColor: true });
  expect(plain.background).not.toContain('--space-accent');
  expect(tinted.background).toContain('--space-accent');
  expect(plain['--resting']).toContain(NEUTRAL_ACCENT);
  expect(tinted['--resting']).toContain('#2f6df6');
});
