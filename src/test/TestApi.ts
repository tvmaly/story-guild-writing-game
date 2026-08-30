import type { AppController } from '../app/AppController';
import type { AppPhase, QuestPhase } from '../domain/models';
import { REFLECTION_PROMPTS, tabletById, WRITING_PROMPTS } from '../domain/courseCatalog';
import type { RuntimeDiagnostics } from '../core/RuntimeDiagnostics';
import { createQuestOnePrintModel } from '../services/ExportService';
import type { SaveRepository } from '../services/SaveRepository';

declare global {
  interface Window {
    __STORY_GUILD_TEST_API__?: ReturnType<typeof createTestApi>;
  }
}

const questPhaseOrder: QuestPhase[] = [
  'questBriefing', 'explore', 'puzzle', 'reflection', 'writing', 'review', 'copy', 'complete',
];

export function createTestApi(
  controller: AppController,
  repository: SaveRepository,
  diagnostics: RuntimeDiagnostics,
  resetKeys: () => void,
) {
  let debugSeed: number | undefined;

  const moveToQuestPhase = async (target: QuestPhase): Promise<void> => {
    if (controller.getState().phase === 'onboarding') await controller.createProfile('Simulator Fixture');
    if (controller.getState().phase === 'hub') await controller.startQuest(debugSeed ?? 12345);

    const currentIndex = questPhaseOrder.indexOf(controller.getState().phase as QuestPhase);
    const targetIndex = questPhaseOrder.indexOf(target);
    if (currentIndex > targetIndex) throw new Error(`Cannot move backward from ${controller.getState().phase} to ${target}. Reset test storage first.`);
    if (controller.getState().phase === target) return;

    if (controller.getState().phase === 'questBriefing') await controller.beginQuest();
    if (controller.getState().phase === target) return;

    while (controller.getState().phase === 'explore' || controller.getState().phase === 'puzzle') {
      const attempt = controller.getActiveAttempt();
      if (!attempt) throw new Error('Test fixture is missing the active Quest 1 attempt.');
      if (controller.getState().phase === 'explore') {
        const nextTablet = attempt.questState.tabletIds.find((id) => !(id in attempt.questState.classifications));
        if (!nextTablet) throw new Error('Test fixture could not find an unsolved tablet.');
        await controller.openTablet(nextTablet);
        if (target === 'puzzle') return;
      }
      const tabletId = controller.getActiveAttempt()?.questState.activeTabletId;
      const tablet = tabletId ? tabletById(tabletId) : undefined;
      if (!tablet) throw new Error('Test fixture opened an unknown tablet.');
      await controller.classifyActiveTablet(tablet.isStory);
    }
    if (controller.getState().phase === target) return;

    while (controller.getState().phase === 'reflection') {
      const attempt = controller.getActiveAttempt();
      const prompt = attempt ? REFLECTION_PROMPTS[attempt.questState.reflectionIndex] : undefined;
      if (!prompt) throw new Error('Test fixture could not resolve a reflection prompt.');
      await controller.saveInput(prompt.key, 'A character changed the situation.');
      await controller.advanceReflection();
    }
    if (controller.getState().phase === target) return;

    while (controller.getState().phase === 'writing') {
      const attempt = controller.getActiveAttempt();
      if (!attempt) throw new Error('Test fixture is missing writing state.');
      const prompt = WRITING_PROMPTS[attempt.questState.writingIndex];
      if (prompt) await controller.saveInput(prompt.key, 'a short idea');
      else await controller.saveInput('finalStory', 'Mira found home after the storm cleared at dawn.');
      await controller.advanceWriting();
    }
    if (controller.getState().phase === target) return;

    if (controller.getState().phase === 'review') await controller.openCopy();
    if (controller.getState().phase === target) return;
    if (controller.getState().phase === 'copy') await controller.completeCopy();
    if (controller.getState().phase !== target) throw new Error(`Test fixture stopped in ${controller.getState().phase}, not ${target}.`);
  };

  return {
    resetTestSave(): void { resetKeys(); window.location.reload(); },
    createProfile(name: string): Promise<void> { return controller.createProfile(name); },
    getState() { return structuredClone(controller.getState()); },
    startQuest(): Promise<void> { return controller.startQuest(debugSeed); },
    openTablet(tabletId: string): Promise<void> { return controller.openTablet(tabletId); },
    async applyPuzzleAction(asStory: boolean): Promise<void> { await controller.classifyActiveTablet(asStory); },
    submitWritingField(key: string, value: string): Promise<void> { return controller.saveInput(key, value); },
    advanceReflection(): Promise<void> { return controller.advanceReflection(); },
    advanceWriting(): Promise<void> { return controller.advanceWriting(); },
    openCopy(): Promise<void> { return controller.openCopy(); },
    async moveToPhase(phase: AppPhase): Promise<void> {
      if (phase === 'hub') {
        if (controller.getState().phase === 'onboarding') await controller.createProfile('Simulator Fixture');
        if (controller.getState().phase !== 'hub') throw new Error('Reset test storage before moving back to the hub fixture.');
        return;
      }
      if (!questPhaseOrder.includes(phase as QuestPhase)) throw new Error(`Test phase shortcut is not supported for ${phase}.`);
      await moveToQuestPhase(phase as QuestPhase);
    },
    completeCopy(): Promise<void> { return controller.completeCopy(); },
    fastCompleteLesson(): Promise<void> { return controller.fastCompleteQuestOne(); },
    openPrintPreview(): Promise<void> { return controller.openPrintPreview(); },
    getPrintModel() {
      const state = controller.getState();
      const attempt = controller.getActiveAttempt();
      if (!state.save || !attempt) throw new Error('No printable attempt.');
      return createQuestOnePrintModel(state.save, attempt);
    },
    corruptPrimarySave(): void { repository.corruptPrimaryForTest(); },
    reloadFromStorage(): void { window.location.reload(); },
    setDebugSeed(seed: number): void { debugSeed = seed; },
    getDiagnostics() { return diagnostics.snapshot(); },
    getActiveTablet() {
      const id = controller.getActiveAttempt()?.questState.activeTabletId;
      return id ? tabletById(id) : undefined;
    },
  };
}
