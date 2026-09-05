export interface SpeechAdapter {
  getVoices(): SpeechSynthesisVoice[];
  speak(utterance: SpeechSynthesisUtterance): void;
  cancel(): void;
  addEventListener(type: 'voiceschanged', listener: () => void): void;
  removeEventListener(type: 'voiceschanged', listener: () => void): void;
}

/** Explicit local voices only: never fall through to a browser's potentially remote default. */
export class NarrationService {
  private voice: SpeechSynthesisVoice | undefined;
  private utterance: SpeechSynthesisUtterance | undefined;
  private readonly refresh = (): void => {
    const voices = this.speech?.getVoices().filter((voice) => voice.localService && /^en(?:-|$)/iu.test(voice.lang)) ?? [];
    this.voice = voices.find((voice) => voice.default) ?? voices.find((voice) => /^en-US$/iu.test(voice.lang)) ?? voices[0];
  };

  constructor(
    private readonly speech: SpeechAdapter | undefined = typeof window !== 'undefined' ? window.speechSynthesis : undefined,
    private readonly makeUtterance: (text: string) => SpeechSynthesisUtterance = (text) => new SpeechSynthesisUtterance(text),
  ) {
    this.refresh();
    this.speech?.addEventListener('voiceschanged', this.refresh);
  }

  available(): boolean { this.refresh(); return Boolean(this.voice); }

  read(text: string, onError?: () => void): boolean {
    this.stop();
    this.refresh();
    if (!this.speech || !this.voice || !text.trim()) return false;
    const utterance = this.makeUtterance(text);
    utterance.voice = this.voice;
    utterance.lang = this.voice.lang;
    utterance.rate = 0.9;
    utterance.onend = () => { if (this.utterance === utterance) this.utterance = undefined; };
    utterance.onerror = (event) => {
      if (this.utterance !== utterance) return;
      this.utterance = undefined;
      if (event.error !== 'canceled' && event.error !== 'interrupted') onError?.();
    };
    this.utterance = utterance;
    try { this.speech.speak(utterance); return true; }
    catch { this.utterance = undefined; return false; }
  }

  stop(): void { this.utterance = undefined; this.speech?.cancel(); }
  dispose(): void { this.stop(); this.speech?.removeEventListener('voiceschanged', this.refresh); }
}
