import type { AppController } from '../app/AppController';
import { APP_CONFIG } from '../config';
import type { EventBus } from '../core/EventBus';
import { CANONICAL_TABLETS, REFLECTION_PROMPTS, tabletById, WRITING_PROMPTS } from '../domain/courseCatalog';
import { comparisonChoices, currentScene, SCENE_IDS, sceneImage, storyScene } from '../domain/storybook';
import type { AppPhase, AppState, GameManifestV1, LessonAttempt, StorySceneId } from '../domain/models';
import { countWords } from '../domain/WordCountService';
import type { AudioService } from '../services/AudioService';
import { NarrationService } from '../services/NarrationService';
import { createQuestOnePrintModel, escapeHtml as esc, renderPrintHtml } from '../services/ExportService';

const bookIcon = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 8C11 4 5 5 3 6v21c4-2 9-2 13 1 4-3 9-3 13-1V6c-3-1-8-2-13 2Z" fill="currentColor"/><path d="M16 9v16" stroke="#fff9eb" stroke-width="2"/></svg>';
const speakerIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3Z" fill="currentColor"/><path d="M16 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

export class AppShell {
  private panel!: HTMLElement;
  private sceneColumn!: HTMLElement;
  private hotspots!: HTMLElement;
  private overlay: 'stories' | null = null;
  private lastPhase: AppPhase = 'boot';
  private busy = false;
  private readonly pending = new Map<string, string>();
  private autosaveTimer: number | undefined;
  private flushing: Promise<void> | undefined;
  private pipJoke = 0;

  constructor(private readonly root: HTMLElement, private readonly controller: AppController,
    private readonly bus: EventBus, private readonly manifest: Readonly<GameManifestV1>,
    private readonly audio: AudioService, private readonly narration = new NarrationService()) {}

  mount(): HTMLElement {
    this.root.innerHTML = `<div class="app-frame"><header class="app-header">
      <a class="brand" href="#" aria-label="The Story Guild home">${bookIcon}<span>The Story Guild<small>Little stories. Big adventures.</small></span></a>
      <div class="header-actions"><span class="page-counter" data-testid="page-counter">My first page</span>
      <button class="quiet-button" data-testid="sound-toggle">${speakerIcon}<span>Sound off</span></button>
      <button class="quiet-button parent-button" data-testid="parent-hold" aria-label="Hold to open Parent Area" title="Hold to open Parent Area">Grown-ups<i></i></button></div></header>
      <main class="app-layout"><section class="game-column" aria-label="Your story adventure">
      <div class="scene-stage"><div id="game-host" class="game-host"></div><div class="hotspot-layer"></div></div>
      <div class="scene-footer"><span class="scene-location">THE STORY GUILD LIBRARY</span><span class="scene-dots">● ○ ○</span></div></section>
      <section id="story-panel" class="story-panel" aria-label="Story activity"></section></main><div class="toast" role="status" aria-live="polite"></div></div>`;
    this.panel = this.root.querySelector('#story-panel')!;
    this.sceneColumn = this.root.querySelector('.game-column')!;
    this.hotspots = this.root.querySelector('.hotspot-layer')!;
    this.root.addEventListener('pointerdown', () => this.audio.unlockFromGesture(), { capture: true });
    this.root.addEventListener('keydown', () => this.audio.unlockFromGesture(), { capture: true });
    this.root.querySelector('.brand')?.addEventListener('click', (event) => { event.preventDefault(); if (this.controller.getState().save) void this.run(async () => { this.overlay = null; await this.controller.goToHub(); }); });
    this.root.querySelector('[data-testid="sound-toggle"]')?.addEventListener('click', () => {
      this.audio.unlockFromGesture(); const enabled = !this.audio.isEnabled(); this.audio.setEnabled(enabled);
      if (!enabled) this.narration.stop();
      if (this.controller.getState().save) void this.run(() => this.controller.setSoundEnabled(enabled));
      else this.updateHeader(this.controller.getState());
      if (enabled) void this.play('uiActivate');
    });
    this.bindParentHold();
    this.bus.on('STATE_COMMITTED', (state) => {
      this.applySettings(state);
      if ((this.pending.size > 0 || document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) && state.phase === this.lastPhase) { this.updateHeader(state); return; }
      this.render(state);
    });
    const suspend = (): void => { void this.flush().catch((error: unknown) => this.showError(error)); this.narration.stop(); this.audio.stopAll(); };
    window.addEventListener('pagehide', suspend);
    document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
    window.visualViewport?.addEventListener('resize', () => this.keepInputVisible());
    this.render(this.controller.getState());
    return this.root.querySelector('#game-host')!;
  }

  private applySettings(state: Readonly<AppState>): void {
    document.documentElement.classList.toggle('text-large', state.save?.settings.textScale === 'large');
    document.body.classList.toggle('reduced-motion', state.save?.settings.reducedMotion === true);
  }

  private updateHeader(state: Readonly<AppState>): void {
    const count = state.save?.progress.recoveredPages.length ?? 0;
    this.root.querySelector('[data-testid="page-counter"]')!.textContent = count ? `${count} page${count === 1 ? '' : 's'} restored` : 'My first page';
    const sound = this.root.querySelector('[data-testid="sound-toggle"]')!;
    sound.innerHTML = `${speakerIcon}<span>Sound ${this.audio.isEnabled() ? 'on' : 'off'}</span>`;
    sound.setAttribute('aria-label', this.audio.isEnabled() ? 'Mute sound effects' : 'Enable sound effects');
    sound.setAttribute('aria-pressed', String(this.audio.isEnabled()));
    (this.root.querySelector('[data-testid="parent-hold"]') as HTMLButtonElement).disabled = !state.save;
  }

  private render(state: Readonly<AppState>): void {
    this.narration.stop(); this.lastPhase = state.phase; this.applySettings(state); this.updateHeader(state);
    const attempt = this.controller.getActiveAttempt();
    const writing = ['reflection', 'writing', 'review', 'celebration', 'copy', 'complete', 'parent', 'printPreview'].includes(state.phase) || Boolean(this.overlay);
    document.body.classList.toggle('writing-active', writing);
    this.root.dataset.layout = writing ? 'desk' : 'adventure'; this.sceneColumn.hidden = writing; this.hotspots.innerHTML = '';
    const progress = attempt?.questState.storybook;
    this.root.querySelector('.scene-location')!.textContent = progress && !['hub', 'onboarding', 'resumePrompt'].includes(state.phase) ? currentScene(attempt!).title.toUpperCase() : 'THE STORY GUILD LIBRARY';
    this.root.querySelector('.scene-dots')!.textContent = progress ? SCENE_IDS.map((_, i) => i <= progress.sceneIndex ? '●' : '○').join(' ') : '✦ A new adventure awaits';
    if (this.overlay === 'stories') this.renderStories(state);
    else switch (state.phase) {
      case 'boot': this.panel.innerHTML = this.card('Opening the library…', '<p>Your adventure is almost ready.</p>'); break;
      case 'onboarding': this.renderOnboarding(state); break;
      case 'hub': case 'resumePrompt': this.renderHub(state); break;
      case 'questBriefing': this.renderBriefing(); break;
      case 'explore': case 'puzzle': if (attempt?.experience) this.renderAdventure(attempt); else this.renderLegacy(attempt!); break;
      case 'reflection': this.renderLegacy(attempt!); break;
      case 'writing': this.renderWriting(attempt!); break;
      case 'review': this.renderReview(attempt!); break;
      case 'celebration': this.renderCelebration(attempt!); break;
      case 'copy': this.renderCopy(attempt!); break;
      case 'complete': this.renderComplete(attempt!); break;
      case 'parent': this.renderParent(state); break;
      case 'printPreview': this.renderPrint(state); break;
      case 'storageError': this.renderStorageError(); break;
    }
    this.bindInputs(); this.bindReadAloud();
    this.panel.querySelectorAll('[data-home]').forEach((button) => button.addEventListener('click', () => void this.run(() => this.controller.goToHub())));
    this.setPending(this.busy);
  }

  private card(title: string, body: string, eyebrow = '', pip = false): string {
    return `<article class="panel-card">${pip ? `<button class="pip-badge" data-pip aria-label="Talk to Pip"><img src="${this.asset('pip')}" alt=""/><span>Pip<small>Your story pal</small></span><span class="pip-spark">✦</span></button>` : ''}${eyebrow ? `<p class="kicker">${esc(eyebrow)}</p>` : ''}<h1 tabindex="-1">${esc(title)}</h1>${body}<div class="inline-error" role="alert"></div></article>`;
  }
  private hear(text: string, label = 'Hear it'): string { return `<button class="hear-button" data-read="${esc(text)}" aria-label="${esc(label)}">${speakerIcon}<span>${esc(label)}</span></button>`; }
  private asset(key: string): string { const path = this.manifest.storybook?.images[key]; return path ? new URL(path, new URL('.', window.location.href)).toString() : ''; }

  private renderOnboarding(state: Readonly<AppState>): void {
    this.panel.innerHTML = this.card('Every little story starts with you.', `<p class="lead">A runaway page. A sneezy book. One very small dragon.</p><p>Help Pip find the page — then give it a story of your own.</p>${this.hear('Welcome to the Story Guild! Help Pip find a runaway page. Then write your own tiny story.')}${state.recoveryNotice ? `<p class="notice">${esc(state.recoveryNotice)}</p>` : ''}<form data-testid="onboarding-form"><label for="student-name">What should Pip call you?</label><input id="student-name" data-testid="student-name" autocomplete="given-name" maxlength="40" required placeholder="Your name"/><button class="primary" type="submit" data-testid="start-guild">Let’s meet Pip <span>→</span></button></form><p class="fine-print">A little adventure for a big imagination.</p>`, 'WELCOME TO THE STORY GUILD');
    this.panel.querySelector('form')?.addEventListener('submit', (event) => { event.preventDefault(); const name = this.panel.querySelector<HTMLInputElement>('#student-name')!.value; void this.run(async () => { await this.controller.createProfile(name, this.audio.isEnabled()); await this.controller.startQuest(); }); });
  }
  private renderHub(state: Readonly<AppState>): void {
    const attempt = this.controller.getActiveAttempt(); const unfinished = Boolean(attempt);
    this.panel.innerHTML = this.card(`Hello, ${state.save?.profile.studentName ?? 'story maker'}!`, `<p class="lead">${unfinished ? 'Your adventure is right where you left it.' : 'Ready to make a little magic?'}</p><div class="quest-card"><span class="quest-number">YOUR FIRST ADVENTURE</span><h2>Pip and the Runaway Page</h2><p>Follow a flying page through three funny library surprises.</p><span class="time-note">Play + write · about 10–15 minutes</span></div><button class="primary" data-action="play" data-testid="${unfinished ? 'resume-quest' : 'start-board'}">${unfinished ? 'Continue my adventure' : 'Let’s play'} <span>→</span></button><button class="secondary" data-action="stories" data-testid="my-stories">${bookIcon} My stories</button>${state.recoveryNotice ? `<p class="notice">${esc(state.recoveryNotice)}</p>` : ''}`, 'YOUR LITTLE CORNER OF STORYLAND');
    this.bind('play', () => unfinished ? this.controller.resumeQuest() : this.controller.startQuest());
    this.bind('stories', async () => { this.overlay = 'stories'; });
  }
  private renderBriefing(): void {
    this.panel.innerHTML = this.card('A page has escaped!', `<p class="lead">It wriggled out of our book and hid under that sleepy book.</p><p>Will you help me bring it home?</p>${this.hear('A page has escaped! It hid under a sleepy book. Will you help me bring it home?')}<button class="primary" data-action="begin" data-testid="begin-quest">Let’s find it! <span>→</span></button><p class="gentle-note">Tap things. Try ideas. See what changes.</p><button class="text-button" data-home>Come back later</button>`, 'PIP AND THE RUNAWAY PAGE', true);
    this.bind('begin', () => this.controller.beginQuest());
  }

  private renderAdventure(attempt: LessonAttempt): void {
    const progress = attempt.questState.storybook!; const scene = currentScene(attempt);
    const key = `${scene.id}:${progress.activity}`; const failures = progress.attempts[key] ?? 0; const help = progress.help[key];
    let title = scene.title; let body = '';
    if (progress.activity === 'interact') {
      body = `<p class="lead">${esc(scene.instruction)}</p>${this.hear(scene.instruction)}<div class="action-choices">${scene.actions.map((a) => `<button class="primary" data-scene-action="${a.id}" data-testid="scene-action-${a.id}">${esc(a.label)} <span>✦</span></button>`).join('')}</div><p class="gentle-note">You can tap the picture, too.</p>`;
      this.hotspots.innerHTML = scene.actions.map((a) => `<button class="hotspot" style="left:${a.x}%;top:${a.y}%" data-scene-action="${a.id}" aria-label="${esc(a.label)}"><span>✦</span><small>${esc(a.label)}</small></button>`).join('');
    } else if (progress.activity === 'compare') {
      title = 'Which tells a story?';
      body = `<p>Pick the words where something happens and changes.</p>${this.hear('Which tells a story? Pick the words where something happens and changes.')}<div class="story-choices">${comparisonChoices(attempt).map((option, i) => `<div class="story-choice"><button data-answer="${option.id}" data-testid="answer-${option.id}"><span class="choice-letter">${i === 0 ? 'A' : 'B'}</span><span>${esc(option.text)}</span></button>${this.hear(option.text, `Hear choice ${i === 0 ? 'A' : 'B'}`)}</div>`).join('')}</div>`;
    } else if (progress.activity === 'change') {
      title = 'What changed?';
      body = `<p>Look at the picture. What is different now?</p>${this.hear('What changed? Look at the picture. What is different now?')}<div class="action-choices">${scene.changes.map((o) => `<button class="secondary" data-answer="${o.id}" data-testid="change-${o.id}">${esc(o.label)}</button>`).join('')}</div>`;
      this.hotspots.innerHTML = scene.changes.map((o) => `<button class="hotspot" style="left:${o.x}%;top:${o.y}%" data-answer="${o.id}" aria-label="${esc(o.label)}"><span>?</span></button>`).join('');
    } else {
      title = progress.sceneIndex === 2 ? 'You brought it home!' : 'You spotted the change!';
      body = `<div class="discovery-mark">✦</div><p class="lead">${esc(scene.outcome)}</p>${this.hear(scene.outcome)}<p class="memory-chip">${esc(scene.memory)}</p><button class="primary" data-action="next-scene" data-testid="next-scene">${progress.sceneIndex === 2 ? 'Write my tiny story' : 'Follow that page'} <span>→</span></button>`;
    }
    if (failures) body += '<p class="try-again" role="status">Let’s look again. Which choice shows something becoming different?</p>';
    if (help) body += `<aside class="hint"><strong>Pip’s little clue</strong><p>${esc(scene.hint)}</p>${this.hear(scene.hint, 'Hear the clue')}${['compare', 'change'].includes(progress.activity) ? '<button class="text-button" data-action="show-me" data-testid="show-me">Show me, Pip</button>' : ''}</aside>`;
    body += `<div class="activity-footer"><button class="text-button" data-action="help" data-testid="help">${help ? 'Another example' : 'Help me, Pip'}</button><button class="text-button" data-home data-testid="pause-quest">Save & take a break</button></div>`;
    this.panel.innerHTML = this.card(title, body, `DISCOVERY ${progress.sceneIndex + 1} OF 3`, true);
    this.root.querySelectorAll<HTMLButtonElement>('[data-scene-action]').forEach((b) => b.addEventListener('click', () => void this.run(async () => { await this.controller.interactWithScene(b.dataset.sceneAction!); void this.play('interaction'); })));
    this.root.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach((b) => b.addEventListener('click', () => void this.run(async () => { await this.controller.answerScene(b.dataset.answer!); if (this.controller.getActiveAttempt()?.questState.storybook?.activity !== progress.activity) void this.play('puzzleSuccess'); })));
    this.bind('help', async () => { if (!help) await this.controller.requestSceneHelp(); else { const text = CANONICAL_TABLETS.find((t) => t.id === 'drum-door-story')!.text; this.toast(text); } });
    this.bind('show-me', async () => { await this.controller.answerScene(progress.activity === 'compare' ? 'after' : scene.changedId, true); this.toast(scene.hint); });
    this.bind('next-scene', () => this.controller.continueScene());
  }

  private recap(attempt: LessonAttempt): string {
    return attempt.experience ? `<details class="recap" open><summary>Your adventure memories</summary><div class="memory-strip">${SCENE_IDS.map((id, i) => `<figure><img src="${this.asset(sceneImage(attempt, id))}" alt="${esc(storyScene(i, attempt.questState.storybook?.shelfChoice).memory)}"/><figcaption>${esc(storyScene(i, attempt.questState.storybook?.shelfChoice).memory)}</figcaption></figure>`).join('')}</div></details>` : '';
  }
  private wordGuidance(count: number): string { return count < 6 ? `${6 - count} more to reach six` : count > 12 ? `Try ${count - 12} fewer words` : 'Fits your tiny page!'; }
  private renderWriting(attempt: LessonAttempt): void {
    const legacyPrompt = !attempt.experience ? WRITING_PROMPTS[attempt.questState.writingIndex] : undefined;
    if (legacyPrompt) {
      this.panel.innerHTML = this.card(legacyPrompt.prompt, `<label for="writing-input">${esc(legacyPrompt.label)}</label><input id="writing-input" data-testid="writing-input" data-input-key="${legacyPrompt.key}" value="${esc(attempt.inputs[legacyPrompt.key] ?? '')}"/><button class="primary" data-action="write-next" data-testid="writing-next">Continue →</button><button class="text-button" data-home>Save & take a break</button>`, 'YOUR SAVED STORY PLAN');
    } else {
      const story = attempt.inputs.finalStory ?? ''; const savedPlan = WRITING_PROMPTS.some((p) => attempt.inputs[p.key]);
      this.panel.innerHTML = this.card('A little story. All yours.', `<p class="lead">Tell a tiny story where something happens and changes.</p><p>Use our adventure, or imagine your own!</p>${this.hear('Write a story in six to twelve words. Something happens, and something changes. Use our adventure, or imagine your own!')}${this.recap(attempt)}<label for="writing-input">My tiny story</label><textarea id="writing-input" data-testid="writing-input" data-input-key="finalStory" rows="3" autocapitalize="sentences" spellcheck="true" placeholder="What happened in your story?">${esc(story)}</textarea><div class="word-meter"><span><strong data-testid="live-word-count">${countWords(story)}</strong> words</span><span data-word-guidance>${this.wordGuidance(countWords(story))}</span><span class="save-label" role="status">Saved on this iPad</span></div><details class="planning-help" ${savedPlan ? 'open' : ''}><summary>Help me plan my story <span>optional</span></summary><p>Try a few words in any box. Your ideas stay here while you write.</p><div class="planning-grid">${WRITING_PROMPTS.map((p) => `<label>${esc(p.prompt)}<input data-input-key="${p.key}" value="${esc(attempt.inputs[p.key] ?? '')}" aria-label="${esc(p.prompt)}" placeholder="${esc(p.label)}…"/></label>`).join('')}</div><p class="story-frame">Somebody wanted something, but a problem happened, so they acted, and then something changed.</p></details><div class="button-row"><button class="primary" data-action="write-next" data-testid="review-story">Read my story <span>→</span></button><button class="text-button" data-home>Save & take a break</button></div>`, 'YOUR WRITING DESK');
    }
    this.bind('write-next', () => this.controller.advanceWriting());
  }
  private renderReview(attempt: LessonAttempt): void {
    if (!attempt.artifact) return;
    this.panel.innerHTML = this.card('Listen to your little story.', `<blockquote class="story-review" data-testid="review-story-text">${esc(attempt.artifact.storyText)}</blockquote>${this.hear(attempt.artifact.storyText, 'Hear my story')}<p class="gentle-note">${attempt.artifact.wordCount} words, written by you.</p><div class="self-check"><p>Who is it about?</p><p>What happens?</p><p>What changes?</p></div>${attempt.experience ? `<fieldset class="picture-picker"><legend>Choose a picture for your page</legend>${SCENE_IDS.map((id, i) => `<button data-illustration="${id}" data-testid="illustration-${id}" aria-pressed="${attempt.questState.storybook?.illustration === id}"><img src="${this.asset(sceneImage(attempt, id))}" alt=""/><span>${esc(storyScene(i).title)}</span></button>`).join('')}</fieldset>` : ''}<div class="button-row"><button class="secondary" data-action="edit" data-testid="edit-story">Change my words</button><button class="primary" data-action="approve" data-testid="${attempt.experience ? 'celebrate-story' : 'open-copy'}">${attempt.experience ? 'Bring my page to life ✦' : 'Copy into my journal'}</button></div>`, 'READ IT. PICTURE IT. MAKE IT YOURS.');
    this.bind('edit', () => this.controller.editFromReview());
    this.bind('approve', async () => { if (attempt.experience) { await this.controller.celebrateStory(); void this.play('pageRecovered'); } else await this.controller.openCopy(); });
    this.panel.querySelectorAll<HTMLButtonElement>('[data-illustration]').forEach((b) => b.addEventListener('click', () => void this.run(() => this.controller.chooseIllustration(b.dataset.illustration as StorySceneId))));
  }
  private page(attempt: LessonAttempt): string {
    return `<div class="recovered-page">${attempt.experience ? `<img class="page-illustration" src="${this.asset(sceneImage(attempt, attempt.questState.storybook!.illustration))}" alt="${esc(storyScene(SCENE_IDS.indexOf(attempt.questState.storybook!.illustration)).title)}"/>` : ''}<div><span class="page-caption">A TINY TALE BY ${esc(this.controller.getState().save?.profile.studentName ?? '').toUpperCase()}</span><blockquote>${esc(attempt.artifact?.storyText ?? '')}</blockquote></div></div>`;
  }
  private renderCelebration(attempt: LessonAttempt): void {
    this.panel.innerHTML = this.card('You made story magic!', `${this.page(attempt)}<p class="lead">This little page has your imagination inside.</p><p>One last thing: copy your story into your paper journal.</p><button class="primary" data-action="copy" data-testid="open-copy">Get my journal ready <span>→</span></button><button class="text-button" data-home>Save & copy later</button>`, 'LOOK WHAT YOU CREATED');
    this.bind('copy', () => this.controller.openCopy());
  }
  private renderCopy(attempt: LessonAttempt): void {
    this.panel.innerHTML = this.card('Into your adventure journal.', `<p>Copy your story onto paper. Take all the time you need.</p><div class="copy-card" data-testid="copy-text">${esc(attempt.artifact?.storyText ?? '')}</div>${this.hear(attempt.artifact?.storyText ?? '', 'Hear my story')}<p class="step-label">One tiny story · ${attempt.artifact?.wordCount ?? 0} words</p><div class="button-row">${attempt.completedAt ? '<button class="secondary" data-home>Back to the library</button>' : '<button class="secondary" data-action="review" data-testid="copy-return-review">Back to my story</button>'}<button class="primary" data-action="copied" data-testid="complete-copy">I copied this ✓</button></div><button class="text-button" data-home>Save & copy later</button>`, 'PENCIL TIME');
    this.bind('review', () => this.controller.returnToReview());
    this.bind('copied', async () => { await this.controller.completeCopy(); void this.play('pageRecovered'); });
  }
  private renderComplete(attempt: LessonAttempt): void {
    this.panel.innerHTML = this.card('Your first page is home!', `${this.page(attempt)}<p class="lead">You noticed a change. You made a story.</p><p>Keep this one in My Stories. Another trip through the library can spark a different tale!</p><button class="primary" data-action="home" data-testid="complete-return">Back to the library <span>→</span></button>`, 'PAGE ONE · RESTORED');
    this.bind('home', () => this.controller.goToHub());
  }

  private renderStories(state: Readonly<AppState>): void {
    const attempts = Object.values(state.save?.attempts ?? {}).filter((a) => a.artifact).reverse();
    this.panel.innerHTML = this.card('Your shelf of little stories.', `${attempts.length ? attempts.map((a) => `<article class="saved-story"><span class="kicker">STORY ${a.attemptNumber} · ${a.copyStatus.completedAt ? 'COPIED TO YOUR JOURNAL' : 'READY TO COPY'}</span><blockquote>${esc(a.artifact!.storyText)}</blockquote><button class="secondary" data-reopen="${esc(a.attemptId)}">Open journal page</button></article>`).join('') : '<p>Your first story will live here. Let’s go make it!</p>'}<button class="primary" data-action="close-stories">Back to the library</button>`, 'MY STORIES');
    this.bind('close-stories', async () => { this.overlay = null; });
    this.panel.querySelectorAll<HTMLButtonElement>('[data-reopen]').forEach((b) => b.addEventListener('click', () => void this.run(async () => { this.overlay = null; await this.controller.reopenCopy(b.dataset.reopen!); })));
  }

  private renderLegacy(attempt: LessonAttempt): void {
    this.sceneColumn.hidden = true; this.root.dataset.layout = 'desk';
    if (attempt.phase === 'explore') {
      const remaining = attempt.questState.tabletIds.filter((id) => !(id in attempt.questState.classifications));
      this.panel.innerHTML = this.card('Your saved story cards.', `<p>Pick a card to continue where you left off.</p><div class="legacy-cards">${remaining.map((id, i) => `<button class="secondary" data-tablet="${id}">Read card ${i + 1}</button>`).join('')}</div><button class="text-button" data-home>Save & take a break</button>`);
      this.panel.querySelectorAll<HTMLButtonElement>('[data-tablet]').forEach((b) => b.addEventListener('click', () => void this.run(() => this.controller.openTablet(b.dataset.tablet!))));
    } else if (attempt.phase === 'puzzle') {
      const tablet = tabletById(attempt.questState.activeTabletId!); const failures = attempt.questState.unsuccessfulAttempts[tablet?.id ?? ''] ?? 0;
      this.panel.innerHTML = this.card('Is this a story?', `<blockquote class="story-review">${esc(tablet?.text ?? '')}</blockquote>${this.hear(tablet?.text ?? '')}<p>Did something happen and change?</p>${failures >= 2 ? '<p class="hint">Look for an event that makes something different.</p>' : ''}<div class="button-row"><button class="primary" data-action="story" data-testid="classify-story">Story</button><button class="secondary" data-action="not" data-testid="classify-not">Not yet a story</button></div>`);
      for (const [action, answer] of [['story', true], ['not', false]] as const) this.bind(action, async () => { const result = await this.controller.classifyActiveTablet(answer); if (!result.correct) this.toast(result.hint ?? 'Look again. Did something change?'); });
    } else {
      const prompt = REFLECTION_PROMPTS[attempt.questState.reflectionIndex]!;
      const event = [...attempt.adventureEvents].reverse().find((e) => e.resultId === 'correct' && tabletById(e.objectId ?? '')?.isStory);
      const tablet = tabletById(event?.objectId ?? attempt.questState.tabletIds.find((id) => attempt.questState.classifications[id] === true) ?? '');
      this.panel.innerHTML = this.card(prompt.prompt, `${tablet ? `<blockquote class="story-review">${esc(tablet.text)}</blockquote>` : ''}<label for="reflection-input">${esc(prompt.prompt)}</label><textarea id="reflection-input" data-testid="reflection-input" data-input-key="${prompt.key}">${esc(attempt.inputs[prompt.key] ?? '')}</textarea><button class="primary" data-action="reflect" data-testid="reflection-next">Continue →</button>`);
      this.bind('reflect', () => this.controller.advanceReflection());
    }
  }

  private renderParent(state: Readonly<AppState>): void {
    const save = state.save!; const attempts = Object.values(save.attempts);
    this.panel.innerHTML = this.card('A little help behind the scenes.', `<p>Quest 1 practices noticing events and changes, then writing a 6–12-word story. Planning is optional.</p><label for="parent-name">Writer’s name</label><div class="inline-form"><input id="parent-name" data-testid="parent-name" value="${esc(save.profile.studentName)}"/><button class="secondary" data-action="rename" data-testid="save-parent-name">Save name</button></div><fieldset class="settings-fieldset"><legend>Reading and comfort</legend><label class="setting-toggle"><input type="checkbox" data-testid="large-text" ${save.settings.textScale === 'large' ? 'checked' : ''}/> Larger text</label><label class="setting-toggle"><input type="checkbox" data-testid="reduced-motion" ${save.settings.reducedMotion ? 'checked' : ''}/> Less animation</label><p>${this.narration.available() ? 'Tap Hear it to use a local English voice on this device.' : 'No local English voice is available in this browser. Written prompts remain available. Check the iPad’s downloaded English voices.'}</p></fieldset><h2>Saved stories</h2>${attempts.length ? attempts.map((a) => `<div class="attempt-row"><div><strong>Story ${a.attemptNumber}</strong><span>${a.completedAt ? 'Complete' : `Saved · ${a.phase === 'celebration' ? 'ready for handwriting' : a.phase}`}</span>${a.questState.storybook?.assisted.length ? `<small>Pip demonstrated ${a.questState.storybook.assisted.length} learning steps.</small>` : ''}</div>${!a.completedAt ? `<button class="secondary" data-resume="${esc(a.attemptId)}">Continue</button>` : ''}${a.artifact ? `<button class="secondary" data-reopen="${esc(a.attemptId)}" data-testid="reopen-copy">Copy page</button>` : ''}</div>`).join('') : '<p>No stories yet.</p>'}<div class="button-row"><button class="primary" data-action="print" data-testid="open-print-preview" ${attempts.some((a) => a.artifact) ? '' : 'disabled'}>Print a story</button><button class="secondary" data-action="close" data-testid="close-parent">Back to the library</button></div>${state.configNotice ? `<p class="notice">${esc(state.configNotice)}</p>` : ''}<details><summary>Credits and privacy</summary><p>${esc(APP_CONFIG.attribution)}</p><p>Code: MIT. Course content: CC BY-NC-SA 4.0. Original illustrations were generated during development. Story text stays on this device. No accounts or runtime AI.</p></details><details><summary>Reset progress</summary><p>This clears current progress. Original pre-redesign save files remain preserved, but will not be imported again automatically.</p><label for="reset-confirm">Type RESET</label><input id="reset-confirm" data-testid="reset-confirm" autocomplete="off"/><button class="danger" data-action="reset" data-testid="reset-progress">Reset progress</button></details>`, 'GROWN-UPS');
    this.panel.querySelectorAll<HTMLButtonElement>('[data-resume]').forEach((b) => b.addEventListener('click', () => void this.run(() => this.controller.resumeSavedAttempt(b.dataset.resume!))));
    this.bind('rename', () => this.controller.updateStudentName(this.panel.querySelector<HTMLInputElement>('#parent-name')!.value));
    this.bind('close', () => this.controller.closeParent()); this.bind('print', () => this.controller.openPrintPreview());
    this.bind('reset', () => this.controller.resetProgress(this.panel.querySelector<HTMLInputElement>('#reset-confirm')!.value));
    this.panel.querySelector<HTMLInputElement>('[data-testid="large-text"]')?.addEventListener('change', (e) => void this.run(() => this.controller.setTextScale((e.target as HTMLInputElement).checked ? 'large' : 'normal')));
    this.panel.querySelector<HTMLInputElement>('[data-testid="reduced-motion"]')?.addEventListener('change', (e) => void this.run(() => this.controller.setReducedMotion((e.target as HTMLInputElement).checked)));
    this.panel.querySelectorAll<HTMLButtonElement>('[data-reopen]').forEach((b) => b.addEventListener('click', () => void this.run(() => this.controller.reopenCopy(b.dataset.reopen!))));
  }
  private renderPrint(state: Readonly<AppState>): void {
    const attempts = Object.values(state.save!.attempts).filter((a) => a.artifact);
    const selected = attempts.find((a) => a.attemptId === state.save!.progress.selectedAttemptByLesson.L01) ?? attempts[attempts.length - 1];
    this.panel.innerHTML = selected ? `<div class="print-actions"><label>Choose a story<select data-testid="print-story-select">${attempts.map((a) => `<option value="${esc(a.attemptId)}" ${a === selected ? 'selected' : ''}>Story ${a.attemptNumber}</option>`).join('')}</select></label><button class="primary" data-testid="print-now">Print</button><button class="secondary" data-action="back" data-testid="close-print-preview">Back</button></div><div class="print-content">${renderPrintHtml(createQuestOnePrintModel(state.save!, selected))}</div>` : this.card('No stories to print yet.', '<button class="secondary" data-action="back">Back</button>');
    this.bind('back', () => this.controller.closePrintPreview());
    this.panel.querySelector('[data-testid="print-now"]')?.addEventListener('click', () => window.print());
    this.panel.querySelector<HTMLSelectElement>('select')?.addEventListener('change', (e) => { const a = attempts.find((a) => a.attemptId === (e.target as HTMLSelectElement).value); if (a) this.panel.querySelector('.print-content')!.innerHTML = renderPrintHtml(createQuestOnePrintModel(state.save!, a)); });
  }
  private renderStorageError(): void {
    this.panel.innerHTML = this.card('Your saved work needs help.', '<p>Please ask a grown-up. Your saved data has not been discarded.</p><p>Type RESET to preserve the damaged data and start again.</p><label for="storage-reset">Confirmation</label><input id="storage-reset" data-testid="storage-reset-confirm"/><button class="danger" data-action="storage-reset" data-testid="storage-reset">Preserve and reset</button>');
    this.bind('storage-reset', () => this.controller.confirmStorageReset(this.panel.querySelector<HTMLInputElement>('#storage-reset')!.value));
  }

  private bindParentHold(): void {
    const button = this.root.querySelector<HTMLButtonElement>('[data-testid="parent-hold"]')!; let timer: number | undefined;
    const cancel = (): void => { window.clearTimeout(timer); timer = undefined; button.classList.remove('holding'); };
    const start = (): void => { if (timer !== undefined || !this.controller.getState().save) return; button.classList.add('holding'); timer = window.setTimeout(() => { cancel(); void this.run(async () => { this.overlay = null; if (this.controller.getState().phase !== 'hub') await this.controller.goToHub(); await this.controller.openParent(); }); }, APP_CONFIG.parentHoldMs); };
    button.addEventListener('pointerdown', (e) => { e.preventDefault(); start(); });
    ['pointerup', 'pointercancel', 'pointerleave', 'blur'].forEach((event) => button.addEventListener(event, cancel));
    button.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); start(); } }); button.addEventListener('keyup', cancel);
  }
  private bind(action: string, callback: () => Promise<void>): void { this.panel.querySelector(`[data-action="${action}"]`)?.addEventListener('click', () => void this.run(callback)); }
  private bindReadAloud(): void {
    this.panel.querySelectorAll<HTMLButtonElement>('[data-read]').forEach((b) => b.addEventListener('click', () => { const failed = (): void => this.toast('The voice is resting. Try Hear it again, or read the words on screen.'); if (!this.narration.read(b.dataset.read!, failed)) failed(); }));
    this.panel.querySelector('[data-pip]')?.addEventListener('click', () => { const jokes = ['I tried to read a sandwich once. Very short story. Delicious ending.', 'Library rule: no shouting. Sneezing books never listen.', 'My favorite kind of story? Yours. Also stories with biscuits.']; this.toast(jokes[this.pipJoke++ % jokes.length]!); });
  }
  private bindInputs(): void {
    this.panel.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-input-key]').forEach((input) => {
      input.addEventListener('input', () => {
        this.pending.set(input.dataset.inputKey!, input.value); window.clearTimeout(this.autosaveTimer);
        const status = this.panel.querySelector('.save-label'); if (status) status.textContent = 'Saving…';
        if (input.dataset.inputKey === 'finalStory') { const count = countWords(input.value); const meter = this.panel.querySelector('[data-testid="live-word-count"]'); if (meter) meter.textContent = String(count); const guidance = this.panel.querySelector('[data-word-guidance]'); if (guidance) guidance.textContent = this.wordGuidance(count); }
        this.autosaveTimer = window.setTimeout(() => void this.flush().catch((error: unknown) => this.showError(error)), APP_CONFIG.autosaveMs);
      });
      input.addEventListener('blur', () => void this.flush().catch((error: unknown) => this.showError(error)));
      input.addEventListener('focus', () => this.keepInputVisible());
    });
  }
  private async flush(): Promise<void> {
    if (this.flushing) return this.flushing;
    window.clearTimeout(this.autosaveTimer);
    this.flushing = (async () => {
      while (this.pending.size) {
        const [key, value] = this.pending.entries().next().value!;
        await this.controller.saveInput(key, value);
        if (this.pending.get(key) === value) this.pending.delete(key);
      }
      const status = this.panel.querySelector('.save-label'); if (status) status.textContent = 'Saved on this iPad';
    })();
    try { await this.flushing; } finally { this.flushing = undefined; }
  }
  private keepInputVisible(): void {
    const focused = document.activeElement; if (!(focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement)) return;
    const viewport = window.visualViewport; const bottom = viewport ? viewport.height + viewport.offsetTop : window.innerHeight;
    if (focused.getBoundingClientRect().bottom > bottom - 20) focused.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  private setPending(value: boolean): void {
    this.panel.setAttribute('aria-busy', String(value));
    this.root.querySelectorAll<HTMLButtonElement>('.story-panel button, .hotspot-layer button').forEach((button) => {
      if (value && button.dataset.pending !== 'true') { button.dataset.disabledBefore = String(button.disabled); button.dataset.pending = 'true'; button.disabled = true; }
      else if (!value && button.dataset.pending === 'true') { button.disabled = button.dataset.disabledBefore === 'true'; delete button.dataset.disabledBefore; delete button.dataset.pending; }
    });
  }
  private async run(callback: () => Promise<void>): Promise<void> {
    if (this.busy) return; this.busy = true; this.setPending(true); this.narration.stop();
    const location = (): string => {
      const progress = this.controller.getActiveAttempt()?.questState.storybook;
      return [this.controller.getState().phase, this.overlay, progress?.sceneIndex, progress?.activity].join(':');
    };
    const before = location();
    try {
      await this.flush(); await callback(); this.render(this.controller.getState());
      if (location() !== before) {
        window.scrollTo({ top: 0, behavior: 'instant' });
        this.panel.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
      }
    } catch (error) { this.showError(error); }
    finally { this.busy = false; this.setPending(false); }
  }
  private showError(error: unknown): void { const message = error instanceof Error ? error.message : 'That did not save. Please try again.'; const box = this.panel.querySelector('.inline-error'); if (box) box.textContent = message; else this.toast(message); }
  private toast(message: string): void { this.root.querySelector('.toast')!.textContent = message; }
  private async play(cue: Parameters<AudioService['play']>[0]): Promise<void> { try { await this.audio.play(cue); } catch { /* Optional sound never blocks progress. */ } }
}
