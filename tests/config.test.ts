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
});
