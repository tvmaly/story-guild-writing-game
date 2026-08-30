import type { AudioCueId, GameManifestV1 } from '../domain/models';

export interface AudioAdapter {
  play(cue: AudioCueId, sources: string[], options: { volume: number; loop: boolean }): Promise<void>;
  stop(cue: AudioCueId): void;
}

export class BrowserAudioAdapter implements AudioAdapter {
  private readonly active = new Map<AudioCueId, HTMLAudioElement>();
  constructor(private readonly resolveAsset: (path: string) => string) {}

  async play(cue: AudioCueId, sources: string[], options: { volume: number; loop: boolean }): Promise<void> {
    this.stop(cue);
    let lastError: unknown;
    for (const source of sources) {
      const audio = new Audio(this.resolveAsset(source));
      audio.volume = options.volume;
      audio.loop = options.loop;
      try {
        await audio.play();
        this.active.set(cue, audio);
        audio.addEventListener('ended', () => this.active.delete(cue), { once: true });
        return;
      } catch (error) {
        lastError = error;
      }
    }
    if (lastError) throw lastError;
  }

  stop(cue: AudioCueId): void {
    const audio = this.active.get(cue);
    audio?.pause();
    this.active.delete(cue);
  }
}

export class AudioService {
  private enabled = false;
  private unlocked = false;

  constructor(
    private readonly manifest: Readonly<GameManifestV1>,
    private readonly adapter: AudioAdapter,
    initiallyEnabled: boolean,
  ) {
    this.enabled = initiallyEnabled;
  }

  hasCues(): boolean { return Object.keys(this.manifest.audio.cues).length > 0; }
  isEnabled(): boolean { return this.enabled; }

  unlockFromGesture(): void { this.unlocked = true; }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      (Object.keys(this.manifest.audio.cues) as AudioCueId[]).forEach((cue) => this.adapter.stop(cue));
    }
  }

  async play(cueId: AudioCueId): Promise<void> {
    const cue = this.manifest.audio.cues[cueId];
    if (!this.enabled || !this.unlocked || !cue) return;
    await this.adapter.play(cueId, [...cue.sources], {
      volume: cue.volume * this.manifest.audio.masterVolume,
      loop: cue.loop ?? false,
    });
  }
}
