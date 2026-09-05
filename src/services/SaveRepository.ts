import type { LessonAttempt, SaveDataV2, StoredSave } from '../domain/models';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class LocalStorageAdapter implements StorageAdapter {
  getItem(key: string): string | null { return window.localStorage.getItem(key); }
  setItem(key: string, value: string): void { window.localStorage.setItem(key, value); }
  removeItem(key: string): void { window.localStorage.removeItem(key); }
}

export class MemoryStorageAdapter implements StorageAdapter {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

export interface SaveKeys { primary: string; backup: string }

export type LoadResult =
  | { status: 'empty' }
  | { status: 'loaded'; save: SaveDataV2 }
  | { status: 'recovered'; save: SaveDataV2; notice: string }
  | { status: 'unrecoverable'; rawPrimary: string; rawBackup: string };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function isAttempt(value: unknown): value is LessonAttempt {
  if (!isObject(value)) return false;
  if (value.experience !== undefined && value.experience !== 'storybook-v1') return false;
  if (value.experience === 'storybook-v1') {
    const state = isObject(value.questState) ? value.questState.storybook : null;
    if (!isObject(state) || !Number.isInteger(state.sceneIndex) || Number(state.sceneIndex) < 0 || Number(state.sceneIndex) > 2
      || !['interact', 'compare', 'change', 'resolved'].includes(String(state.activity))
      || !Array.isArray(state.completedScenes) || !state.completedScenes.every((id) => ['sleepy-book', 'bookshelf', 'paper-boat'].includes(String(id)))
      || !isObject(state.attempts) || !Object.values(state.attempts).every((n) => Number.isInteger(n) && Number(n) >= 0)
      || !isObject(state.help) || !Object.values(state.help).every((v) => typeof v === 'boolean')
      || !Array.isArray(state.assisted) || !state.assisted.every((v) => typeof v === 'string')
      || !['sleepy-book', 'bookshelf', 'paper-boat'].includes(String(state.illustration))
      || (state.shelfChoice !== undefined && !['bell', 'handle'].includes(String(state.shelfChoice)))) return false;
  }
  return typeof value.attemptId === 'string'
    && value.lessonId === 'L01'
    && typeof value.attemptNumber === 'number'
    && isObject(value.seed)
    && typeof value.phase === 'string'
    && isObject(value.questState)
    && Array.isArray(value.adventureEvents)
    && isObject(value.inputs)
    && isObject(value.copyStatus)
    && typeof value.startedAt === 'string'
    && typeof value.updatedAt === 'string';
}

export function validateSaveData(value: unknown): value is StoredSave {
  if (!isObject(value) || ![1, 2].includes(Number(value.schemaVersion)) || typeof value.schemaVersion !== 'number') return false;
  if (!isObject(value.profile) || typeof value.profile.profileId !== 'string' || typeof value.profile.studentName !== 'string') return false;
  if (!isObject(value.settings)
    || !['normal', 'large'].includes(String(value.settings.textScale))
    || typeof value.settings.reducedMotion !== 'boolean'
    || typeof value.settings.soundEnabled !== 'boolean'
    || !['left', 'right'].includes(String(value.settings.inputHand))) return false;
  if (!isObject(value.progress) || !Array.isArray(value.progress.recoveredPages) || !isObject(value.progress.selectedAttemptByLesson)) return false;
  if (!isObject(value.attempts) || !Object.values(value.attempts).every(isAttempt)) return false;
  if (value.activeAttemptId !== undefined && typeof value.activeAttemptId !== 'string') return false;
  if (typeof value.activeAttemptId === 'string' && !value.attempts[value.activeAttemptId]) return false;
  return true;
}

function parseSave(raw: string | null): SaveDataV2 | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return validateSaveData(parsed) ? { ...parsed, schemaVersion: 2 } : null;
  } catch {
    return null;
  }
}

export class SaveRepository {
  constructor(private readonly storage: StorageAdapter, private readonly keys: SaveKeys, private readonly legacyKeys?: SaveKeys) {}

  load(): LoadResult {
    const rawPrimary = this.storage.getItem(this.keys.primary);
    const primary = parseSave(rawPrimary);
    if (primary) return { status: 'loaded', save: primary };

    const rawBackup = this.storage.getItem(this.keys.backup);
    const backup = parseSave(rawBackup);
    if (backup) {
      this.storage.setItem(this.keys.primary, JSON.stringify(backup));
      return { status: 'recovered', save: backup, notice: 'The last valid backup was restored.' };
    }

    if (rawPrimary === null && rawBackup === null) {
      if (this.legacyKeys && this.storage.getItem(`${this.keys.primary}.legacy-imported`) !== 'true') {
        const oldPrimary = this.storage.getItem(this.legacyKeys.primary);
        const oldBackup = this.storage.getItem(this.legacyKeys.backup);
        const imported = parseSave(oldPrimary) ?? parseSave(oldBackup);
        if (imported) {
          this.save(imported);
          this.storage.setItem(this.keys.backup, JSON.stringify(imported));
          this.storage.setItem(`${this.keys.primary}.legacy-imported`, 'true');
          return { status: 'recovered', save: imported, notice: 'Your saved stories are ready. The original save was kept safely.' };
        }
        if (oldPrimary !== null || oldBackup !== null) return { status: 'unrecoverable', rawPrimary: oldPrimary ?? '', rawBackup: oldBackup ?? '' };
      }
      return { status: 'empty' };
    }
    return { status: 'unrecoverable', rawPrimary: rawPrimary ?? '', rawBackup: rawBackup ?? '' };
  }

  save(candidate: StoredSave): void {
    if (!validateSaveData(candidate)) throw new Error('Refusing to save invalid application data.');
    const serialized = JSON.stringify({ ...candidate, schemaVersion: 2 });
    const currentRaw = this.storage.getItem(this.keys.primary);
    const current = parseSave(currentRaw);
    if (current && currentRaw) this.storage.setItem(this.keys.backup, currentRaw);
    this.storage.setItem(this.keys.primary, serialized);
    const readBack = parseSave(this.storage.getItem(this.keys.primary));
    if (!readBack) throw new Error('The saved data failed read-back validation.');
  }

  preserveDiagnostics(rawPrimary: string, rawBackup: string, timestamp: number): void {
    this.storage.setItem(`${this.keys.primary}.diagnostic.${timestamp}`, rawPrimary);
    this.storage.setItem(`${this.keys.backup}.diagnostic.${timestamp}`, rawBackup);
  }

  clear(): void {
    if (this.legacyKeys) this.storage.setItem(`${this.keys.primary}.legacy-imported`, 'true');
    this.storage.removeItem(this.keys.primary);
    this.storage.removeItem(this.keys.backup);
  }

  corruptPrimaryForTest(): void {
    this.storage.setItem(this.keys.primary, '{corrupt');
  }
}
