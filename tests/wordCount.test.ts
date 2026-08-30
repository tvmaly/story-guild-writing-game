import { describe, expect, it } from 'vitest';
import { countWords } from '../src/domain/WordCountService';

describe('WordCountService', () => {
  it.each([
    ['', 0],
    ['   \n ', 0],
    ["can't", 1],
    ['12', 1],
    ['Hello, world!', 2],
    ['one   two\nthree', 3],
  ])('counts %j as %i', (text, expected) => expect(countWords(text)).toBe(expected));

  it('counts exact course boundaries', () => {
    for (const size of [6, 25, 50, 100]) {
      expect(countWords(Array.from({ length: size }, (_, index) => `w${index}`).join(' '))).toBe(size);
    }
  });
});
