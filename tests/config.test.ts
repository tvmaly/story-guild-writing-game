import { describe, expect, it } from 'vitest';
import { DEFAULT_MANIFEST } from '../src/config';
import { validateManifest } from '../src/services/ConfigRepository';

describe('runtime game manifest', () => {
  it('accepts the bundled default', () => expect(validateManifest(DEFAULT_MANIFEST)).toBe(true));

  it('rejects remote sprite URLs', () => {
    const candidate = structuredClone(DEFAULT_MANIFEST);
    candidate.characters.player.spriteUrl = 'https://example.com/player.png';
    expect(validateManifest(candidate)).toBe(false);
  });

  it('rejects unsafe volume values', () => {
    const candidate = structuredClone(DEFAULT_MANIFEST);
    candidate.audio.masterVolume = 2;
    expect(validateManifest(candidate)).toBe(false);
  });

  it('requires all scene pictures when an illustrated manifest is supplied', () => {
    const candidate = structuredClone(DEFAULT_MANIFEST);
    delete candidate.storybook!.images['bookshelf-bell'];
    expect(validateManifest(candidate)).toBe(false);
  });

  it('rejects paths that leave the application or use protocol-relative URLs', () => {
    for (const path of ['../private.png', '//example.com/image.png', 'data:image/png;base64,AAAA']) {
      const candidate = structuredClone(DEFAULT_MANIFEST);
      candidate.storybook!.images.library = path;
      expect(validateManifest(candidate)).toBe(false);
    }
  });
});
