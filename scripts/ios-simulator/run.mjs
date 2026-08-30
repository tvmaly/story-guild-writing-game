import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppiumClient } from './appium-client.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pagesUrl = new URL(process.env.STORY_GUILD_PAGES_URL || 'https://tvmaly.github.io/story-guild-writing-game/');
const primaryName = process.env.IOS_SIM_PRIMARY || 'iPad (A16)';
const secondaryName = process.env.IOS_SIM_SECONDARY || 'iPad mini (A17 Pro)';
const timestamp = new Date().toISOString().replaceAll(':', '-').replace(/\.\d{3}Z$/u, 'Z');
const artifactRoot = join(root, 'test-results', 'ios-simulator', timestamp);
const results = [];
const startedProcesses = [];
const bootedByRunner = new Set();
let activeDriver;

mkdirSync(artifactRoot, { recursive: true });
process.chdir(root);

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function waitFor(check, description, timeoutMs = 15000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMs) {
    try {
      const value = await check();
      if (value) return value;
    } catch (error) { lastError = error; }
    await sleep(100);
  }
  throw new Error(`Timed out waiting for ${description}.${lastError instanceof Error ? ` Last error: ${lastError.message}` : ''}`);
}

function command(commandName, args, options = {}) {
  const result = spawnSync(commandName, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : 'pipe',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${commandName} ${args.join(' ')} failed.${result.stderr ? `\n${result.stderr}` : ''}`);
  }
  return result.stdout || '';
}

function startProcess(commandName, args, logName) {
  const logPath = join(artifactRoot, logName);
  const log = createWriteStream(logPath, { flags: 'a' });
  const child = spawn(commandName, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.once('exit', (code) => log.write(`\nProcess exited with ${String(code)}.\n`));
  startedProcesses.push({ child, log });
  return child;
}

async function freePort() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolvePromise(port));
    });
  });
}

async function waitForHttp(url, description, timeoutMs = 30000) {
  await waitFor(async () => {
    const response = await fetch(url);
    return response.ok;
  }, description, timeoutMs);
}

function simulatorInventory() {
  const devicePayload = JSON.parse(command('xcrun', ['simctl', 'list', 'devices', 'available', '-j']));
  const runtimePayload = JSON.parse(command('xcrun', ['simctl', 'list', 'runtimes', '-j']));
  const runtimes = runtimePayload.runtimes
    .filter((runtime) => runtime.isAvailable && runtime.identifier.includes('.iOS-'))
    .sort((left, right) => String(right.version).localeCompare(String(left.version), undefined, { numeric: true }));
  const runtime = runtimes.find((candidate) => (devicePayload.devices[candidate.identifier] || []).length > 0);
  if (!runtime) throw new Error('No available iOS Simulator runtime with devices was found.');
  const devices = devicePayload.devices[runtime.identifier] || [];
  const findDevice = (name) => {
    const device = devices.find((candidate) => candidate.name === name);
    if (!device) throw new Error(`The required simulator "${name}" is not installed for iOS ${runtime.version}.`);
    return { ...device, runtimeVersion: runtime.version, runtimeBuild: runtime.buildversion, runtimeIdentifier: runtime.identifier };
  };
  return { runtime, devices: [findDevice(primaryName), findDevice(secondaryName)] };
}

function boot(device) {
  if (device.state === 'Booted') return;
  command('xcrun', ['simctl', 'boot', device.udid]);
  command('xcrun', ['simctl', 'bootstatus', device.udid, '-b']);
  bootedByRunner.add(device.udid);
}

function shutdownIfStarted(device) {
  if (!bootedByRunner.has(device.udid)) return;
  command('xcrun', ['simctl', 'shutdown', device.udid]);
  bootedByRunner.delete(device.udid);
}

async function createSession(serverUrl, device, initialUrl) {
  return AppiumClient.create(serverUrl, {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    browserName: 'Safari',
    'appium:udid': device.udid,
    'appium:platformVersion': device.runtimeVersion,
    'appium:initialDeeplinkUrl': initialUrl,
    'appium:noReset': true,
    'appium:forceAppLaunch': true,
    'appium:shouldTerminateApp': false,
    'appium:connectHardwareKeyboard': false,
    'appium:forceTurnOnSoftwareKeyboardSimulator': true,
    'appium:showSafariConsoleLog': true,
    'appium:showSafariNetworkLog': false,
    'appium:wdaLocalPort': device.wdaPort,
    'appium:mjpegServerPort': device.mjpegPort,
    'appium:newCommandTimeout': 240,
  });
}

async function executeApi(driver, method, ...args) {
  const result = await driver.executeAsync(`
    const done = arguments[arguments.length - 1];
    const method = arguments[0];
    const args = arguments[1];
    const api = window.__STORY_GUILD_TEST_API__;
    if (!api || typeof api[method] !== 'function') {
      done({ ok: false, error: 'Missing Story Guild test API method: ' + method });
      return;
    }
    Promise.resolve(api[method](...args))
      .then((value) => done({ ok: true, value }))
      .catch((error) => done({ ok: false, error: error instanceof Error ? error.message : String(error) }));
  `, [method, args]);
  if (!result?.ok) throw new Error(result?.error || `Test API method ${method} failed.`);
  return result.value;
}

async function appState(driver) { return executeApi(driver, 'getState'); }

async function pageSnapshot(driver) {
  return driver.execute(`
    const focused = document.activeElement;
    const viewport = window.visualViewport;
    const focusRect = focused instanceof HTMLElement ? focused.getBoundingClientRect() : null;
    const canvas = document.querySelector('canvas');
    const touch = document.querySelector('[data-testid="touch-controls"]');
    const touchRect = touch instanceof HTMLElement ? touch.getBoundingClientRect() : null;
    return {
      phase: document.body.dataset.appPhase || '',
      testStatus: document.body.dataset.testStatus || '',
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      rootFontSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
      reducedMotionClass: document.body.classList.contains('reduced-motion'),
      textLargeClass: document.documentElement.classList.contains('text-large'),
      viewport: viewport ? { width: viewport.width, height: viewport.height, scale: viewport.scale, offsetTop: viewport.offsetTop } : null,
      focusedTestId: focused instanceof HTMLElement ? focused.dataset.testid || '' : '',
      focusedFontSize: focused instanceof HTMLElement ? Number.parseFloat(getComputedStyle(focused).fontSize) : null,
      focusRect: focusRect ? { top: focusRect.top, bottom: focusRect.bottom, left: focusRect.left, right: focusRect.right } : null,
      canvas: canvas ? { width: canvas.width, height: canvas.height } : null,
      touchRect: touchRect ? { top: touchRect.top, bottom: touchRect.bottom, left: touchRect.left, right: touchRect.right } : null,
      fatal: Boolean(document.querySelector('.fatal-error')),
      configNotice: [...document.querySelectorAll('.notice')].some((element) => element.textContent?.includes('configuration')),
      diagnostics: window.__STORY_GUILD_TEST_API__?.getDiagnostics?.() || window.__STORY_GUILD_TEST_DIAGNOSTICS__ || { entries: [] },
    };
  `);
}

async function waitForPhase(driver, phase, timeoutMs = 15000) {
  return waitFor(async () => {
    const snapshot = await pageSnapshot(driver);
    return snapshot.phase === phase ? snapshot : null;
  }, `application phase ${phase}`, timeoutMs);
}

async function waitForSelector(driver, selector, timeoutMs = 15000) {
  await waitFor(() => driver.execute('return Boolean(document.querySelector(arguments[0]));', [selector]), selector, timeoutMs);
}

async function waitForState(driver, predicate, description, timeoutMs = 15000) {
  return waitFor(async () => {
    const state = await appState(driver);
    return predicate(state) ? state : null;
  }, description, timeoutMs);
}

async function reloadAndWait(driver) {
  const marker = `${Date.now()}-${Math.random()}`;
  await driver.execute('document.documentElement.dataset.reloadMarker = arguments[0];', [marker]);
  await driver.refresh();
  await waitFor(
    () => driver.execute(`
      return document.readyState === 'complete'
        && document.documentElement.dataset.reloadMarker !== arguments[0]
        && Boolean(window.__STORY_GUILD_TEST_API__);
    `, [marker]),
    'a new Safari document after reload',
  );
}

async function resetTestStorage(driver) {
  await driver.execute(`
    localStorage.removeItem('storyGuild.test.save.v1');
    localStorage.removeItem('storyGuild.test.backup.v1');
  `);
  await reloadAndWait(driver);
  await waitForPhase(driver, 'onboarding');
}

async function saveScreenshot(driver, device, name) {
  const safeDevice = device.name.replaceAll(/[^a-z0-9]+/giu, '-').replaceAll(/^-|-$/gu, '').toLowerCase();
  const path = join(artifactRoot, `${safeDevice}-${name}.png`);
  const base64 = await driver.screenshot();
  writeFileSync(path, Buffer.from(base64, 'base64'));
  return relative(root, path);
}

async function setOrientation(driver, orientation) {
  await driver.setOrientation(orientation);
  await waitFor(async () => {
    const snapshot = await pageSnapshot(driver);
    return orientation === 'LANDSCAPE' ? snapshot.innerWidth > snapshot.innerHeight : snapshot.innerHeight > snapshot.innerWidth;
  }, `${orientation.toLowerCase()} viewport`, 20000);
}

async function clickRepeated(driver, testId, count) {
  for (let index = 0; index < count; index += 1) {
    await driver.clickTestId(testId);
    await sleep(80);
  }
}

async function openQuestBoardFromFreshHub(driver) {
  await clickRepeated(driver, 'move-up', 7);
  await clickRepeated(driver, 'move-left', 4);
  await driver.clickTestId('action-button');
  await waitForSelector(driver, '[data-testid="start-board"]');
}

async function openParentFromFreshHub(driver) {
  await clickRepeated(driver, 'move-right', 4);
  await driver.clickTestId('action-button');
  await waitForSelector(driver, '[data-testid="parent-hold"]');
}

async function moveQuestPlayer(driver, targetX, targetY) {
  const directionId = { left: 'move-left', right: 'move-right', up: 'move-up', down: 'move-down' };
  while (true) {
    const state = await appState(driver);
    const attempt = state.save?.attempts?.[state.save.activeAttemptId];
    if (!attempt) throw new Error('Quest movement has no active attempt.');
    const { playerX, playerY } = attempt.questState;
    if (playerX === targetX && playerY === targetY) return;
    const direction = playerX < targetX ? 'right' : playerX > targetX ? 'left' : playerY < targetY ? 'down' : 'up';
    await driver.clickTestId(directionId[direction]);
    await waitForState(driver, (candidate) => {
      const active = candidate.save?.attempts?.[candidate.save.activeAttemptId];
      return active && (active.questState.playerX !== playerX || active.questState.playerY !== playerY);
    }, `player movement ${direction}`);
  }
}

async function solveQuestTablets(driver) {
  const positions = [{ x: 4, y: 3 }, { x: 10, y: 3 }, { x: 16, y: 3 }, { x: 4, y: 10 }, { x: 10, y: 10 }, { x: 16, y: 10 }];
  for (let index = 0; index < positions.length; index += 1) {
    const position = positions[index];
    await moveQuestPlayer(driver, position.x, position.y);
    await driver.clickTestId('action-button');
    await waitForPhase(driver, 'puzzle');
    const tablet = await executeApi(driver, 'getActiveTablet');
    assert(tablet && typeof tablet.isStory === 'boolean', 'The active tablet fixture was not observable.');
    const correctId = tablet.isStory ? 'classify-story' : 'classify-not';
    const wrongId = tablet.isStory ? 'classify-not' : 'classify-story';
    if (index === 0) {
      await driver.clickTestId(wrongId);
      await waitForState(driver, (state) => {
        const active = state.save?.attempts?.[state.save.activeAttemptId];
        return active?.questState.unsuccessfulAttempts?.[tablet.id] === 1;
      }, 'first supportive retry');
      await driver.clickTestId(wrongId);
      await waitForState(driver, (state) => {
        const active = state.save?.attempts?.[state.save.activeAttemptId];
        return active?.questState.unsuccessfulAttempts?.[tablet.id] === 2;
      }, 'second supportive retry');
      const hintVisible = await driver.execute('return Boolean(document.querySelector(".hint"));');
      assert(hintVisible, 'The two-attempt puzzle hint did not appear.');
    }
    await driver.clickTestId(correctId);
    await waitForPhase(driver, index === positions.length - 1 ? 'reflection' : 'explore');
  }
}

async function completeReflection(driver) {
  while ((await appState(driver)).phase === 'reflection') {
    const before = await appState(driver);
    const attempt = before.save.attempts[before.save.activeAttemptId];
    await driver.typeTestId('reflection-input', 'A character changed the situation.');
    await driver.clickTestId('reflection-next');
    await waitForState(driver, (state) => {
      if (state.phase === 'writing') return true;
      const active = state.save?.attempts?.[state.save.activeAttemptId];
      return active?.questState.reflectionIndex > attempt.questState.reflectionIndex;
    }, 'next reflection prompt');
  }
}

async function completePlanning(driver) {
  const fixture = ['Mira', 'find her way home', 'a storm hid the trail', 'she followed a lantern', 'the sky cleared'];
  for (const value of fixture) {
    const before = await appState(driver);
    const attempt = before.save.attempts[before.save.activeAttemptId];
    await driver.typeTestId('writing-input', value);
    await driver.clickTestId('writing-next');
    await waitForState(driver, (state) => {
      const active = state.save?.attempts?.[state.save.activeAttemptId];
      return active?.questState.writingIndex > attempt.questState.writingIndex;
    }, 'next writing prompt');
  }
}

async function captureKeyboardCheckpoint(driver, device, screenshotName) {
  const snapshot = await pageSnapshot(driver);
  assert(snapshot.focusedTestId === 'writing-input', 'The writing field lost focus before the keyboard checkpoint.');
  assert(snapshot.focusedFontSize >= 16, `The focused writing field uses a ${snapshot.focusedFontSize}px font and may trigger Safari focus zoom.`);
  assert(snapshot.viewport?.scale === 1, 'Focusing the writing field triggered Safari zoom.');
  await saveScreenshot(driver, device, screenshotName);
}

function assertHealthyLayout(snapshot, label) {
  assert(!snapshot.fatal, `${label} rendered a fatal error.`);
  assert(snapshot.canvas?.width > 0 && snapshot.canvas?.height > 0, `${label} did not render a Phaser canvas.`);
  assert(snapshot.scrollWidth <= snapshot.innerWidth + 1, `${label} has horizontal page overflow (${snapshot.scrollWidth} > ${snapshot.innerWidth}).`);
  assert(snapshot.diagnostics.entries.length === 0, `${label} recorded runtime diagnostics: ${JSON.stringify(snapshot.diagnostics.entries)}.`);
}

async function fullPrimaryLocalSuite(driver, device, baseUrl) {
  await driver.navigate(`${baseUrl}?test=1&autorun=0`);
  await resetTestStorage(driver);
  await setOrientation(driver, 'PORTRAIT');
  assertHealthyLayout(await pageSnapshot(driver), 'A16 onboarding portrait');
  await saveScreenshot(driver, device, 'onboarding-portrait');

  await driver.typeTestId('student-name', 'Simulator Writer');
  await driver.clickTestId('start-guild');
  await waitForPhase(driver, 'hub');
  await clickRepeated(driver, 'move-left', 1);
  await clickRepeated(driver, 'move-right', 1);
  await clickRepeated(driver, 'move-down', 1);
  await clickRepeated(driver, 'move-up', 1);
  await openQuestBoardFromFreshHub(driver);
  await driver.clickTestId('start-board');
  await waitForPhase(driver, 'questBriefing');
  const firstSeed = (await appState(driver)).save.attempts[(await appState(driver)).save.activeAttemptId].seed.numericSeed;
  await driver.clickTestId('begin-quest');
  await waitForPhase(driver, 'explore');

  const beforeRotation = await appState(driver);
  await setOrientation(driver, 'LANDSCAPE');
  const afterRotation = await appState(driver);
  assert(JSON.stringify(beforeRotation) === JSON.stringify(afterRotation), 'Rotation changed committed exploration state.');
  const landscape = await pageSnapshot(driver);
  assertHealthyLayout(landscape, 'A16 exploration landscape');
  assert(landscape.scrollX === 0 && landscape.scrollY === 0, 'The page scrolled during exploration.');
  await saveScreenshot(driver, device, 'exploration-landscape');

  await solveQuestTablets(driver);
  await driver.background(2);
  const resumed = await appState(driver);
  assert(resumed.phase === 'reflection', 'Backgrounding Safari changed the active phase.');
  await completeReflection(driver);
  await completePlanning(driver);

  const story = 'Mira found home after the storm cleared at dawn.';
  await driver.typeTestId('writing-input', story);
  await waitForState(driver, (state) => {
    const active = state.save?.attempts?.[state.save.activeAttemptId];
    return active?.inputs?.finalStory === story;
  }, 'final-story autosave');
  await setOrientation(driver, 'PORTRAIT');
  const writingSnapshot = await pageSnapshot(driver);
  assert(writingSnapshot.focusedTestId === 'writing-input', 'Rotation moved focus away from the writing field.');
  assert(writingSnapshot.viewport?.scale === 1, 'Focusing the writing field triggered Safari zoom.');
  assert(writingSnapshot.focusRect && writingSnapshot.focusRect.bottom <= writingSnapshot.viewport.height + writingSnapshot.viewport.offsetTop + 1, 'The focused writing field is hidden behind the software keyboard.');
  await captureKeyboardCheckpoint(driver, device, 'writing-keyboard-checkpoint');

  const writingState = await appState(driver);
  await reloadAndWait(driver);
  await waitForPhase(driver, 'resumePrompt');
  await driver.clickTestId('resume-quest');
  await waitForPhase(driver, 'writing');
  const restored = await appState(driver);
  assert(restored.save.attempts[restored.save.activeAttemptId].seed.numericSeed === firstSeed, 'Writing reload changed the deterministic seed.');
  assert(restored.save.attempts[restored.save.activeAttemptId].inputs.finalStory === story, 'Writing reload lost the exact story text.');
  assert(writingState.save.attempts[writingState.save.activeAttemptId].questState.writingIndex === restored.save.attempts[restored.save.activeAttemptId].questState.writingIndex, 'Writing reload changed the prompt index.');

  await driver.clickTestId('review-story');
  await waitForPhase(driver, 'review');
  assert((await driver.getText(await driver.find('css selector', '[data-testid="review-story-text"]'))) === story, 'Review changed the child-authored story.');
  await driver.clickTestId('open-copy');
  await waitForPhase(driver, 'copy');
  assert((await driver.getText(await driver.find('css selector', '[data-testid="copy-text"]'))) === story, 'Copy mode changed the child-authored story.');
  await driver.clickTestId('complete-copy');
  await waitForPhase(driver, 'complete');
  await reloadAndWait(driver);
  await waitForPhase(driver, 'resumePrompt');
  await driver.clickTestId('resume-quest');
  await waitForPhase(driver, 'complete');
  await driver.clickTestId('complete-return');
  await waitForPhase(driver, 'hub');

  await openQuestBoardFromFreshHub(driver);
  await driver.clickTestId('start-board');
  await waitForPhase(driver, 'questBriefing');
  const replayState = await appState(driver);
  const replayAttempt = replayState.save.attempts[replayState.save.activeAttemptId];
  assert(replayAttempt.seed.numericSeed !== firstSeed, 'Replay reused the first deterministic seed.');
  assert(Object.values(replayState.save.attempts).some((attempt) => attempt.completedAt), 'Replay overwrote the completed attempt.');
  await driver.clickTestId('begin-quest');
  await waitForPhase(driver, 'explore');
  await moveQuestPlayer(driver, 4, 3);
  await driver.clickTestId('action-button');
  await waitForPhase(driver, 'puzzle');
  const activeTablet = await executeApi(driver, 'getActiveTablet');
  await driver.clickTestId(activeTablet.isStory ? 'classify-story' : 'classify-not');
  await waitForPhase(driver, 'explore');
  const beforeReplayReload = await appState(driver);
  await reloadAndWait(driver);
  await waitForPhase(driver, 'resumePrompt');
  await driver.clickTestId('resume-quest');
  await waitForPhase(driver, 'explore');
  const afterReplayReload = await appState(driver);
  const beforeAttempt = beforeReplayReload.save.attempts[beforeReplayReload.save.activeAttemptId];
  const afterAttempt = afterReplayReload.save.attempts[afterReplayReload.save.activeAttemptId];
  assert(beforeAttempt.seed.numericSeed === afterAttempt.seed.numericSeed, 'Mid-puzzle replay reload changed the seed.');
  assert(JSON.stringify(beforeAttempt.questState) === JSON.stringify(afterAttempt.questState), 'Mid-puzzle replay reload changed puzzle or player state.');
  await executeApi(driver, 'moveToPhase', 'complete');
  await waitForPhase(driver, 'complete');
  await driver.clickTestId('complete-return');
  await waitForPhase(driver, 'hub');

  await reloadAndWait(driver);
  await waitForPhase(driver, 'hub');
  await openParentFromFreshHub(driver);
  await driver.holdTestId('parent-hold', 300);
  await sleep(400);
  assert((await pageSnapshot(driver)).phase === 'hub', 'A short Parent Alcove press bypassed the accidental-entry guard.');
  await driver.holdTestId('parent-hold', 1300);
  await waitForPhase(driver, 'parent');
  const normalSize = (await pageSnapshot(driver)).rootFontSize;
  await driver.clickTestId('large-text-toggle');
  await waitForState(driver, (state) => state.save?.settings?.textScale === 'large', 'larger-text persistence');
  const largeSnapshot = await pageSnapshot(driver);
  assert(largeSnapshot.textLargeClass, 'The larger-text class was not applied.');
  assert(Math.abs(largeSnapshot.rootFontSize / normalSize - 1.2) < 0.02, 'Larger text is not 20% above normal text.');
  await driver.clickTestId('reduced-motion-toggle');
  await waitForState(driver, (state) => state.save?.settings?.reducedMotion === true, 'reduced-motion persistence');
  assert((await pageSnapshot(driver)).reducedMotionClass, 'The reduced-motion class was not applied.');
  await saveScreenshot(driver, device, 'parent-accessibility');

  await reloadAndWait(driver);
  await waitForPhase(driver, 'hub');
  const persistedSettings = await appState(driver);
  assert(persistedSettings.save.settings.textScale === 'large' && persistedSettings.save.settings.reducedMotion, 'Accessibility settings did not survive reload.');
  await openParentFromFreshHub(driver);
  await driver.holdTestId('parent-hold', 1300);
  await waitForPhase(driver, 'parent');
  await driver.clickTestId('open-print-preview');
  await waitForPhase(driver, 'printPreview');
  assertHealthyLayout(await pageSnapshot(driver), 'A16 print preview');
  await saveScreenshot(driver, device, 'print-preview');
  await driver.clickTestId('print-now');
  const contexts = await driver.getContexts();
  await driver.setContext('NATIVE_APP');
  const printSource = await driver.getSource();
  assert(/Print|Printer Options/iu.test(printSource), 'The native iPad print sheet did not open.');
  await saveScreenshot(driver, device, 'native-print-sheet');
}

async function secondaryLocalSuite(driver, device, baseUrl) {
  await driver.navigate(`${baseUrl}?test=1`);
  await waitFor(async () => (await pageSnapshot(driver)).testStatus === 'pass', 'iPad mini browser self-test', 30000);
  assertHealthyLayout(await pageSnapshot(driver), 'iPad mini browser self-test');

  await driver.navigate(`${baseUrl}?test=1&autorun=0`);
  await resetTestStorage(driver);
  await setOrientation(driver, 'PORTRAIT');
  assertHealthyLayout(await pageSnapshot(driver), 'iPad mini onboarding portrait');
  await saveScreenshot(driver, device, 'onboarding-portrait');
  await setOrientation(driver, 'LANDSCAPE');
  assertHealthyLayout(await pageSnapshot(driver), 'iPad mini onboarding landscape');
  await saveScreenshot(driver, device, 'onboarding-landscape');

  await driver.typeTestId('student-name', 'Mini Writer');
  await driver.clickTestId('start-guild');
  await waitForPhase(driver, 'hub');
  await executeApi(driver, 'moveToPhase', 'explore');
  await waitForPhase(driver, 'explore');
  assertHealthyLayout(await pageSnapshot(driver), 'iPad mini exploration landscape');
  await setOrientation(driver, 'PORTRAIT');
  assertHealthyLayout(await pageSnapshot(driver), 'iPad mini exploration portrait');
  await saveScreenshot(driver, device, 'exploration-portrait');

  await executeApi(driver, 'moveToPhase', 'writing');
  await waitForPhase(driver, 'writing');
  await driver.typeTestId('writing-input', 'Mira');
  await setOrientation(driver, 'LANDSCAPE');
  const writing = await pageSnapshot(driver);
  assert(writing.viewport?.scale === 1, 'iPad mini writing input triggered Safari zoom.');
  assert(writing.focusRect && writing.focusRect.bottom <= writing.viewport.height + writing.viewport.offsetTop + 1, 'iPad mini writing input is hidden behind the keyboard.');
  await captureKeyboardCheckpoint(driver, device, 'writing-keyboard-landscape-checkpoint');

  await executeApi(driver, 'moveToPhase', 'complete');
  await waitForPhase(driver, 'complete');
  await driver.clickTestId('complete-return');
  await waitForPhase(driver, 'hub');
  await reloadAndWait(driver);
  await waitForPhase(driver, 'hub');
  await openParentFromFreshHub(driver);
  await driver.holdTestId('parent-hold', 1300);
  await waitForPhase(driver, 'parent');
  await driver.clickTestId('large-text-toggle');
  await waitForState(driver, (state) => state.save?.settings?.textScale === 'large', 'iPad mini larger text');
  await setOrientation(driver, 'PORTRAIT');
  assertHealthyLayout(await pageSnapshot(driver), 'iPad mini Parent Area with larger text');
  await saveScreenshot(driver, device, 'parent-large-text');
  await driver.clickTestId('reopen-copy');
  await waitForPhase(driver, 'copy');
  assertHealthyLayout(await pageSnapshot(driver), 'iPad mini copy mode with larger text');
  await saveScreenshot(driver, device, 'copy-large-text');
}

async function pagesSmokeSuite(driver, device) {
  const testUrl = new URL('?test=1', pagesUrl).toString();
  await driver.navigate(testUrl);
  await waitFor(async () => (await pageSnapshot(driver)).testStatus === 'pass', `${device.name} Pages self-test`, 30000);
  assertHealthyLayout(await pageSnapshot(driver), `${device.name} Pages self-test`);

  await driver.navigate(pagesUrl.toString());
  await waitForPhase(driver, 'onboarding');
  const normalSnapshot = await driver.execute(`
    return {
      testApiAbsent: window.__STORY_GUILD_TEST_API__ === undefined,
      canvas: Boolean(document.querySelector('canvas')),
      fatal: Boolean(document.querySelector('.fatal-error')),
    };
  `);
  assert(normalSnapshot.testApiAbsent, 'The normal Pages site exposed test mutation helpers.');
  assert(normalSnapshot.canvas && !normalSnapshot.fatal, 'The normal Pages site did not boot cleanly.');
  await driver.typeTestId('student-name', 'Pages Smoke');
  await driver.clickTestId('start-guild');
  await waitForPhase(driver, 'hub');
  assert(!(await pageSnapshot(driver)).configNotice, 'The deployed configuration fell back to defaults.');
  await saveScreenshot(driver, device, 'pages-smoke');
  await driver.execute(`
    localStorage.removeItem('storyGuild.save.v1');
    localStorage.removeItem('storyGuild.backup.v1');
    localStorage.removeItem('storyGuild.test.save.v1');
    localStorage.removeItem('storyGuild.test.backup.v1');
  `);
}

function distFiles(directory, base = directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? distFiles(path, base) : [relative(base, path)];
  });
}

async function verifyPagesArtifactParity() {
  const files = distFiles(join(root, 'dist'));
  for (const file of files) {
    const local = readFileSync(join(root, 'dist', file));
    const response = await fetch(new URL(file, pagesUrl));
    assert(response.ok, `GitHub Pages returned HTTP ${response.status} for ${file}.`);
    const deployed = Buffer.from(await response.arrayBuffer());
    const localHash = createHash('sha256').update(local).digest('hex');
    const deployedHash = createHash('sha256').update(deployed).digest('hex');
    assert(localHash === deployedHash, `GitHub Pages artifact differs from local dist for ${file}.`);
  }
  return files.length;
}

async function runSuite(name, device, serverUrl, initialUrl, action) {
  const started = Date.now();
  let driver;
  try {
    driver = await createSession(serverUrl, device, initialUrl);
    activeDriver = driver;
    await action(driver);
    results.push({ name, device: device.name, passed: true, durationMs: Date.now() - started });
  } catch (error) {
    let screenshot;
    if (driver) {
      try { screenshot = await saveScreenshot(driver, device, `${name.replaceAll(/[^a-z0-9]+/giu, '-').toLowerCase()}-failure`); }
      catch { /* The browser or native sheet may already be disconnected. */ }
      try {
        const snapshot = await pageSnapshot(driver);
        writeFileSync(join(artifactRoot, `${device.name.replaceAll(/[^a-z0-9]+/giu, '-').toLowerCase()}-${name}-failure-state.json`), JSON.stringify(snapshot, null, 2));
      } catch { /* Preserve the primary failure. */ }
    }
    results.push({ name, device: device.name, passed: false, durationMs: Date.now() - started, detail: error instanceof Error ? error.message : String(error), ...(screenshot ? { screenshot } : {}) });
  } finally {
    activeDriver = undefined;
    await driver?.close().catch(() => undefined);
  }
}

function writeReports(environment) {
  const payload = { generatedAt: new Date().toISOString(), environment, pagesUrl: pagesUrl.toString(), results };
  writeFileSync(join(artifactRoot, 'results.json'), JSON.stringify(payload, null, 2));
  const lines = [
    '# Story Guild iPad Simulator Test Results',
    '',
    `Summary: Local production and GitHub Pages simulator results for Milestones 0–1 on ${environment.runtimeVersion}.`,
    '',
    `Status: ${results.every((result) => result.passed) ? 'passed' : 'failed'}`,
    '',
    `Keywords: Story Guild; iPad Simulator; Mobile Safari; Appium; XCUITest; Milestones 0–1; ${environment.runtimeVersion}`,
    '',
    `Evidence: Generated ${payload.generatedAt} with Xcode ${environment.xcodeVersion}; Pages URL ${pagesUrl}.`,
    '',
    '## Automated Results',
    '',
    ...results.map((result) => `- [${result.passed ? 'x' : ' '}] ${result.device} — ${result.name} — ${result.passed ? 'PASS' : `FAIL: ${result.detail}`}`),
    '',
    '## Manual Simulator Checks Still Required',
    '',
    '- [ ] Visually inspect focus zoom and keyboard placement in both orientations.',
    '- [ ] Close and reopen a Safari tab and confirm the resume prompt restores progress.',
    '- [ ] Inspect portrait and landscape print-sheet page breaks and readability.',
    '- [ ] Complete one normal lesson and note visible frame drops or touch delays.',
    '',
    'Constraint: Simulator evidence is preflight evidence and does not complete the physical-iPad Safari gate.',
  ];
  writeFileSync(join(artifactRoot, 'results.md'), `${lines.join('\n')}\n`);
}

async function cleanup() {
  await activeDriver?.close().catch(() => undefined);
  for (const { child, log } of startedProcesses.reverse()) {
    if (!child.killed) child.kill('SIGTERM');
    log.end();
  }
  for (const udid of bootedByRunner) {
    try { command('xcrun', ['simctl', 'shutdown', udid]); }
    catch { /* Cleanup should not hide test results. */ }
  }
}

async function main() {
  const xcodeVersion = command('xcodebuild', ['-version']).trim().replaceAll('\n', ' / ');
  command('appium', ['--version']);
  command('npm', ['run', 'verify'], { inherit: true });
  const inventory = simulatorInventory();
  const [primary, secondary] = inventory.devices;
  Object.assign(primary, { wdaPort: 8100, mjpegPort: 9100 });
  Object.assign(secondary, { wdaPort: 8200, mjpegPort: 9200 });

  const previewPort = await freePort();
  const appiumPort = await freePort();
  const baseUrl = `http://127.0.0.1:${previewPort}/`;
  const appiumUrl = `http://127.0.0.1:${appiumPort}`;
  startProcess('npm', ['run', 'preview', '--', '--port', String(previewPort)], 'preview.log');
  await waitForHttp(baseUrl, 'Vite production preview');
  startProcess('appium', ['--port', String(appiumPort), '--log', join(artifactRoot, 'appium.log')], 'appium-process.log');
  await waitForHttp(`${appiumUrl}/status`, 'Appium server');

  let parityCount = 0;
  try { parityCount = await verifyPagesArtifactParity(); }
  catch (error) { results.push({ name: 'GitHub Pages artifact parity', device: 'deployment', passed: false, durationMs: 0, detail: error instanceof Error ? error.message : String(error) }); }
  if (parityCount > 0) results.push({ name: `GitHub Pages artifact parity (${parityCount} files)`, device: 'deployment', passed: true, durationMs: 0 });

  boot(primary);
  await runSuite('complete local Milestones 0–1 flow', primary, appiumUrl, `${baseUrl}?test=1&autorun=0`, (driver) => fullPrimaryLocalSuite(driver, primary, baseUrl));
  if (parityCount > 0) {
    await runSuite('GitHub Pages smoke', primary, appiumUrl, new URL('?test=1', pagesUrl).toString(), (driver) => pagesSmokeSuite(driver, primary));
  }
  shutdownIfStarted(primary);

  boot(secondary);
  await runSuite('local constrained-layout coverage', secondary, appiumUrl, `${baseUrl}?test=1`, (driver) => secondaryLocalSuite(driver, secondary, baseUrl));
  if (parityCount > 0) await runSuite('GitHub Pages smoke', secondary, appiumUrl, new URL('?test=1', pagesUrl).toString(), (driver) => pagesSmokeSuite(driver, secondary));
  shutdownIfStarted(secondary);

  writeReports({ xcodeVersion, runtimeVersion: inventory.runtime.version, runtimeBuild: inventory.runtime.buildversion, devices: inventory.devices.map(({ name, udid }) => ({ name, udid })) });
  const failures = results.filter((result) => !result.passed);
  console.log(`\nSimulator results: ${results.length - failures.length} passed, ${failures.length} failed.`);
  console.log(`Artifacts: ${relative(root, artifactRoot)}`);
  if (failures.length > 0) throw new Error(failures.map((failure) => `${failure.device} ${failure.name}: ${failure.detail}`).join('\n'));
}

try {
  await main();
} finally {
  await cleanup();
}
