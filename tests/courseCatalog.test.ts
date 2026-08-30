import { describe, expect, it } from 'vitest';
import { COURSE_SUMMARIES, REFLECTION_PROMPTS, WRITING_PROMPTS } from '../src/domain/courseCatalog';

describe('course catalog foundation', () => {
  it('contains twelve ordered unique lesson summaries', () => {
    expect(COURSE_SUMMARIES).toHaveLength(12);
    expect(new Set(COURSE_SUMMARIES.map((lesson) => lesson.id)).size).toBe(12);
    expect(COURSE_SUMMARIES.map((lesson) => lesson.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('keeps child-facing Quest 1 prompts within twenty words', () => {
    const prompts = [...REFLECTION_PROMPTS, ...WRITING_PROMPTS];
    expect(prompts.every((item) => item.prompt.trim().split(/\s+/u).length <= 20)).toBe(true);
  });
});
