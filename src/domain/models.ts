export type LessonId =
  | 'L01' | 'L02' | 'L03' | 'L04' | 'L05' | 'L06'
  | 'L07' | 'L08' | 'L09' | 'L10' | 'L11' | 'L12';

export type AppPhase =
  | 'boot'
  | 'onboarding'
  | 'resumePrompt'
  | 'hub'
  | 'questBriefing'
  | 'explore'
  | 'puzzle'
  | 'reflection'
  | 'writing'
  | 'review'
  | 'celebration'
  | 'copy'
  | 'complete'
  | 'parent'
  | 'printPreview'
  | 'storageError';

export type QuestPhase = Extract<AppPhase,
  'questBriefing' | 'explore' | 'puzzle' | 'reflection' | 'writing' | 'review' | 'celebration' | 'copy' | 'complete'>;

export type CharacterId = 'player' | 'rowan' | 'pip' | 'mira' | 'tink' | 'sage';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type DirectionAnimation =
  | 'idleUp' | 'idleDown' | 'idleLeft' | 'idleRight'
  | 'walkUp' | 'walkDown' | 'walkLeft' | 'walkRight';

export type AudioCueId =
  | 'uiActivate'
  | 'uiBack'
  | 'interaction'
  | 'puzzleSuccess'
  | 'puzzleRetry'
  | 'pageRecovered'
  | 'hubLoop'
  | 'questLoop';

export interface CharacterVisualConfig {
  displayName: string;
  spriteUrl: string;
  frameWidth: number;
  frameHeight: number;
  scale: number;
  tint?: string;
  animations: Record<DirectionAnimation, number[]>;
}

export interface AudioCueConfig {
  sources: string[];
  volume: number;
  loop?: boolean;
}

export interface GameManifestV1 {
  schemaVersion: 1;
  characters: Record<CharacterId, CharacterVisualConfig>;
  audio: {
    enabledByDefault: false;
    masterVolume: number;
    cues: Partial<Record<AudioCueId, AudioCueConfig>>;
  };
  storybook?: { images: Record<string, string> };
}

export type StorySceneId = 'sleepy-book' | 'bookshelf' | 'paper-boat';
export type ShelfChoice = 'bell' | 'handle';
export type StoryActivity = 'interact' | 'compare' | 'change' | 'resolved';

export interface StorybookProgress {
  sceneIndex: number;
  activity: StoryActivity;
  shelfChoice?: ShelfChoice;
  completedScenes: StorySceneId[];
  attempts: Record<string, number>;
  help: Record<string, boolean>;
  assisted: string[];
  illustration: StorySceneId;
}

export interface StorySeed {
  numericSeed: number;
  character: string;
  goal: string;
  trouble: string;
  action: string;
  result: string;
}

export interface AdventureEvent {
  id: string;
  sequence: number;
  actorId: string;
  actionId: string;
  resultId: string;
  objectId?: string;
  childChoiceId?: string;
}

export interface TabletDefinition {
  id: string;
  text: string;
  isStory: boolean;
  canonical: boolean;
  change?: string;
}

export interface QuestOneState {
  playerMap: 'hub' | 'quest1';
  playerX: number;
  playerY: number;
  tabletIds: string[];
  classifications: Record<string, boolean>;
  unsuccessfulAttempts: Record<string, number>;
  activeTabletId?: string;
  reflectionIndex: number;
  writingIndex: number;
  storybook?: StorybookProgress;
}

export interface CopyStatus {
  startedAt?: string;
  completedAt?: string;
  parentReviewed?: boolean;
}

export interface LessonArtifact {
  lessonId: 'L01';
  planning: Record<'somebody' | 'wanted' | 'but' | 'so' | 'then', string>;
  storyText: string;
  wordCount: number;
}

export interface LessonAttempt {
  attemptId: string;
  lessonId: 'L01';
  attemptNumber: number;
  seed: StorySeed;
  phase: QuestPhase;
  questState: QuestOneState;
  adventureEvents: AdventureEvent[];
  inputs: Record<string, string>;
  artifact: LessonArtifact | null;
  copyStatus: CopyStatus;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  experience?: 'storybook-v1';
}

export interface SaveDataV1 {
  schemaVersion: 1;
  profile: {
    profileId: string;
    studentName: string;
    createdAt: string;
    updatedAt: string;
  };
  settings: {
    textScale: 'normal' | 'large';
    reducedMotion: boolean;
    soundEnabled: boolean;
    inputHand: 'left' | 'right';
  };
  progress: {
    highestUnlockedLesson: LessonId;
    recoveredPages: LessonId[];
    selectedAttemptByLesson: Partial<Record<LessonId, string>>;
  };
  activeAttemptId?: string;
  attempts: Record<string, LessonAttempt>;
}

export interface SaveDataV2 extends Omit<SaveDataV1, 'schemaVersion'> { schemaVersion: 2 }
export type StoredSave = SaveDataV1 | SaveDataV2;

export interface AppState {
  phase: AppPhase;
  save: SaveDataV2 | null;
  recoveryNotice?: string;
  configNotice?: string;
}

export interface CourseLessonSummary {
  id: LessonId;
  order: number;
  title: string;
  studentGoal: string;
}
