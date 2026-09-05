import type { CharacterId, CharacterVisualConfig, GameManifestV1 } from './domain/models';
import { STORYBOOK_IMAGES } from './domain/storybook';

export const APP_CONFIG = Object.freeze({
  appName: 'The Story Guild: Twelve Quests',
  storageKeys: Object.freeze({
    normal: Object.freeze({ primary: 'storyGuild.save.v2', backup: 'storyGuild.backup.v2' }),
    test: Object.freeze({ primary: 'storyGuild.test.save.v2', backup: 'storyGuild.test.backup.v2' }),
    legacy: Object.freeze({ primary: 'storyGuild.save.v1', backup: 'storyGuild.backup.v1' }),
    legacyTest: Object.freeze({ primary: 'storyGuild.test.save.v1', backup: 'storyGuild.test.backup.v1' }),
  }),
  manifestPath: 'config/game.json',
  internalWidth: 1024,
  internalHeight: 768,
  tileSize: 16,
  autosaveMs: 500,
  parentHoldMs: 1200,
  childBubbleWordLimit: 20,
  attribution: 'Writing-course framework adapted from openly licensed materials by Laura Gibbs. Course-derived content is shared under CC BY-NC-SA 4.0.',
});

const frames = {
  idleDown: [0], walkDown: [0, 1, 2],
  idleLeft: [3], walkLeft: [3, 4, 5],
  idleRight: [6], walkRight: [6, 7, 8],
  idleUp: [9], walkUp: [9, 10, 11],
} as const;

const character = (displayName: string, tint?: string): CharacterVisualConfig => ({
  displayName,
  spriteUrl: 'assets/sprites/adventurer.png',
  frameWidth: 16,
  frameHeight: 16,
  scale: 1,
  ...(tint ? { tint } : {}),
  animations: {
    idleUp: [...frames.idleUp], idleDown: [...frames.idleDown],
    idleLeft: [...frames.idleLeft], idleRight: [...frames.idleRight],
    walkUp: [...frames.walkUp], walkDown: [...frames.walkDown],
    walkLeft: [...frames.walkLeft], walkRight: [...frames.walkRight],
  },
});

export const DEFAULT_MANIFEST: GameManifestV1 = {
  schemaVersion: 1,
  characters: {
    player: character('Apprentice', '#f5c451'),
    rowan: character('Rowan', '#ef8354'),
    pip: character('Pip', '#63c7da'),
    mira: character('Mira', '#c17ae0'),
    tink: character('Tink', '#86c06c'),
    sage: character('Sage', '#f1e7c5'),
  },
  audio: {
    enabledByDefault: false,
    masterVolume: 0.7,
    cues: {},
  },
  storybook: { images: STORYBOOK_IMAGES },
};

export const CHARACTER_IDS: CharacterId[] = ['player', 'rowan', 'pip', 'mira', 'tink', 'sage'];
