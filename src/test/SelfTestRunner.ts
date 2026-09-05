import type { AppController } from '../app/AppController';
import { APP_CONFIG } from '../config';
import type { RuntimeDiagnostics } from '../core/RuntimeDiagnostics';
import { createQuestOnePrintModel } from '../services/ExportService';

export interface BrowserTestResult { name: string; passed: boolean; detail?: string }

declare global {
  interface Window {
    __STORY_GUILD_TEST_RESULTS__?: BrowserTestResult[];
  }
}

const waitFor = async (check: () => boolean, timeoutMs = 5000): Promise<void> => {
  const started = performance.now();
  while (!check()) {
    if (performance.now() - started > timeoutMs) throw new Error('Timed out waiting for browser state.');
    await new Promise<void>((resolve) => window.setTimeout(resolve, 40));
  }
};

export class SelfTestRunner {
  private readonly results: BrowserTestResult[] = [];

  constructor(
    private readonly controller: AppController,
    private readonly normalSaveSnapshot: { primary: string | null; backup: string | null; legacyPrimary: string | null; legacyBackup: string | null },
    private readonly diagnostics: RuntimeDiagnostics,
  ) {}

  async run(): Promise<void> {
    document.body.dataset.testStatus = 'running';
    await this.check('App shell renders', () => Boolean(document.querySelector('.app-frame')));
    await this.check('Runtime manifest loads without fallback', () => !this.controller.getState().configNotice);
    await this.check('Phaser canvas has dimensions', async () => {
      await waitFor(() => Boolean(document.querySelector('canvas')));
      const canvas = document.querySelector('canvas');
      return Boolean(canvas && canvas.width > 0 && canvas.height > 0);
    });
    await this.check('Every illustrated scene and reaction asset loads', async () => {
      await waitFor(() => document.body.dataset.artReady !== undefined, 10000);
      return document.body.dataset.artReady === 'true';
    });
    await this.check('Test storage is real localStorage', () => {
      const probe = 'storyGuild.test.probe';
      localStorage.setItem(probe, 'ok');
      const works = localStorage.getItem(probe) === 'ok';
      localStorage.removeItem(probe);
      return works;
    });
    await this.check('Quest 1 completes through the controller', async () => {
      if (this.controller.getState().phase === 'onboarding') await this.controller.createProfile('Browser Tester');
      await this.controller.fastCompleteQuestOne();
      const state = this.controller.getState();
      return state.phase === 'complete' && state.save?.progress.recoveredPages.includes('L01') === true;
    });
    await this.check('Quest 1 artifact is printable and exact', () => {
      const state = this.controller.getState();
      const attempt = this.controller.getActiveAttempt();
      if (!state.save || !attempt?.artifact) return false;
      const model = createQuestOnePrintModel(state.save, attempt);
      return model.storyText === attempt.artifact.storyText && model.wordCount === attempt.artifact.wordCount;
    });
    await this.check('Completed page shows the exact child-authored story', () => {
      return document.querySelector('.recovered-page blockquote')?.textContent === this.controller.getActiveAttempt()?.artifact?.storyText;
    });
    await this.check('Copy completion persists in test storage', () => {
      const raw = localStorage.getItem(APP_CONFIG.storageKeys.test.primary);
      return raw?.includes('copyStatus') === true && raw.includes('completedAt');
    });
    await this.check('No uncaught browser or asset-load errors', () => this.diagnostics.snapshot().entries.length === 0);
    await this.check('Normal save keys remain untouched', () => {
      return localStorage.getItem(APP_CONFIG.storageKeys.normal.primary) === this.normalSaveSnapshot.primary
        && localStorage.getItem(APP_CONFIG.storageKeys.normal.backup) === this.normalSaveSnapshot.backup
        && localStorage.getItem(APP_CONFIG.storageKeys.legacy.primary) === this.normalSaveSnapshot.legacyPrimary
        && localStorage.getItem(APP_CONFIG.storageKeys.legacy.backup) === this.normalSaveSnapshot.legacyBackup;
    });

    const passed = this.results.every((result) => result.passed);
    window.__STORY_GUILD_TEST_RESULTS__ = this.results;
    document.body.dataset.testStatus = passed ? 'pass' : 'fail';
    const report = document.createElement('aside');
    report.id = 'self-test-report';
    report.className = passed ? 'self-test-report pass' : 'self-test-report fail';
    report.innerHTML = `<h2>${passed ? 'ALL PASS' : 'TEST FAILURE'}</h2><ul>${this.results.map((result) => `<li>${result.passed ? '✓' : '✗'} ${result.name}${result.detail ? ` — ${result.detail}` : ''}</li>`).join('')}</ul>`;
    document.body.prepend(report);
  }

  private async check(name: string, action: () => boolean | Promise<boolean>): Promise<void> {
    try {
      const passed = await action();
      this.results.push({ name, passed, ...(passed ? {} : { detail: 'Expected true.' }) });
    } catch (error) {
      this.results.push({ name, passed: false, detail: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
