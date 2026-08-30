import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_MANIFEST } from '../src/config';
import { AudioService, type AudioAdapter } from '../src/services/AudioService';

describe('AudioService', () => {
  it('does nothing when muted or a cue is absent', async () => {
    const adapter: AudioAdapter = { play: vi.fn(async () => undefined), stop: vi.fn() };
    const audio = new AudioService(DEFAULT_MANIFEST, adapter, false);
    audio.unlockFromGesture();
    await audio.play('uiActivate');
    expect(adapter.play).not.toHaveBeenCalled();
  });

  it('requires both enablement and a gesture unlock', async () => {
    const manifest = structuredClone(DEFAULT_MANIFEST);
    manifest.audio.cues.uiActivate = { sources: ['assets/audio/click.mp3'], volume: 0.5 };
    const adapter: AudioAdapter = { play: vi.fn(async () => undefined), stop: vi.fn() };
    const audio = new AudioService(manifest, adapter, true);
    await audio.play('uiActivate');
    expect(adapter.play).not.toHaveBeenCalled();
    audio.unlockFromGesture();
    await audio.play('uiActivate');
    expect(adapter.play).toHaveBeenCalledOnce();
    audio.setEnabled(false);
    expect(adapter.stop).toHaveBeenCalledWith('uiActivate');
  });
});
