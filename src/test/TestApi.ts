import type { AppController } from '../app/AppController';
import type { AppPhase } from '../domain/models';
import { REFLECTION_PROMPTS, tabletById, WRITING_PROMPTS } from '../domain/courseCatalog';
import { currentScene } from '../domain/storybook';
import type { RuntimeDiagnostics } from '../core/RuntimeDiagnostics';
import { createQuestOnePrintModel } from '../services/ExportService';
import type { SaveRepository } from '../services/SaveRepository';

declare global { interface Window { __STORY_GUILD_TEST_API__?: ReturnType<typeof createTestApi> } }

export function createTestApi(controller: AppController, repository: SaveRepository, diagnostics: RuntimeDiagnostics, resetKeys: () => void) {
  let debugSeed: number | undefined;
  const moveToPhase = async (target: AppPhase): Promise<void> => {
    if (controller.getState().phase === 'onboarding') await controller.createProfile('Simulator Writer');
    if (target === 'hub') { if (controller.getState().phase !== 'hub') await controller.goToHub(); return; }
    if (controller.getState().phase === 'resumePrompt') await controller.resumeQuest();
    if (controller.getState().phase === 'hub') await controller.startQuest(debugSeed ?? 12345);
    for (let step = 0; step < 80; step += 1) {
      const phase = controller.getState().phase;
      if (phase === target) return;
      const attempt = controller.getActiveAttempt()!;
      if (phase === 'questBriefing') await controller.beginQuest();
      else if (attempt.experience && ['explore', 'puzzle'].includes(phase)) {
        const progress = attempt.questState.storybook!; const scene = currentScene(attempt);
        if (progress.activity === 'interact') await controller.interactWithScene(scene.actions[0]!.id);
        else if (progress.activity === 'compare') await controller.answerScene('after');
        else if (progress.activity === 'change') await controller.answerScene(scene.changedId);
        else await controller.continueScene();
      } else if (phase === 'explore') {
        const next = attempt.questState.tabletIds.find((id) => !(id in attempt.questState.classifications));
        if (!next) throw new Error('No unsolved legacy tablet.');
        await controller.openTablet(next);
      } else if (phase === 'puzzle') await controller.classifyActiveTablet(tabletById(attempt.questState.activeTabletId!)!.isStory);
      else if (phase === 'reflection') { const prompt = REFLECTION_PROMPTS[attempt.questState.reflectionIndex]!; await controller.saveInput(prompt.key, 'The character found something new.'); await controller.advanceReflection(); }
      else if (phase === 'writing') {
        const prompt = !attempt.experience ? WRITING_PROMPTS[attempt.questState.writingIndex] : undefined;
        await controller.saveInput(prompt?.key ?? 'finalStory', prompt ? 'a short idea' : 'Pip found a boat and sailed safely back home.');
        await controller.advanceWriting();
      } else if (phase === 'review') { if (attempt.experience) await controller.celebrateStory(); else await controller.openCopy(); }
      else if (phase === 'celebration') await controller.openCopy();
      else if (phase === 'copy') await controller.completeCopy();
      else throw new Error(`Cannot advance from ${phase} to ${target}. Reset the test save first.`);
    }
    throw new Error(`Test fixture did not reach ${target}.`);
  };
  return {
    resetTestSave(): void { resetKeys(); window.location.reload(); },
    createProfile: (name: string) => controller.createProfile(name),
    getState: () => structuredClone(controller.getState()),
    startQuest: () => controller.startQuest(debugSeed),
    startLegacyQuest: () => controller.startQuest(debugSeed, 'legacy'),
    openTablet: (id: string) => controller.openTablet(id),
    applyPuzzleAction: (answer: boolean) => controller.classifyActiveTablet(answer),
    interactWithScene: (action: string) => controller.interactWithScene(action),
    answerScene: (answer: string, assisted = false) => controller.answerScene(answer, assisted),
    continueScene: () => controller.continueScene(),
    getCurrentScene: () => currentScene(controller.getActiveAttempt()!),
    submitWritingField: (key: string, value: string) => controller.saveInput(key, value),
    advanceReflection: () => controller.advanceReflection(),
    advanceWriting: () => controller.advanceWriting(),
    celebrateStory: () => controller.celebrateStory(),
    openCopy: () => controller.openCopy(),
    moveToPhase,
    completeCopy: () => controller.completeCopy(),
    fastCompleteLesson: () => controller.fastCompleteQuestOne(),
    openPrintPreview: () => controller.openPrintPreview(),
    getPrintModel() { const state = controller.getState(); const attempt = controller.getActiveAttempt(); if (!state.save || !attempt) throw new Error('No printable attempt.'); return createQuestOnePrintModel(state.save, attempt); },
    corruptPrimarySave: () => repository.corruptPrimaryForTest(),
    reloadFromStorage: () => window.location.reload(),
    setDebugSeed(seed: number): void { debugSeed = seed; },
    getDiagnostics: () => diagnostics.snapshot(),
    getActiveTablet: () => tabletById(controller.getActiveAttempt()?.questState.activeTabletId ?? ''),
  };
}
