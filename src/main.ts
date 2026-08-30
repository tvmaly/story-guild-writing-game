import './styles/app.css';
import { AppController } from './app/AppController';
import { APP_CONFIG } from './config';
import { EventBus } from './core/EventBus';
import { RuntimeDiagnostics } from './core/RuntimeDiagnostics';
import { createGame } from './game/createGame';
import { AudioService, BrowserAudioAdapter } from './services/AudioService';
import { ConfigRepository } from './services/ConfigRepository';
import { LocalStorageAdapter, SaveRepository } from './services/SaveRepository';
import { SelfTestRunner } from './test/SelfTestRunner';
import { createTestApi } from './test/TestApi';
import { AppShell } from './ui/AppShell';

async function main(testMode: boolean, diagnostics?: RuntimeDiagnostics): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) throw new Error('Application root is missing.');
  const autoRunTests = new URLSearchParams(window.location.search).get('autorun') !== '0';
  const storage = new LocalStorageAdapter();
  const normalSaveSnapshot = {
    primary: storage.getItem(APP_CONFIG.storageKeys.normal.primary),
    backup: storage.getItem(APP_CONFIG.storageKeys.normal.backup),
  };
  const keys = testMode ? APP_CONFIG.storageKeys.test : APP_CONFIG.storageKeys.normal;
  if (testMode && autoRunTests) {
    storage.removeItem(keys.primary);
    storage.removeItem(keys.backup);
  }
  const appBase = new URL('.', window.location.href);
  const basePath = appBase.pathname.endsWith('/') ? appBase.pathname : `${appBase.pathname}/`;
  const resolveAsset = (path: string): string => new URL(path, appBase).toString();
  const manifestResult = await new ConfigRepository().load(basePath, APP_CONFIG.manifestPath);
  const repository = new SaveRepository(storage, keys);
  const bus = new EventBus();
  const controller = new AppController({
    repository,
    bus,
    ...(manifestResult.notice ? { configNotice: manifestResult.notice } : {}),
  });
  controller.boot();
  const initialSound = controller.getState().save?.settings.soundEnabled ?? false;
  const audio = new AudioService(manifestResult.manifest, new BrowserAudioAdapter(resolveAsset), initialSound);
  const shell = new AppShell(root, controller, bus, manifestResult.manifest, audio);
  const gameHost = shell.mount();
  createGame(gameHost, controller, bus, manifestResult.manifest, resolveAsset, {
    onInteract: (target) => shell.handleInteraction(target),
    onAssetLoadError: (url) => diagnostics?.record('asset-load', `Phaser could not load ${url}.`, url),
  });

  if (testMode) {
    window.__STORY_GUILD_TEST_API__ = createTestApi(controller, repository, diagnostics as RuntimeDiagnostics, () => {
      storage.removeItem(keys.primary);
      storage.removeItem(keys.backup);
    });
    if (autoRunTests) await new SelfTestRunner(controller, normalSaveSnapshot, diagnostics as RuntimeDiagnostics).run();
  }
}

const testMode = new URLSearchParams(window.location.search).get('test') === '1';
const diagnostics = testMode ? new RuntimeDiagnostics() : undefined;

void main(testMode, diagnostics).catch((error: unknown) => {
  diagnostics?.record('error', error instanceof Error ? error.message : 'Unknown startup error.');
  document.body.dataset.testStatus = 'fail';
  const root = document.querySelector<HTMLElement>('#app');
  if (root) root.innerHTML = `<section class="fatal-error"><h1>The Guild could not open.</h1><p>${error instanceof Error ? error.message : 'Unknown startup error'}</p></section>`;
});
