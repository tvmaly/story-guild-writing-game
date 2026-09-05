import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STORYBOOK_IMAGES } from '../src/domain/storybook';
import { validateManifest } from '../src/services/ConfigRepository';

describe('bundled storybook artwork', () => {
  it('ships every configured PNG, with 4:3 scenes and transparent character/page layers', () => {
    for (const [key, path] of Object.entries(STORYBOOK_IMAGES)) {
      const png = readFileSync(new URL(`../public/${path}`, import.meta.url));
      expect(png.subarray(1, 4).toString(), key).toBe('PNG');
      const width = png.readUInt32BE(16);
      const height = png.readUInt32BE(20);
      expect(width, key).toBeGreaterThanOrEqual(1024);
      expect(height, key).toBeGreaterThanOrEqual(768);
      if (key === 'pip' || key === 'page') expect(png[25], key).toBe(6); // PNG RGBA
      else expect(width / height, key).toBeCloseTo(4 / 3, 2);
    }
  });

  it('keeps the shipped JSON aligned with the complete default artwork map', () => {
    const manifest = JSON.parse(readFileSync(new URL('../public/config/game.json', import.meta.url), 'utf8'));
    expect(validateManifest(manifest)).toBe(true);
    expect(manifest.storybook.images).toEqual(STORYBOOK_IMAGES);
  });
});
