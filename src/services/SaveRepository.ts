import type { LessonAttempt, SaveDataV1 } from '../domain/models';

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
  | { status: 'loaded'; save: SaveDataV1 }
  | { status: 'recovered'; save: SaveDataV1; notice: string }
  | { status: 'unrecoverable'; rawPrimary: string; rawBackup: string };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function isAttempt(value: unknown): value is LessonAttempt {
  if (!isObject(value)) return false;
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

export function validateSaveData(value: unknown): value is SaveDataV1 {
  if (!isObject(value) || value.schemaVersion !== 1) return false;
  if (!isObject(value.profile) || typeof value.profile.profileId !== 'string' || typeof value.profile.studentName !== 'string') return false;
  if (!isObject(value.settings) || typeof value.settings.soundEnabled !== 'boolean') return false;
  if (!isObject(value.progress) || !Array.isArray(value.progress.recoveredPages) || !isObject(value.progress.selectedAttemptByLesson)) return false;
  if (!isObject(value.attempts) || !Object.values(value.attempts).every(isAttempt)) return false;
  if (value.activeAttemptId !== undefined && typeof value.activeAttemptId !== 'string') return false;
  return true;
}

function parseSave(raw: string | null): SaveDataV1 | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return validateSaveData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export class SaveRepository {
  constructor(private readonly storage: StorageAdapter, private readonly keys: SaveKeys) {}

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

    if (rawPrimary === null && rawBackup === null) return { status: 'empty' };
    return { status: 'unrecoverable', rawPrimary: rawPrimary ?? '', rawBackup: rawBackup ?? '' };
  }

  save(candidate: SaveDataV1): void {
    if (!validateSaveData(candidate)) throw new Error('Refusing to save invalid application data.');
    const serialized = JSON.stringify(candidate);
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
    this.storage.removeItem(this.keys.primary);
    this.storage.removeItem(this.keys.backup);
  }

  corruptPrimaryForTest(): void {
    this.storage.setItem(this.keys.primary, '{corrupt');
  }
}
