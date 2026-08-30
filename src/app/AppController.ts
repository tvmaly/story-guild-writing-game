import { ActionQueue } from '../core/ActionQueue';
import { EventBus } from '../core/EventBus';
import { hashSeed } from '../core/SeededRng';
import { generateStorySeed, REFLECTION_PROMPTS, selectQuestOneTablets, tabletById, WRITING_PROMPTS } from '../domain/courseCatalog';
import type { AppPhase, AppState, Direction, LessonArtifact, LessonAttempt, SaveDataV1 } from '../domain/models';
import { countWords } from '../domain/WordCountService';
import { AppStateMachine } from './AppStateMachine';
import type { LoadResult } from '../services/SaveRepository';
import { SaveRepository } from '../services/SaveRepository';

export interface Clock { now(): Date }
export class SystemClock implements Clock { now(): Date { return new Date(); } }

export interface ControllerOptions {
  repository: SaveRepository;
  bus: EventBus;
  clock?: Clock;
  configNotice?: string;
}

const createDefaultSave = (studentName: string, now: Date, soundEnabled = false): SaveDataV1 => {
  const timestamp = now.toISOString();
  const profileId = `profile-${now.getTime().toString(36)}`;
  return {
    schemaVersion: 1,
    profile: { profileId, studentName, createdAt: timestamp, updatedAt: timestamp },
    settings: { textScale: 'normal', reducedMotion: false, soundEnabled, inputHand: 'right' },
    progress: { highestUnlockedLesson: 'L01', recoveredPages: [], selectedAttemptByLesson: {} },
    attempts: {},
  };
};

const activeAttempt = (save: SaveDataV1): LessonAttempt => {
  if (!save.activeAttemptId) throw new Error('There is no active quest attempt.');
  const attempt = save.attempts[save.activeAttemptId];
  if (!attempt) throw new Error('The active quest attempt is missing.');
  return attempt;
};

export class AppController {
  private state: AppState;
  private readonly queue = new ActionQueue();
  private readonly stateMachine = new AppStateMachine();
  private readonly clock: Clock;
  private unrecoverable: Extract<LoadResult, { status: 'unrecoverable' }> | null = null;

  constructor(private readonly options: ControllerOptions) {
    this.clock = options.clock ?? new SystemClock();
    this.state = {
      phase: 'boot',
      save: null,
      ...(options.configNotice ? { configNotice: options.configNotice } : {}),
    };
  }

  getState(): Readonly<AppState> { return this.state; }

  boot(): void {
    const result = this.options.repository.load();
    if (result.status === 'empty') {
      this.replaceBootState('onboarding', null);
      return;
    }
    if (result.status === 'unrecoverable') {
      this.unrecoverable = result;
      this.replaceBootState('storageError', null);
      return;
    }
    const phase: AppPhase = result.save.activeAttemptId ? 'resumePrompt' : 'hub';
    this.state = {
      phase: this.stateMachine.transition('boot', phase),
      save: result.save,
      ...(result.status === 'recovered' ? { recoveryNotice: result.notice } : {}),
      ...(this.options.configNotice ? { configNotice: this.options.configNotice } : {}),
    };
    this.emitCommitted();
  }

  private replaceBootState(phase: 'onboarding' | 'storageError', save: SaveDataV1 | null): void {
    this.state = {
      phase: this.stateMachine.transition('boot', phase),
      save,
      ...(this.options.configNotice ? { configNotice: this.options.configNotice } : {}),
    };
    this.emitCommitted();
  }

  private emitCommitted(): void {
    document.body.dataset.appPhase = this.state.phase;
    const lessonId = this.state.save?.activeAttemptId ? 'L01' : '';
    document.body.dataset.lessonId = lessonId;
    this.options.bus.emit('STATE_COMMITTED', this.state);
  }

  private async mutate(mutator: (save: SaveDataV1) => void, nextPhase?: AppPhase): Promise<void> {
    return this.queue.enqueue(async () => {
      if (!this.state.save) throw new Error('A student profile is required.');
      const candidate = structuredClone(this.state.save);
      mutator(candidate);
      candidate.profile.updatedAt = this.clock.now().toISOString();
      let phase = this.state.phase;
      if (nextPhase && nextPhase !== phase) phase = this.stateMachine.transition(phase, nextPhase);
      this.options.repository.save(candidate);
      this.state = {
        phase,
        save: candidate,
        ...(this.state.recoveryNotice ? { recoveryNotice: this.state.recoveryNotice } : {}),
        ...(this.state.configNotice ? { configNotice: this.state.configNotice } : {}),
      };
      this.options.bus.emit('SAVE_COMMITTED', this.state);
      this.emitCommitted();
    });
  }

  async createProfile(studentName: string, soundEnabled = false): Promise<void> {
    const cleanName = studentName.trim();
    if (!cleanName) throw new Error('Enter the writer’s name.');
    const save = createDefaultSave(cleanName, this.clock.now(), soundEnabled);
    this.options.repository.save(save);
    this.state = {
      phase: this.stateMachine.transition(this.state.phase, 'hub'),
      save,
      ...(this.state.configNotice ? { configNotice: this.state.configNotice } : {}),
    };
    this.options.bus.emit('SAVE_COMMITTED', this.state);
    this.emitCommitted();
  }

  async confirmStorageReset(confirmation: string): Promise<void> {
    if (confirmation !== 'RESET' || !this.unrecoverable) throw new Error('Type RESET to preserve the damaged data and begin again.');
    this.options.repository.preserveDiagnostics(this.unrecoverable.rawPrimary, this.unrecoverable.rawBackup, this.clock.now().getTime());
    this.options.repository.clear();
    this.unrecoverable = null;
    this.state = {
      phase: this.stateMachine.transition('storageError', 'onboarding'),
      save: null,
      recoveryNotice: 'Damaged save data was preserved under diagnostic storage keys.',
      ...(this.state.configNotice ? { configNotice: this.state.configNotice } : {}),
    };
    this.emitCommitted();
  }

  async startQuest(debugSeed?: number): Promise<void> {
    await this.mutate((save) => {
      const attemptNumber = Object.values(save.attempts).filter((attempt) => attempt.lessonId === 'L01').length + 1;
      const numericSeed = debugSeed ?? hashSeed(`${save.profile.profileId}:L01:${attemptNumber}`);
      const timestamp = this.clock.now().toISOString();
      const attemptId = `L01-${attemptNumber}-${numericSeed.toString(36)}`;
      const tablets = selectQuestOneTablets(numericSeed, attemptNumber);
      const attempt: LessonAttempt = {
        attemptId,
        lessonId: 'L01',
        attemptNumber,
        seed: generateStorySeed(numericSeed),
        phase: 'questBriefing',
        questState: {
          playerMap: 'quest1',
          playerX: 2,
          playerY: 12,
          tabletIds: tablets.map((tablet) => tablet.id),
          classifications: {},
          unsuccessfulAttempts: {},
          reflectionIndex: 0,
          writingIndex: 0,
        },
        adventureEvents: [],
        inputs: {},
        artifact: null,
        copyStatus: {},
        startedAt: timestamp,
        updatedAt: timestamp,
      };
      save.attempts[attemptId] = attempt;
      save.activeAttemptId = attemptId;
    }, 'questBriefing');
  }

  async beginQuest(): Promise<void> {
    await this.mutate((save) => { activeAttempt(save).phase = 'explore'; }, 'explore');
  }

  async resumeQuest(): Promise<void> {
    const save = this.state.save;
    if (!save) throw new Error('No saved quest is available.');
    const phase = activeAttempt(save).phase;
    await this.mutate(() => undefined, phase);
  }

  async goToHub(): Promise<void> {
    await this.mutate((save) => {
      const attempt = save.activeAttemptId ? save.attempts[save.activeAttemptId] : undefined;
      if (attempt?.phase === 'complete') delete save.activeAttemptId;
    }, 'hub');
  }

  async updatePlayerPosition(x: number, y: number, direction: Direction): Promise<void> {
    await this.mutate((save) => {
      const attempt = activeAttempt(save);
      attempt.questState.playerX = x;
      attempt.questState.playerY = y;
      attempt.updatedAt = this.clock.now().toISOString();
      attempt.inputs.lastDirection = direction;
    });
  }

  async openTablet(tabletId: string): Promise<void> {
    await this.mutate((save) => {
      const attempt = activeAttempt(save);
      if (!attempt.questState.tabletIds.includes(tabletId)) throw new Error('That tablet is not part of this quest.');
      attempt.questState.activeTabletId = tabletId;
      attempt.phase = 'puzzle';
    }, 'puzzle');
  }

  async classifyActiveTablet(asStory: boolean): Promise<{ correct: boolean; hint?: string }> {
    let result: { correct: boolean; hint?: string } = { correct: false };
    await this.mutate((save) => {
      const attempt = activeAttempt(save);
      const tabletId = attempt.questState.activeTabletId;
      const tablet = tabletId ? tabletById(tabletId) : undefined;
      if (!tabletId || !tablet) throw new Error('Choose a tablet before classifying it.');
      const sequence = attempt.adventureEvents.length + 1;
      if (tablet.isStory !== asStory) {
        const failures = (attempt.questState.unsuccessfulAttempts[tabletId] ?? 0) + 1;
        attempt.questState.unsuccessfulAttempts[tabletId] = failures;
        attempt.adventureEvents.push({ id: `event-${sequence}`, sequence, actorId: 'player', actionId: 'classify', objectId: tabletId, resultId: 'try-again', childChoiceId: asStory ? 'story' : 'not-yet' });
        result = { correct: false, ...(failures >= 2 ? { hint: 'Ask: did something happen, and did anything change?' } : {}) };
        return;
      }
      attempt.questState.classifications[tabletId] = asStory;
      delete attempt.questState.activeTabletId;
      attempt.adventureEvents.push({ id: `event-${sequence}`, sequence, actorId: 'player', actionId: 'classify', objectId: tabletId, resultId: 'correct', childChoiceId: asStory ? 'story' : 'not-yet' });
      result = { correct: true };
      const complete = attempt.questState.tabletIds.every((id) => id in attempt.questState.classifications);
      attempt.phase = complete ? 'reflection' : 'explore';
    }, this.willPuzzleComplete(asStory) ? 'reflection' : this.isClassificationCorrect(asStory) ? 'explore' : undefined);
    return result;
  }

  private isClassificationCorrect(asStory: boolean): boolean {
    const save = this.state.save;
    if (!save) return false;
    const attempt = activeAttempt(save);
    const tablet = attempt.questState.activeTabletId ? tabletById(attempt.questState.activeTabletId) : undefined;
    return tablet?.isStory === asStory;
  }

  private willPuzzleComplete(asStory: boolean): boolean {
    const save = this.state.save;
    if (!save) return false;
    const attempt = activeAttempt(save);
    if (!this.isClassificationCorrect(asStory)) return false;
    return attempt.questState.tabletIds.every((id) => id === attempt.questState.activeTabletId || id in attempt.questState.classifications);
  }

  async saveInput(key: string, value: string): Promise<void> {
    await this.mutate((save) => {
      const attempt = activeAttempt(save);
      attempt.inputs[key] = value;
      attempt.updatedAt = this.clock.now().toISOString();
    });
  }

  async advanceReflection(): Promise<void> {
    const save = this.state.save;
    if (!save) throw new Error('No active reflection.');
    const attempt = activeAttempt(save);
    const prompt = REFLECTION_PROMPTS[attempt.questState.reflectionIndex];
    if (!prompt || !(attempt.inputs[prompt.key] ?? '').trim()) throw new Error('Answer this question before moving on.');
    const finished = attempt.questState.reflectionIndex === REFLECTION_PROMPTS.length - 1;
    await this.mutate((candidate) => {
      const changing = activeAttempt(candidate);
      if (finished) changing.phase = 'writing';
      else changing.questState.reflectionIndex += 1;
    }, finished ? 'writing' : undefined);
  }

  async advanceWriting(): Promise<void> {
    const save = this.state.save;
    if (!save) throw new Error('No active writing session.');
    const attempt = activeAttempt(save);
    const index = attempt.questState.writingIndex;
    if (index < WRITING_PROMPTS.length) {
      const prompt = WRITING_PROMPTS[index];
      if (!prompt || !(attempt.inputs[prompt.key] ?? '').trim()) throw new Error('Write a short answer before moving on.');
      await this.mutate((candidate) => { activeAttempt(candidate).questState.writingIndex += 1; });
      return;
    }
    const storyText = (attempt.inputs.finalStory ?? '').trim();
    const wordCount = countWords(storyText);
    if (wordCount < 6 || wordCount > 12) throw new Error('Your tiny story needs 6 to 12 words.');
    await this.mutate((candidate) => {
      const changing = activeAttempt(candidate);
      const planning = {
        somebody: changing.inputs.somebody?.trim() ?? '',
        wanted: changing.inputs.wanted?.trim() ?? '',
        but: changing.inputs.but?.trim() ?? '',
        so: changing.inputs.so?.trim() ?? '',
        then: changing.inputs.then?.trim() ?? '',
      };
      const artifact: LessonArtifact = { lessonId: 'L01', planning, storyText, wordCount };
      changing.artifact = artifact;
      changing.phase = 'review';
    }, 'review');
  }

  async editFromReview(): Promise<void> {
    await this.mutate((save) => {
      const attempt = activeAttempt(save);
      attempt.questState.writingIndex = WRITING_PROMPTS.length;
      attempt.phase = 'writing';
    }, 'writing');
  }

  async openCopy(): Promise<void> {
    await this.mutate((save) => {
      const attempt = activeAttempt(save);
      if (!attempt.artifact) throw new Error('Review the story before opening copy mode.');
      attempt.phase = 'copy';
      attempt.copyStatus.startedAt ??= this.clock.now().toISOString();
    }, 'copy');
  }

  async returnToReview(): Promise<void> {
    await this.mutate((save) => { activeAttempt(save).phase = 'review'; }, 'review');
  }

  async completeCopy(): Promise<void> {
    await this.mutate((save) => {
      const attempt = activeAttempt(save);
      const timestamp = this.clock.now().toISOString();
      attempt.copyStatus.completedAt = timestamp;
      attempt.completedAt = timestamp;
      attempt.phase = 'complete';
      if (!save.progress.recoveredPages.includes('L01')) save.progress.recoveredPages.push('L01');
      save.progress.highestUnlockedLesson = 'L02';
      save.progress.selectedAttemptByLesson.L01 = attempt.attemptId;
    }, 'complete');
  }

  async openParent(): Promise<void> { await this.mutate(() => undefined, 'parent'); }
  async closeParent(): Promise<void> { await this.mutate(() => undefined, 'hub'); }
  async openPrintPreview(): Promise<void> { await this.mutate(() => undefined, 'printPreview'); }
  async closePrintPreview(): Promise<void> { await this.mutate(() => undefined, 'parent'); }

  async reopenCopy(attemptId: string): Promise<void> {
    await this.mutate((save) => {
      const attempt = save.attempts[attemptId];
      if (!attempt?.artifact) throw new Error('That attempt has no writing to copy.');
      save.activeAttemptId = attemptId;
      attempt.phase = 'copy';
    }, 'copy');
  }

  async updateStudentName(name: string): Promise<void> {
    const clean = name.trim();
    if (!clean) throw new Error('The writer’s name cannot be blank.');
    await this.mutate((save) => { save.profile.studentName = clean; });
  }

  async setSoundEnabled(enabled: boolean): Promise<void> {
    await this.mutate((save) => { save.settings.soundEnabled = enabled; });
  }

  async setTextScale(scale: SaveDataV1['settings']['textScale']): Promise<void> {
    await this.mutate((save) => { save.settings.textScale = scale; });
  }

  async setReducedMotion(enabled: boolean): Promise<void> {
    await this.mutate((save) => { save.settings.reducedMotion = enabled; });
  }

  async resetProgress(confirmation: string): Promise<void> {
    if (confirmation !== 'RESET') throw new Error('Type RESET to clear progress.');
    this.options.repository.clear();
    this.state = {
      phase: 'onboarding',
      save: null,
      ...(this.state.configNotice ? { configNotice: this.state.configNotice } : {}),
    };
    this.emitCommitted();
  }

  getActiveAttempt(): LessonAttempt | null {
    const save = this.state.save;
    if (!save?.activeAttemptId) return null;
    return save.attempts[save.activeAttemptId] ?? null;
  }

  async fastCompleteQuestOne(storyText = 'Robot sought keys, but rain fell, so kindness opened doors.'): Promise<void> {
    if (this.state.phase === 'hub') await this.startQuest(12345);
    if (this.state.phase === 'questBriefing') await this.beginQuest();
    let attempt = this.getActiveAttempt();
    if (!attempt) throw new Error('Fast completion could not create an attempt.');
    for (const id of attempt.questState.tabletIds) {
      if (id in attempt.questState.classifications) continue;
      await this.openTablet(id);
      const tablet = tabletById(id);
      if (!tablet) throw new Error('Unknown tablet fixture.');
      await this.classifyActiveTablet(tablet.isStory);
    }
    for (const prompt of REFLECTION_PROMPTS) {
      attempt = this.getActiveAttempt();
      if (!attempt) throw new Error('Missing attempt.');
      if (attempt.questState.reflectionIndex >= REFLECTION_PROMPTS.length) break;
      await this.saveInput(prompt.key, 'A character changed the situation.');
      await this.advanceReflection();
    }
    for (const prompt of WRITING_PROMPTS) {
      await this.saveInput(prompt.key, 'a short idea');
      await this.advanceWriting();
    }
    await this.saveInput('finalStory', storyText);
    await this.advanceWriting();
    await this.openCopy();
    await this.completeCopy();
  }
}
