import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '../src/app/AppController';
import { EventBus } from '../src/core/EventBus';
import { comparisonChoices, currentScene, sceneImage } from '../src/domain/storybook';
import { MemoryStorageAdapter, SaveRepository } from '../src/services/SaveRepository';
import { createQuestOnePrintModel, renderPrintHtml } from '../src/services/ExportService';

beforeEach(() => vi.stubGlobal('document', { body: { dataset: {} } }));

async function setup() {
  const storage = new MemoryStorageAdapter();
  const repository = new SaveRepository(storage, { primary: 'p', backup: 'b' });
  const bus = new EventBus();
  const controller = new AppController({ repository, bus });
  controller.boot(); await controller.createProfile('River'); await controller.startQuest(77); await controller.beginQuest();
  return { storage, repository, bus, controller };
}
async function finishScene(controller: AppController, action: string) {
  await controller.interactWithScene(action);
  await controller.answerScene('after');
  await controller.answerScene(currentScene(controller.getActiveAttempt()!).changedId);
  await controller.continueScene();
}

describe('Pip and the Runaway Page', () => {
  it.each(['bell', 'handle'] as const)('remembers the %s branch in pictures, examples, and print', async (choice) => {
    const { controller } = await setup();
    await finishScene(controller, 'feather');
    await controller.interactWithScene(choice);
    const attempt = controller.getActiveAttempt()!;
    expect(attempt.questState.storybook?.shelfChoice).toBe(choice);
    expect(currentScene(attempt).after).toContain(choice === 'bell' ? 'stairs' : 'cart');
    expect(sceneImage(attempt)).toBe(`bookshelf-${choice}`);
    expect(comparisonChoices(attempt).find((option) => option.id === 'after')?.text).toContain(choice === 'bell' ? 'stairs' : 'cart');
    await controller.fastCompleteQuestOne('Pip found a boat and sailed safely back home.');
    const print = createQuestOnePrintModel(controller.getState().save!, controller.getActiveAttempt()!);
    expect(print.seedSummary).toContain(choice === 'bell' ? 'book stairs' : 'book cart');
  });

  it('allows a complete story with no optional planning and awards only after copying', async () => {
    const { controller, repository } = await setup();
    await finishScene(controller, 'feather'); await finishScene(controller, 'bell'); await finishScene(controller, 'fan');
    expect(controller.getState().phase).toBe('writing');
    const text = '  My   brave duck\nfound a boat and sailed home.  ';
    await controller.saveInput('finalStory', text); await controller.advanceWriting();
    expect(Object.values(controller.getActiveAttempt()!.artifact!.planning).every((value) => value === '')).toBe(true);
    await controller.celebrateStory();
    expect(controller.getState().save!.progress.recoveredPages).toEqual([]);
    const reloaded = new AppController({ repository, bus: new EventBus() }); reloaded.boot(); await reloaded.resumeQuest();
    expect(reloaded.getState().phase).toBe('celebration');
    expect(reloaded.getActiveAttempt()!.artifact!.storyText).toBe(text);
    await reloaded.openCopy(); await reloaded.completeCopy(); await reloaded.completeCopy();
    expect(reloaded.getState().save!.progress.recoveredPages).toEqual(['L01']);
    const print = createQuestOnePrintModel(reloaded.getState().save!, reloaded.getActiveAttempt()!);
    expect(print.storyText).toBe(text); expect(renderPrintHtml(print)).toContain(text);
  });

  it('retains optional planning and enforces six to twelve words without scoring meaning', async () => {
    const { controller } = await setup();
    await finishScene(controller, 'feather'); await finishScene(controller, 'handle'); await finishScene(controller, 'fan');
    await controller.saveInput('somebody', 'my dragon');
    for (const [count, valid] of [[5, false], [6, true], [12, true], [13, false]] as const) {
      await controller.saveInput('finalStory', Array(count).fill('word').join(' '));
      if (valid) { await controller.advanceWriting(); expect(controller.getActiveAttempt()!.artifact!.planning.somebody).toBe('my dragon'); await controller.editFromReview(); }
      else await expect(controller.advanceWriting()).rejects.toThrow();
    }
  });

  it('scaffolds mistakes, records guided help, and never loses scene progress', async () => {
    const { controller } = await setup(); await controller.interactWithScene('feather');
    await controller.answerScene('before'); await controller.answerScene('before');
    expect(controller.getActiveAttempt()!.questState.storybook!.help['sleepy-book:compare']).toBe(true);
    await controller.answerScene('after', true); await controller.requestSceneHelp(); await controller.answerScene('page', true);
    expect(controller.getActiveAttempt()!.questState.storybook!.assisted).toEqual(['sleepy-book:compare', 'sleepy-book:change']);
    expect(controller.getActiveAttempt()!.questState.storybook!.completedScenes).toEqual(['sleepy-book']);
  });

  it('deduplicates concurrent scene actions and next taps', async () => {
    const { controller } = await setup();
    await Promise.all([controller.interactWithScene('feather'), controller.interactWithScene('feather')]);
    expect(controller.getActiveAttempt()!.adventureEvents).toHaveLength(1);
    await Promise.all([controller.answerScene('after'), controller.answerScene('after')]);
    expect(controller.getActiveAttempt()!.questState.storybook!.activity).toBe('change');
    await controller.answerScene('page');
    await Promise.all([controller.continueScene(), controller.continueScene()]);
    expect(controller.getActiveAttempt()!.questState.storybook!.sceneIndex).toBe(1);
  });

  it('commits storage before announcing state, and leaves state unchanged if saving fails', async () => {
    const { controller, repository, storage, bus } = await setup();
    bus.on('STATE_COMMITTED', (state) => expect(JSON.parse(storage.getItem('p')!)).toEqual(state.save));
    await controller.interactWithScene('feather');
    const before = structuredClone(controller.getState());
    vi.spyOn(repository, 'save').mockImplementationOnce(() => { throw new Error('Storage is full'); });
    await expect(controller.answerScene('after')).rejects.toThrow('Storage is full');
    expect(controller.getState()).toEqual(before);
  });

  it('keeps replay attempts and the selected illustration after reload', async () => {
    const { controller, repository } = await setup();
    await controller.fastCompleteQuestOne(); await controller.chooseIllustration('paper-boat');
    const first = structuredClone(controller.getActiveAttempt());
    await controller.goToHub(); await controller.startQuest();
    expect(controller.getActiveAttempt()!.seed.numericSeed).not.toBe(first!.seed.numericSeed);
    expect(controller.getState().save!.attempts[first!.attemptId]).toEqual(first);
    const restored = new AppController({ repository, bus: new EventBus() }); restored.boot(); await restored.resumeQuest();
    expect(restored.getState().phase).toBe('questBriefing');
    expect(restored.getState().save!.attempts[first!.attemptId]!.questState.storybook!.illustration).toBe('paper-boat');
  });

  it('continues a legacy attempt through its saved activity without restarting it', async () => {
    const { controller, repository } = await setup();
    await controller.goToHub(); await controller.startQuest(14, 'legacy'); await controller.beginQuest();
    const old = controller.getActiveAttempt()!;
    await controller.openTablet(old.questState.tabletIds[0]!);
    const saved = structuredClone(controller.getActiveAttempt());
    const reloaded = new AppController({ repository, bus: new EventBus() }); reloaded.boot(); await reloaded.resumeQuest();
    expect(reloaded.getState().phase).toBe('puzzle'); expect(reloaded.getActiveAttempt()).toEqual(saved);
    await reloaded.fastCompleteQuestOne();
    expect(reloaded.getState().phase).toBe('complete');
  });

  it('can resume an earlier unfinished attempt from Parent Area', async () => {
    const { controller } = await setup();
    await controller.interactWithScene('feather');
    const first = structuredClone(controller.getActiveAttempt());
    await controller.goToHub(); await controller.startQuest(88); await controller.goToHub(); await controller.openParent();
    await controller.resumeSavedAttempt(first!.attemptId);
    expect(controller.getState().phase).toBe('puzzle'); expect(controller.getActiveAttempt()!.questState).toEqual(first!.questState);
  });

  it('reruns browser completion fixtures safely after a saved celebration or completion', async () => {
    const { controller, repository } = await setup();
    await finishScene(controller, 'feather'); await finishScene(controller, 'bell'); await finishScene(controller, 'fan');
    await controller.saveInput('finalStory', 'My little duck found a boat and sailed home.');
    await controller.advanceWriting(); await controller.celebrateStory();
    const resumed = new AppController({ repository, bus: new EventBus() }); resumed.boot();
    await resumed.fastCompleteQuestOne();
    const finished = structuredClone(resumed.getActiveAttempt());
    const repeated = new AppController({ repository, bus: new EventBus() }); repeated.boot();
    await repeated.fastCompleteQuestOne();
    expect(repeated.getState().phase).toBe('complete');
    expect(repeated.getActiveAttempt()).toEqual(finished);
    await repeated.goToHub(); await repeated.reopenCopy(finished!.attemptId); await repeated.completeCopy();
    expect(repeated.getActiveAttempt()!.completedAt).toBe(finished!.completedAt);
    expect(repeated.getActiveAttempt()!.copyStatus).toEqual(finished!.copyStatus);
  });
});
