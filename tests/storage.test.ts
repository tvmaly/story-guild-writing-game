import { describe, expect, it } from 'vitest';
import type { LessonAttempt, SaveDataV1 } from '../src/domain/models';
import { MemoryStorageAdapter, SaveRepository, validateSaveData } from '../src/services/SaveRepository';

const attempt = (): LessonAttempt => ({
  attemptId: 'L01-1-test', lessonId: 'L01', attemptNumber: 1,
  seed: { numericSeed: 1, character: 'robot', goal: 'key', trouble: 'rain', action: 'searched', result: 'found it' },
  phase: 'writing',
  questState: { playerMap: 'quest1', playerX: 2, playerY: 2, tabletIds: [], classifications: {}, unsuccessfulAttempts: {}, reflectionIndex: 0, writingIndex: 0 },
  adventureEvents: [], inputs: { finalStory: 'saved words' }, artifact: null, copyStatus: {},
  startedAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
});

const save = (name = 'Writer'): SaveDataV1 => ({
  schemaVersion: 1,
  profile: { profileId: 'p1', studentName: name, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  settings: { textScale: 'normal', reducedMotion: false, soundEnabled: false, inputHand: 'right' },
  progress: { highestUnlockedLesson: 'L01', recoveredPages: [], selectedAttemptByLesson: {} },
  activeAttemptId: 'L01-1-test', attempts: { 'L01-1-test': attempt() },
});

describe('SaveRepository', () => {
  it('round trips valid saves', () => {
    const storage = new MemoryStorageAdapter();
    const repository = new SaveRepository(storage, { primary: 'primary', backup: 'backup' });
    repository.save(save());
    expect(repository.load()).toMatchObject({ status: 'loaded', save: { profile: { studentName: 'Writer' } } });
  });

  it('recovers a corrupted primary from the last valid backup', () => {
    const storage = new MemoryStorageAdapter();
    const repository = new SaveRepository(storage, { primary: 'primary', backup: 'backup' });
    repository.save(save('First'));
    repository.save(save('Second'));
    repository.corruptPrimaryForTest();
    expect(repository.load()).toMatchObject({ status: 'recovered', save: { profile: { studentName: 'First' } } });
  });

  it('does not silently discard two corrupt saves', () => {
    const storage = new MemoryStorageAdapter();
    storage.setItem('primary', '{bad');
    storage.setItem('backup', '{also-bad');
    const repository = new SaveRepository(storage, { primary: 'primary', backup: 'backup' });
    expect(repository.load()).toMatchObject({ status: 'unrecoverable' });
  });

  it('rejects unsupported future schemas', () => {
    expect(validateSaveData({ ...save(), schemaVersion: 3 })).toBe(false);
  });

  it('rejects invalid persisted accessibility settings', () => {
    const invalidScale = structuredClone(save()) as unknown as { settings: Record<string, unknown> };
    invalidScale.settings.textScale = 'huge';
    expect(validateSaveData(invalidScale)).toBe(false);

    const invalidMotion = structuredClone(save()) as unknown as { settings: Record<string, unknown> };
    invalidMotion.settings.reducedMotion = 'yes';
    expect(validateSaveData(invalidMotion)).toBe(false);
  });

  it('imports the old unfinished attempt without modifying either original save', () => {
    const storage = new MemoryStorageAdapter();
    const original = JSON.stringify(save());
    storage.setItem('old', original); storage.setItem('old-backup', original);
    const repository = new SaveRepository(storage, { primary: 'new', backup: 'new-backup' }, { primary: 'old', backup: 'old-backup' });
    expect(repository.load()).toMatchObject({ status: 'recovered', save: { schemaVersion: 2, attempts: { 'L01-1-test': { phase: 'writing', inputs: { finalStory: 'saved words' } } } } });
    expect(storage.getItem('old')).toBe(original); expect(storage.getItem('old-backup')).toBe(original);
    repository.clear(); expect(repository.load()).toEqual({ status: 'empty' });
    expect(storage.getItem('old')).toBe(original);
  });

  it('does not fall back to an older version when both new saves are corrupt', () => {
    const storage = new MemoryStorageAdapter(); storage.setItem('old', JSON.stringify(save()));
    storage.setItem('new', '{bad'); storage.setItem('new-backup', '{bad');
    expect(new SaveRepository(storage, { primary: 'new', backup: 'new-backup' }, { primary: 'old', backup: 'old-backup' }).load().status).toBe('unrecoverable');
  });
});
