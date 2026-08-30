import type { AppController } from '../app/AppController';
import type { AppPhase } from '../domain/models';
import { tabletById } from '../domain/courseCatalog';
import { createQuestOnePrintModel } from '../services/ExportService';
import type { SaveRepository } from '../services/SaveRepository';

declare global {
  interface Window {
    __STORY_GUILD_TEST_API__?: ReturnType<typeof createTestApi>;
  }
}

export function createTestApi(controller: AppController, repository: SaveRepository, resetKeys: () => void) {
  let debugSeed: number | undefined;
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
      if (phase === 'questBriefing') await controller.startQuest(debugSeed);
      else if (phase === 'explore') await controller.beginQuest();
      else if (phase === 'review') await controller.fastCompleteQuestOne();
      else throw new Error(`Test phase shortcut is not supported for ${phase}.`);
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
    getActiveTablet() {
      const id = controller.getActiveAttempt()?.questState.activeTabletId;
      return id ? tabletById(id) : undefined;
    },
  };
}
