import { describe, expect, it } from 'vitest';
import { hashSeed, SeededRng } from '../src/core/SeededRng';
import { generateStorySeed, selectQuestOneTablets } from '../src/domain/courseCatalog';

describe('seeded randomness', () => {
  it('repeats the same sequence for the same seed', () => {
    const first = new SeededRng(42);
    const second = new SeededRng(42);
    expect([first.next(), first.next(), first.next()]).toEqual([second.next(), second.next(), second.next()]);
  });

  it('creates deterministic story seeds', () => {
    const seed = hashSeed('profile:L01:1');
    expect(generateStorySeed(seed)).toEqual(generateStorySeed(seed));
    expect(generateStorySeed(seed)).not.toEqual(generateStorySeed(seed + 1));
  });

  it('selects six balanced tablets and includes canonical content', () => {
    const tablets = selectQuestOneTablets(123, 2);
    expect(tablets).toHaveLength(6);
    expect(tablets.filter((tablet) => tablet.isStory)).toHaveLength(3);
    expect(tablets.some((tablet) => tablet.canonical)).toBe(true);
  });

  it('rejects empty candidate pools without looping', () => {
    expect(() => new SeededRng(1).pick([])).toThrow(/empty candidate/i);
  });
});
