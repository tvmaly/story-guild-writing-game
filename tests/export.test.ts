import { describe, expect, it } from 'vitest';
import type { LessonAttempt, SaveDataV1 } from '../src/domain/models';
import { createQuestOnePrintModel, renderPrintHtml } from '../src/services/ExportService';

const attempt: LessonAttempt = {
  attemptId: 'a', lessonId: 'L01', attemptNumber: 1,
  seed: { numericSeed: 1, character: '<robot>', goal: 'find a key', trouble: 'rain', action: 'searched', result: 'found it' },
  phase: 'complete', questState: { playerMap: 'quest1', playerX: 1, playerY: 1, tabletIds: [], classifications: {}, unsuccessfulAttempts: {}, reflectionIndex: 3, writingIndex: 5 },
  adventureEvents: [], inputs: {}, artifact: { lessonId: 'L01', planning: { somebody: 'x', wanted: 'x', but: 'x', so: 'x', then: 'x' }, storyText: '<img src=x onerror=alert(1)>', wordCount: 4 },
  copyStatus: { completedAt: '2026-01-01' }, startedAt: '2026-01-01', updatedAt: '2026-01-01', completedAt: '2026-01-01',
};
const save: SaveDataV1 = {
  schemaVersion: 1, profile: { profileId: 'p', studentName: '<Writer>', createdAt: '', updatedAt: '' },
  settings: { textScale: 'normal', reducedMotion: false, soundEnabled: false, inputHand: 'right' },
  progress: { highestUnlockedLesson: 'L02', recoveredPages: ['L01'], selectedAttemptByLesson: { L01: 'a' } }, attempts: { a: attempt },
};

describe('print export', () => {
  it('escapes all child-controlled values and includes attribution', () => {
    const html = renderPrintHtml(createQuestOnePrintModel(save, attempt));
    expect(html).toContain('&lt;Writer&gt;');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('Laura Gibbs');
  });
});
