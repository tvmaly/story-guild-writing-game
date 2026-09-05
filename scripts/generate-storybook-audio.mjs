// Original short, gentle musical effects. Build-time synthesis; no runtime audio service.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const destination = fileURLToPath(new URL('../public/assets/audio/', import.meta.url));
mkdirSync(destination, { recursive: true });
const cues = { tap: [659], magic: [523, 659, 784], discovery: [587, 784], page: [523, 659, 784, 1047], rustle: [294, 330] };
for (const [name, notes] of Object.entries(cues)) {
  const sampleRate = 22050;
  const spacing = 0.11;
  const duration = notes.length * spacing + 0.25;
  const count = Math.ceil(duration * sampleRate);
  const wav = Buffer.alloc(44 + count * 2);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + count * 2, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(count * 2, 40);
  for (let sample = 0; sample < count; sample += 1) {
    const time = sample / sampleRate;
    let value = 0;
    notes.forEach((frequency, index) => {
      const age = time - index * spacing;
      if (age < 0 || age > 0.35) return;
      const envelope = Math.min(age / 0.015, 1) * Math.exp(-age * 14) * Math.max(0, 1 - age / 0.35);
      value += Math.sin(age * frequency * Math.PI * 2) * envelope * 0.22;
    });
    wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32767), 44 + sample * 2);
  }
  writeFileSync(`${destination}${name}.wav`, wav);
}
