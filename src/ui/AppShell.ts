import type { AppController } from '../app/AppController';
import { APP_CONFIG } from '../config';
import type { EventBus } from '../core/EventBus';
import { REFLECTION_PROMPTS, tabletById, WRITING_PROMPTS } from '../domain/courseCatalog';
import type { AppPhase, AppState, GameManifestV1 } from '../domain/models';
import { countWords } from '../domain/WordCountService';
import type { InteractionTarget } from '../game/createGame';
import type { AudioService } from '../services/AudioService';
import { createQuestOnePrintModel, escapeHtml, renderPrintHtml } from '../services/ExportService';

type Overlay = 'questBoard' | 'parentHold' | 'message' | null;

export class AppShell {
  private panel!: HTMLElement;
  private gameHost!: HTMLElement;
  private overlay: Overlay = null;
  private message = '';
  private error = '';
  private lastPhase: AppPhase = 'boot';
  private autosaveTimer: number | undefined;
  private pendingInput: { key: string; value: string } | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly controller: AppController,
    private readonly bus: EventBus,
    private readonly manifest: Readonly<GameManifestV1>,
    private readonly audio: AudioService,
  ) {}

  mount(): HTMLElement {
    this.root.innerHTML = `
      <div class="app-frame">
        <header class="app-header">
          <div><span class="eyebrow">THE STORY GUILD</span><h1>Twelve Quests</h1></div>
          <div class="header-actions">
            ${this.audio.hasCues() ? '<button class="icon-button" data-testid="sound-toggle" aria-label="Enable sound">Sound Off</button>' : ''}
            <span class="page-counter" data-testid="page-counter">0 / 12 pages</span>
          </div>
        </header>
        <div class="app-layout">
          <section class="game-column" aria-label="Adventure map">
            <div id="game-host" class="game-host"></div>
            <div class="touch-controls" data-testid="touch-controls">
              <div class="dpad" aria-label="Movement controls">
                <button data-direction="up" data-testid="move-up" aria-label="Move up">▲</button>
                <button data-direction="left" data-testid="move-left" aria-label="Move left">◀</button>
                <button data-direction="down" data-testid="move-down" aria-label="Move down">▼</button>
                <button data-direction="right" data-testid="move-right" aria-label="Move right">▶</button>
              </div>
              <button class="action-button" data-testid="action-button">ACTION</button>
            </div>
          </section>
          <section id="story-panel" class="story-panel" aria-label="Story activity"></section>
        </div>
      </div>`;
    this.gameHost = this.root.querySelector<HTMLElement>('#game-host') as HTMLElement;
    this.panel = this.root.querySelector<HTMLElement>('#story-panel') as HTMLElement;
    this.root.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        const direction = button.dataset.direction as 'up' | 'down' | 'left' | 'right';
        this.bus.emit('REQUEST_MOVE', direction);
      });
    });
    this.root.querySelector<HTMLButtonElement>('[data-testid="action-button"]')?.addEventListener('click', () => this.bus.emit('REQUEST_INTERACTION', undefined));
    this.root.querySelector<HTMLButtonElement>('[data-testid="sound-toggle"]')?.addEventListener('click', () => void this.toggleSound());
    this.bus.on('STATE_COMMITTED', (state) => this.onStateCommitted(state));
    window.addEventListener('pagehide', () => void this.flushAutosave());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.flushAutosave();
    });
    window.visualViewport?.addEventListener('resize', () => this.keepFocusedInputVisible());
    this.render(this.controller.getState());
    return this.gameHost;
  }

  private onStateCommitted(state: Readonly<AppState>): void {
    this.applyAccessibility(state);
    const focused = document.activeElement;
    const editing = focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement;
    if (editing && state.phase === this.lastPhase) {
      this.updateHeader(state);
      this.updateLiveCount(focused.value);
      return;
    }
    this.render(state);
  }

  private render(state: Readonly<AppState>): void {
    this.lastPhase = state.phase;
    this.applyAccessibility(state);
    this.updateHeader(state);
    document.body.classList.toggle('writing-active', ['reflection', 'writing', 'review', 'copy', 'parent', 'printPreview'].includes(state.phase));
    if (this.overlay) this.renderOverlay(state);
    else this.renderPhase(state);
  }

  private updateHeader(state: Readonly<AppState>): void {
    const counter = this.root.querySelector<HTMLElement>('[data-testid="page-counter"]');
    if (counter) counter.textContent = `${state.save?.progress.recoveredPages.length ?? 0} / 12 pages`;
    const sound = this.root.querySelector<HTMLButtonElement>('[data-testid="sound-toggle"]');
    if (sound) {
      sound.textContent = this.audio.isEnabled() ? 'Sound On' : 'Sound Off';
      sound.setAttribute('aria-label', this.audio.isEnabled() ? 'Mute sound' : 'Enable sound');
    }
  }

  private applyAccessibility(state: Readonly<AppState>): void {
    document.documentElement.classList.toggle('text-large', state.save?.settings.textScale === 'large');
    document.body.classList.toggle('reduced-motion', state.save?.settings.reducedMotion === true);
  }

  private renderPhase(state: Readonly<AppState>): void {
    this.error = '';
    switch (state.phase) {
      case 'boot': this.panel.innerHTML = this.card('Opening the Guild…', '<p>Loading local adventure tools.</p>'); break;
      case 'onboarding': this.renderOnboarding(state); break;
      case 'resumePrompt': this.renderResume(); break;
      case 'hub': this.renderHub(state); break;
      case 'questBriefing': this.renderBriefing(); break;
      case 'explore': this.renderExplore(); break;
      case 'puzzle': this.renderPuzzle(); break;
      case 'reflection': this.renderReflection(); break;
      case 'writing': this.renderWriting(); break;
      case 'review': this.renderReview(); break;
      case 'copy': this.renderCopy(); break;
      case 'complete': this.renderComplete(); break;
      case 'parent': this.renderParent(state); break;
      case 'printPreview': this.renderPrintPreview(state); break;
      case 'storageError': this.renderStorageError(); break;
    }
  }

  private card(title: string, body: string, kicker = ''): string {
    return `<article class="panel-card">${kicker ? `<p class="kicker">${escapeHtml(kicker)}</p>` : ''}<h2>${escapeHtml(title)}</h2>${body}<div class="inline-error" role="alert">${escapeHtml(this.error)}</div></article>`;
  }

  private renderOnboarding(state: Readonly<AppState>): void {
    this.panel.innerHTML = this.card('Join the Story Guild', `
      <p>Writers recover lost pages by noticing what happens and what changes.</p>
      ${state.recoveryNotice ? `<p class="notice">${escapeHtml(state.recoveryNotice)}</p>` : ''}
      <form data-testid="onboarding-form">
        <label for="student-name">Writer's name</label>
        <input id="student-name" data-testid="student-name" autocomplete="name" maxlength="40" required />
        <button class="primary" type="submit" data-testid="start-guild">Enter the Guild</button>
      </form>`, 'Welcome, apprentice');
    this.panel.querySelector<HTMLFormElement>('form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = this.panel.querySelector<HTMLInputElement>('#student-name');
      if (input) void this.run(() => this.controller.createProfile(input.value));
    });
  }

  private renderResume(): void {
    const attempt = this.controller.getActiveAttempt();
    this.panel.innerHTML = this.card('Your quest is waiting', `
      <p>Resume Quest 1 exactly where you stopped.</p>
      <p class="seed-line">Seed ${attempt?.seed.numericSeed ?? ''}</p>
      <div class="button-row">
        <button class="primary" data-action="resume" data-testid="resume-quest">Resume Quest</button>
        <button data-action="hub" data-testid="resume-return-hub">Return to Guild Hall</button>
      </div>`, 'Saved safely');
    this.bindClick('resume', () => this.controller.resumeQuest());
    this.bindClick('hub', () => this.controller.goToHub());
  }

  private renderHub(state: Readonly<AppState>): void {
    const name = state.save?.profile.studentName ?? 'Writer';
    const next = state.save?.progress.highestUnlockedLesson === 'L02' ? 'Quest 2 is unlocked for the next milestone.' : 'Walk to the Quest Board and press ACTION.';
    this.panel.innerHTML = this.card(`Welcome, ${name}`, `
      <p>${escapeHtml(next)}</p>
      <div class="quest-status"><span>Quest 1</span><strong>${state.save?.progress.recoveredPages.includes('L01') ? 'Page recovered' : 'Ready'}</strong></div>
      ${state.configNotice ? `<p class="notice">${escapeHtml(state.configNotice)}</p>` : ''}
      <p class="control-help">Move with the D-pad, arrow keys, or WASD. Use ACTION, Space, or Enter near a <strong>!</strong>.</p>`, 'Guild Hall');
  }

  private renderBriefing(): void {
    const attempt = this.controller.getActiveAttempt();
    this.panel.innerHTML = this.card('The Gate of Change', `
      <p>Six tablets are mixed up. Find which ones are stories.</p>
      <p>A story has an event and a change.</p>
      <div class="seed-card"><strong>Your adventure seed</strong><span>${escapeHtml(attempt?.seed.character ?? '')}</span><span>${escapeHtml(attempt?.seed.trouble ?? '')}</span></div>
      <div class="button-row"><button class="primary" data-action="begin" data-testid="begin-quest">Enter the Archive</button><button data-action="hub" data-testid="briefing-return-hub">Not yet</button></div>`, `${this.manifest.characters.rowan.displayName}, Quest Keeper`);
    this.bindClick('begin', () => this.controller.beginQuest());
    this.bindClick('hub', () => this.controller.goToHub());
  }

  private renderExplore(): void {
    const attempt = this.controller.getActiveAttempt();
    const solved = Object.keys(attempt?.questState.classifications ?? {}).length;
    this.panel.innerHTML = this.card('Explore the Archive', `
      <p>Walk beside a glowing tablet. Press ACTION to read it.</p>
      <div class="large-progress"><span style="width:${(solved / 6) * 100}%"></span></div>
      <p>${solved} of 6 tablets sorted</p>
      <button data-action="hub" data-testid="pause-quest">Pause and return to the Guild</button>`, 'No timer. No lost progress.');
    this.bindClick('hub', () => this.controller.goToHub());
  }

  private renderPuzzle(): void {
    const attempt = this.controller.getActiveAttempt();
    const tabletId = attempt?.questState.activeTabletId;
    const tablet = tabletId ? tabletById(tabletId) : undefined;
    const failures = tabletId ? attempt?.questState.unsuccessfulAttempts[tabletId] ?? 0 : 0;
    this.panel.innerHTML = this.card('Is this a story?', `
      <blockquote class="tablet-text">${escapeHtml(tablet?.text ?? '')}</blockquote>
      <p>Did something happen and change?</p>
      ${failures >= 2 ? '<p class="hint">Hint: Look for an event that makes the ending different.</p>' : ''}
      <div class="choice-grid">
        <button class="primary" data-choice="story" data-testid="classify-story">STORY</button>
        <button data-choice="not" data-testid="classify-not">NOT YET A STORY</button>
      </div>`, 'One tablet');
    this.panel.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach((button) => {
      button.addEventListener('click', () => void this.classify(button.dataset.choice === 'story'));
    });
  }

  private async classify(asStory: boolean): Promise<void> {
    try {
      this.setPending(true);
      const result = await this.controller.classifyActiveTablet(asStory);
      if (result.correct) await this.audio.play('puzzleSuccess');
      else {
        await this.audio.play('puzzleRetry');
        this.error = result.hint ?? 'Almost. Look again for an event and a change.';
        this.renderPuzzle();
      }
    } catch (error) { this.showError(error); }
    finally { this.setPending(false); }
  }

  private renderReflection(): void {
    const attempt = this.controller.getActiveAttempt();
    const index = attempt?.questState.reflectionIndex ?? 0;
    const prompt = REFLECTION_PROMPTS[index];
    if (!attempt || !prompt) return;
    const event = [...attempt.adventureEvents].reverse().find((entry) => entry.resultId === 'correct');
    const tablet = event?.objectId ? tabletById(event.objectId) : undefined;
    this.panel.innerHTML = this.card(prompt.prompt, `
      ${tablet ? `<p class="memory-line">Remember: ${escapeHtml(tablet.text)}</p>` : ''}
      <label class="sr-only" for="reflection-input">${escapeHtml(prompt.prompt)}</label>
      <textarea id="reflection-input" data-testid="reflection-input" data-input-key="${prompt.key}" rows="3" autocapitalize="sentences" spellcheck="true">${escapeHtml(attempt.inputs[prompt.key] ?? '')}</textarea>
      <div class="step-label">Question ${index + 1} of ${REFLECTION_PROMPTS.length}</div>
      <button class="primary" data-action="reflection-next" data-testid="reflection-next">Next</button>`, `${this.manifest.characters.pip.displayName}, Mapkeeper`);
    this.bindAutosaveInput(prompt.key);
    this.bindClick('reflection-next', async () => {
      await this.flushVisibleInput(prompt.key);
      await this.controller.advanceReflection();
    });
  }

  private renderWriting(): void {
    const attempt = this.controller.getActiveAttempt();
    if (!attempt) return;
    const index = attempt.questState.writingIndex;
    if (index < WRITING_PROMPTS.length) {
      const prompt = WRITING_PROMPTS[index];
      if (!prompt) return;
      this.panel.innerHTML = this.card(prompt.prompt, `
        <p class="story-frame">Somebody wanted something, but a problem happened, so the character acted, and then something changed.</p>
        <label for="writing-input">${escapeHtml(prompt.label)}</label>
        <input id="writing-input" data-testid="writing-input" data-input-key="${prompt.key}" value="${escapeHtml(attempt.inputs[prompt.key] ?? '')}" autocapitalize="sentences" spellcheck="true" />
        <div class="step-label">Story part ${index + 1} of 5</div>
        <button class="primary" data-action="writing-next" data-testid="writing-next">Save and continue</button>`, 'Plan your tiny story');
      this.bindAutosaveInput(prompt.key);
      this.bindClick('writing-next', async () => {
        await this.flushVisibleInput(prompt.key);
        await this.controller.advanceWriting();
      });
      return;
    }
    const story = attempt.inputs.finalStory ?? '';
    this.panel.innerHTML = this.card('Write your own 6–12-word story', `
      <p>Use your plan. The Guild will not write the sentence for you.</p>
      <label class="sr-only" for="writing-input">Your 6 to 12 word story</label>
      <textarea id="writing-input" data-testid="writing-input" data-input-key="finalStory" rows="4" autocapitalize="sentences" spellcheck="true">${escapeHtml(story)}</textarea>
      <div class="word-meter"><strong data-testid="live-word-count">${countWords(story)}</strong> / 6–12 words</div>
      <button class="primary" data-action="writing-next" data-testid="review-story">Review my story</button>`, 'Your words');
    this.bindAutosaveInput('finalStory', true);
    this.bindClick('writing-next', async () => {
      await this.flushVisibleInput('finalStory');
      await this.controller.advanceWriting();
    });
  }

  private renderReview(): void {
    const artifact = this.controller.getActiveAttempt()?.artifact;
    if (!artifact) return;
    const plan = Object.entries(artifact.planning).map(([label, value]) => `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</li>`).join('');
    this.panel.innerHTML = this.card('Review your exact words', `
      <ul class="plan-review">${plan}</ul>
      <blockquote class="story-review" data-testid="review-story-text">${escapeHtml(artifact.storyText)}</blockquote>
      <p>${artifact.wordCount} story words</p>
      <div class="button-row"><button data-action="edit" data-testid="edit-story">Edit</button><button class="primary" data-action="copy" data-testid="open-copy">Copy into my journal</button></div>`, 'Nothing was rewritten');
    this.bindClick('edit', () => this.controller.editFromReview());
    this.bindClick('copy', () => this.controller.openCopy());
  }

  private renderCopy(): void {
    const artifact = this.controller.getActiveAttempt()?.artifact;
    if (!artifact) return;
    this.panel.innerHTML = this.card('Copy into Your Adventure Journal', `
      <p>Copy this sentence onto paper in your own handwriting.</p>
      <div class="copy-card" data-testid="copy-text">${escapeHtml(artifact.storyText)}</div>
      <p class="step-label">Sentence 1 of 1 · ${artifact.wordCount} words</p>
      <div class="button-row"><button data-action="review" data-testid="copy-return-review">Back to review</button><button class="primary" data-action="copied" data-testid="complete-copy">I Copied This</button></div>`, 'Game motion is paused');
    this.bindClick('review', () => this.controller.returnToReview());
    this.bindClick('copied', () => this.controller.completeCopy());
  }

  private renderComplete(): void {
    const artifact = this.controller.getActiveAttempt()?.artifact;
    this.panel.innerHTML = this.card('The first page returned!', `
      <div class="recovered-page"><span>PAGE I</span><strong>The Gate of Change</strong><q>${escapeHtml(artifact?.storyText ?? '')}</q></div>
      <p>Quest 2 is unlocked for the next milestone.</p>
      <button class="primary" data-action="hub" data-testid="complete-return">Return to Guild Hall</button>`, 'Quest complete');
    this.bindClick('hub', () => this.controller.goToHub());
  }

  private renderParent(state: Readonly<AppState>): void {
    const save = state.save;
    if (!save) return;
    const attempts = Object.values(save.attempts).sort((a, b) => a.attemptNumber - b.attemptNumber);
    const rows = attempts.length === 0 ? '<p>No attempts yet.</p>' : attempts.map((attempt) => `
      <div class="attempt-row"><div><strong>Quest 1 · Attempt ${attempt.attemptNumber}</strong><span>${attempt.completedAt ? 'Complete' : `Saved in ${attempt.phase}`}</span></div>
      ${attempt.artifact ? `<button data-reopen="${escapeHtml(attempt.attemptId)}" data-testid="reopen-copy">Copy page</button>` : ''}</div>`).join('');
    this.panel.innerHTML = this.card('Parent Area', `
      ${state.configNotice ? `<p class="notice">${escapeHtml(state.configNotice)}</p>` : ''}
      ${state.recoveryNotice ? `<p class="notice">${escapeHtml(state.recoveryNotice)}</p>` : ''}
      <label for="parent-name">Student display name</label><div class="inline-form"><input id="parent-name" data-testid="parent-name" value="${escapeHtml(save.profile.studentName)}" /><button data-action="save-name" data-testid="save-parent-name">Save</button></div>
      <fieldset class="settings-fieldset"><legend>Reading and motion</legend>
        <label class="setting-toggle"><input type="checkbox" data-testid="large-text-toggle" ${save.settings.textScale === 'large' ? 'checked' : ''} /><span><strong>Larger text</strong><small>Increase interface text by 20%.</small></span></label>
        <label class="setting-toggle"><input type="checkbox" data-testid="reduced-motion-toggle" ${save.settings.reducedMotion ? 'checked' : ''} /><span><strong>Reduce motion</strong><small>Turn off interface animation and smooth scrolling.</small></span></label>
      </fieldset>
      <h3>Quest attempts</h3>${rows}
      <div class="button-stack"><button class="primary" data-action="print" data-testid="open-print-preview" ${attempts.some((attempt) => attempt.artifact) ? '' : 'disabled'}>Open Print Preview</button><button data-action="close-parent" data-testid="close-parent">Return to Guild Hall</button></div>
      <details><summary data-testid="reset-progress-summary">Reset progress</summary><p>Type RESET. Damaged or cleared progress cannot be restored through the game.</p><div class="inline-form"><input id="reset-confirm" data-testid="reset-confirm" autocomplete="off" /><button class="danger" data-action="reset" data-testid="reset-progress">Reset</button></div></details>`, 'Adults and helpers');
    this.bindClick('save-name', () => this.controller.updateStudentName(this.panel.querySelector<HTMLInputElement>('#parent-name')?.value ?? ''));
    this.bindClick('print', () => this.controller.openPrintPreview());
    this.bindClick('close-parent', () => this.controller.closeParent());
    this.bindClick('reset', () => this.controller.resetProgress(this.panel.querySelector<HTMLInputElement>('#reset-confirm')?.value ?? ''));
    this.panel.querySelector<HTMLInputElement>('[data-testid="large-text-toggle"]')?.addEventListener('change', (event) => {
      const checked = (event.currentTarget as HTMLInputElement).checked;
      void this.run(() => this.controller.setTextScale(checked ? 'large' : 'normal'));
    });
    this.panel.querySelector<HTMLInputElement>('[data-testid="reduced-motion-toggle"]')?.addEventListener('change', (event) => {
      const checked = (event.currentTarget as HTMLInputElement).checked;
      void this.run(() => this.controller.setReducedMotion(checked));
    });
    this.panel.querySelectorAll<HTMLButtonElement>('[data-reopen]').forEach((button) => button.addEventListener('click', () => void this.run(() => this.controller.reopenCopy(button.dataset.reopen ?? ''))));
  }

  private renderPrintPreview(state: Readonly<AppState>): void {
    const save = state.save;
    if (!save) return;
    const selectedId = save.progress.selectedAttemptByLesson.L01;
    const selected = selectedId ? save.attempts[selectedId] : Object.values(save.attempts).find((attempt) => attempt.artifact);
    if (!selected?.artifact) {
      this.panel.innerHTML = this.card('Nothing to print yet', '<button data-action="close-print" data-testid="close-print-preview">Back</button>');
      this.bindClick('close-print', () => this.controller.closePrintPreview());
      return;
    }
    const html = renderPrintHtml(createQuestOnePrintModel(save, selected));
    this.panel.innerHTML = `${html}<div class="print-actions"><button data-action="close-print" data-testid="close-print-preview">Back</button><button class="primary" data-action="print-now" data-testid="print-now">Print</button></div>`;
    this.bindClick('close-print', () => this.controller.closePrintPreview());
    this.panel.querySelector<HTMLButtonElement>('[data-action="print-now"]')?.addEventListener('click', () => window.print());
  }

  private renderStorageError(): void {
    this.panel.innerHTML = this.card('Saved work needs attention', `
      <p>The primary save and its backup could not be read. Nothing was silently discarded.</p>
      <p>Type RESET to preserve both raw values under diagnostic keys and start a new profile.</p>
      <div class="inline-form"><input id="storage-reset" data-testid="storage-reset-confirm" autocomplete="off" /><button class="danger" data-action="storage-reset" data-testid="storage-reset">Preserve and reset</button></div>`);
    this.bindClick('storage-reset', () => this.controller.confirmStorageReset(this.panel.querySelector<HTMLInputElement>('#storage-reset')?.value ?? ''));
  }

  private renderOverlay(state: Readonly<AppState>): void {
    if (this.overlay === 'questBoard') {
      const completed = state.save?.progress.recoveredPages.includes('L01') ?? false;
      const active = state.save?.activeAttemptId ? state.save.attempts[state.save.activeAttemptId] : undefined;
      this.panel.innerHTML = this.card('Guild Quest Board', `
        <div class="quest-card"><span>Quest 1</span><h3>The Gate of Change</h3><p>Tell whether words form a story.</p><strong>${completed ? 'Recovered · Replay available' : 'Unlocked'}</strong></div>
        ${active && active.phase !== 'complete' ? '<button class="primary" data-action="resume-board" data-testid="resume-board">Resume saved attempt</button>' : `<button class="primary" data-action="start-board" data-testid="start-board">${completed ? 'Replay with a new seed' : 'Start Quest 1'}</button>`}
        <button data-action="close-overlay" data-testid="close-quest-board">Close board</button>`, 'Twelve pages are missing');
      this.bindClick('start-board', () => { this.overlay = null; return this.controller.startQuest(); });
      this.bindClick('resume-board', () => { this.overlay = null; return this.controller.resumeQuest(); });
      this.bindOverlayClose();
      return;
    }
    if (this.overlay === 'parentHold') {
      this.panel.innerHTML = this.card('Parent Alcove', `
        <p>Press and hold for a moment to open adult tools.</p>
        <button class="hold-button" data-testid="parent-hold"><span>Hold to enter</span><i></i></button>
        <button data-action="close-overlay" data-testid="cancel-parent-hold">Cancel</button>`, 'Accidental-entry guard');
      const button = this.panel.querySelector<HTMLButtonElement>('[data-testid="parent-hold"]');
      let timer: number | undefined;
      const cancel = (): void => { if (timer !== undefined) window.clearTimeout(timer); button?.classList.remove('holding'); };
      button?.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        button.classList.add('holding');
        timer = window.setTimeout(() => {
          this.overlay = null;
          void this.run(() => this.controller.openParent());
        }, APP_CONFIG.parentHoldMs);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach((type) => button?.addEventListener(type, cancel));
      this.bindOverlayClose();
      return;
    }
    this.panel.innerHTML = this.card('Guild Message', `<p>${escapeHtml(this.message)}</p><button data-action="close-overlay" data-testid="close-message">Continue</button>`);
    this.bindOverlayClose();
  }

  handleInteraction(target: InteractionTarget): void {
    if (target.kind === 'questBoard') this.overlay = 'questBoard';
    else if (target.kind === 'parentAlcove') this.overlay = 'parentHold';
    else if (target.kind === 'tablet') {
      void this.run(() => this.controller.openTablet(target.tabletId));
      return;
    } else {
      this.overlay = 'message';
      if (target.kind === 'hall') this.message = 'Recovered pages will glow here. The first page is waiting for Quest 1.';
      else if (target.characterId === 'rowan') this.message = 'A story is more than a picture. Something happens, and something changes.';
      else this.message = 'Read each tablet carefully. Events make stories move.';
    }
    this.render(this.controller.getState());
  }

  private bindOverlayClose(): void {
    this.panel.querySelector<HTMLButtonElement>('[data-action="close-overlay"]')?.addEventListener('click', () => {
      this.overlay = null;
      this.render(this.controller.getState());
    });
  }

  private bindClick(action: string, callback: () => Promise<void>): void {
    this.panel.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)?.addEventListener('click', () => void this.run(callback));
  }

  private bindAutosaveInput(key: string, liveCount = false): void {
    const input = this.panel.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-input-key="${key}"]`);
    if (!input) return;
    input.addEventListener('input', () => {
      this.pendingInput = { key, value: input.value };
      if (this.autosaveTimer !== undefined) window.clearTimeout(this.autosaveTimer);
      this.autosaveTimer = window.setTimeout(() => void this.flushAutosave(), APP_CONFIG.autosaveMs);
      if (liveCount) this.updateLiveCount(input.value);
    });
    input.addEventListener('blur', () => void this.flushAutosave());
    input.addEventListener('focus', () => this.keepFocusedInputVisible());
  }

  private updateLiveCount(value: string): void {
    const counter = this.panel.querySelector<HTMLElement>('[data-testid="live-word-count"]');
    if (counter) counter.textContent = String(countWords(value));
  }

  private async flushVisibleInput(key: string): Promise<void> {
    const input = this.panel.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-input-key="${key}"]`);
    if (input) {
      this.pendingInput = null;
      if (this.autosaveTimer !== undefined) window.clearTimeout(this.autosaveTimer);
      await this.controller.saveInput(key, input.value);
    }
  }

  private async flushAutosave(): Promise<void> {
    if (!this.pendingInput) return;
    const pending = this.pendingInput;
    this.pendingInput = null;
    if (this.autosaveTimer !== undefined) window.clearTimeout(this.autosaveTimer);
    await this.controller.saveInput(pending.key, pending.value);
  }

  private async toggleSound(): Promise<void> {
    this.audio.unlockFromGesture();
    const enabled = !this.audio.isEnabled();
    this.audio.setEnabled(enabled);
    await this.controller.setSoundEnabled(enabled);
    if (enabled) await this.audio.play('uiActivate');
  }

  private async run(callback: () => Promise<void>): Promise<void> {
    this.error = '';
    this.setPending(true);
    try { await callback(); }
    catch (error) { this.showError(error); }
    finally { this.setPending(false); }
  }

  private showError(error: unknown): void {
    this.error = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
    const target = this.panel.querySelector<HTMLElement>('.inline-error');
    if (target) target.textContent = this.error;
  }

  private setPending(pending: boolean): void {
    this.panel.querySelectorAll<HTMLButtonElement>('button').forEach((button) => { button.disabled = pending; });
  }

  private keepFocusedInputVisible(): void {
    const focused = document.activeElement;
    if (!(focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement)) return;
    const reduceMotion = this.controller.getState().save?.settings.reducedMotion === true
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => focused.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }), 50);
  }
}
