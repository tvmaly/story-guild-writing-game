import { describe, expect, it, vi } from 'vitest';
import { NarrationService, type SpeechAdapter } from '../src/services/NarrationService';

const voice = (local: boolean, language = 'en-US') => ({ localService: local, lang: language, default: true, name: 'Test voice' }) as SpeechSynthesisVoice;
const utterance = (text: string) => ({ text }) as SpeechSynthesisUtterance;

describe('local read-aloud', () => {
  it('never uses remote voices or a browser default when local voices are absent', () => {
    const speech: SpeechAdapter = { getVoices: () => [voice(false)], speak: vi.fn(), cancel: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const service = new NarrationService(speech, utterance);
    expect(service.read('Private child text')).toBe(false); expect(speech.speak).not.toHaveBeenCalled();
  });
  it('accepts delayed local English voices and cancels before replacement or navigation', () => {
    let voices: SpeechSynthesisVoice[] = []; let onChange: (() => void) | undefined;
    const speech: SpeechAdapter = { getVoices: () => voices, speak: vi.fn(), cancel: vi.fn(), addEventListener: (_, fn) => { onChange = fn; }, removeEventListener: vi.fn() };
    const service = new NarrationService(speech, utterance);
    expect(service.available()).toBe(false); voices = [voice(false), voice(true, 'fr-FR'), voice(true)]; onChange!();
    expect(service.read('A little story')).toBe(true);
    expect(speech.speak).toHaveBeenCalledWith(expect.objectContaining({ text: 'A little story', voice: voices[2] }));
    service.read('A second story'); service.stop(); expect(speech.cancel).toHaveBeenCalledTimes(3);
    service.dispose(); expect(speech.removeEventListener).toHaveBeenCalledWith('voiceschanged', onChange);
  });
  it('reports playback errors and safely handles unavailable synthesis', () => {
    const error = vi.fn(); let spoken: SpeechSynthesisUtterance | undefined;
    const speech: SpeechAdapter = { getVoices: () => [voice(true)], speak: (u) => { spoken = u; }, cancel: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
    const service = new NarrationService(speech, utterance); service.read('A story', error);
    spoken!.onerror!({ error: 'synthesis-failed' } as SpeechSynthesisErrorEvent); expect(error).toHaveBeenCalledOnce();
    expect(new NarrationService(undefined, utterance).read('A story')).toBe(false);
  });
});
