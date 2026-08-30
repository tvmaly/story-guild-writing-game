import { CHARACTER_IDS, DEFAULT_MANIFEST } from '../config';
import type { AudioCueConfig, CharacterVisualConfig, DirectionAnimation, GameManifestV1 } from '../domain/models';

export interface ManifestLoadResult {
  manifest: Readonly<GameManifestV1>;
  notice?: string;
}

const animationKeys: DirectionAnimation[] = [
  'idleUp', 'idleDown', 'idleLeft', 'idleRight',
  'walkUp', 'walkDown', 'walkLeft', 'walkRight',
];

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const finiteRange = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

function isCharacter(value: unknown): value is CharacterVisualConfig {
  if (!isObject(value) || typeof value.displayName !== 'string' || value.displayName.trim() === '') return false;
  if (typeof value.spriteUrl !== 'string' || value.spriteUrl.trim() === '' || value.spriteUrl.startsWith('/') || value.spriteUrl.includes('://')) return false;
  if (!finiteRange(value.frameWidth, 1, 256) || !finiteRange(value.frameHeight, 1, 256) || !finiteRange(value.scale, 0.25, 8)) return false;
  if (value.tint !== undefined && (typeof value.tint !== 'string' || !/^#[0-9a-f]{6}$/iu.test(value.tint))) return false;
  if (!isObject(value.animations)) return false;
  const animations = value.animations;
  return animationKeys.every((key) => {
    const frames = animations[key];
    return Array.isArray(frames) && frames.length > 0 && frames.every((frame: unknown) => Number.isInteger(frame) && (frame as number) >= 0);
  });
}

function isCue(value: unknown): value is AudioCueConfig {
  if (!isObject(value) || !Array.isArray(value.sources) || value.sources.length === 0) return false;
  if (!value.sources.every((source) => typeof source === 'string' && source !== '' && !source.startsWith('/') && !source.includes('://'))) return false;
  if (!finiteRange(value.volume, 0, 1)) return false;
  return value.loop === undefined || typeof value.loop === 'boolean';
}

export function validateManifest(value: unknown): value is GameManifestV1 {
  if (!isObject(value) || value.schemaVersion !== 1 || !isObject(value.characters) || !isObject(value.audio)) return false;
  const characters = value.characters;
  if (!CHARACTER_IDS.every((id) => isCharacter(characters[id]))) return false;
  if (value.audio.enabledByDefault !== false || !finiteRange(value.audio.masterVolume, 0, 1) || !isObject(value.audio.cues)) return false;
  return Object.values(value.audio.cues).every(isCue);
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((child) => deepFreeze(child));
  }
  return value;
}

export class ConfigRepository {
  constructor(private readonly fetcher: typeof fetch = globalThis.fetch.bind(globalThis)) {}

  async load(baseUrl: string, path: string): Promise<ManifestLoadResult> {
    try {
      const url = new URL(`${baseUrl}${path}`, window.location.origin).toString();
      const response = await this.fetcher(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const candidate: unknown = await response.json();
      if (!validateManifest(candidate)) throw new Error('manifest validation failed');
      return { manifest: deepFreeze(candidate) };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      return {
        manifest: deepFreeze(structuredClone(DEFAULT_MANIFEST)),
        notice: `Character and sound configuration could not be loaded (${reason}). Safe defaults are active.`,
      };
    }
  }
}
