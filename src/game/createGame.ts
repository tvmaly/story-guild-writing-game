import Phaser from 'phaser';
import { APP_CONFIG } from '../config';
import type { AppController } from '../app/AppController';
import type { EventBus } from '../core/EventBus';
import type { AppState, GameManifestV1 } from '../domain/models';
import { sceneImage } from '../domain/storybook';

export interface GameCallbacks { onAssetLoadError?(url: string): void }

class StorybookScene extends Phaser.Scene {
  private backdrop?: Phaser.GameObjects.Image;
  private previous?: Phaser.GameObjects.Image;
  private page?: Phaser.GameObjects.Image;
  private magic?: Phaser.GameObjects.Graphics;
  private picture = '';
  private revision = '';
  private unsubscribe?: () => void;
  private motionQuery?: MediaQueryList;
  private readonly motionChanged = (): void => this.renderState(this.controller.getState());

  constructor(private readonly controller: AppController, private readonly bus: EventBus,
    private readonly manifest: Readonly<GameManifestV1>, private readonly resolveAsset: (path: string) => string,
    private readonly callbacks: GameCallbacks) { super('StorybookScene'); }

  preload(): void {
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      this.callbacks.onAssetLoadError?.(typeof file.src === 'string' ? file.src : String(file.url));
    });
    for (const [key, path] of Object.entries(this.manifest.storybook?.images ?? {})) this.load.image(key, this.resolveAsset(path));
  }

  create(): void {
    document.body.dataset.artReady = String(Object.keys(this.manifest.storybook?.images ?? {}).every((key) => this.textures.exists(key)));
    this.cameras.main.setBackgroundColor('#e9d3a3');
    this.unsubscribe = this.bus.on('STATE_COMMITTED', (state) => this.renderState(state));
    this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.motionQuery.addEventListener('change', this.motionChanged);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.unsubscribe?.(); this.motionQuery?.removeEventListener('change', this.motionChanged); });
    this.renderState(this.controller.getState());
  }

  private renderState(state: Readonly<AppState>): void {
    const attempt = this.controller.getActiveAttempt();
    const inAdventure = attempt?.experience && ['questBriefing', 'explore', 'puzzle'].includes(state.phase);
    const key = inAdventure ? sceneImage(attempt) : 'library';
    const reduced = state.save?.settings.reducedMotion === true || this.motionQuery?.matches === true;
    const oldPicture = this.picture;
    const progress = attempt?.questState.storybook;
    const revision = `${attempt?.attemptId ?? ''}:${progress?.sceneIndex}:${progress?.activity}`;
    if (reduced || !inAdventure || revision !== this.revision) this.finishReaction();
    if (key !== this.picture && this.textures.exists(key)) {
      this.picture = key;
      if (!this.backdrop) this.backdrop = this.add.image(512, 384, key);
      else this.backdrop.setTexture(key);
      this.backdrop.setDisplaySize(1024, 768);
    }
    if (revision === this.revision) return;
    this.revision = revision;
    // Play only a freshly tapped action, never a resumed save or a hint/answer.
    if (!reduced && inAdventure && progress?.activity === 'compare' && oldPicture.endsWith('-before') && oldPicture !== key) {
      this.playReaction(oldPicture, progress.sceneIndex, progress.shelfChoice === 'handle');
    }
  }

  private finishReaction(): void {
    this.tweens.killAll();
    this.previous?.setVisible(false);
    this.page?.setVisible(false);
    this.magic?.clear();
    document.body.dataset.sceneAnimation = 'idle';
  }

  private playReaction(before: string, index: number, handle: boolean): void {
    if (!this.previous) this.previous = this.add.image(512, 384, before).setDepth(1);
    this.previous.setTexture(before).setDisplaySize(1024, 768).setAlpha(1).setVisible(true);
    if (!this.magic) this.magic = this.add.graphics().setDepth(3);
    const animation = index === 0 ? 'sleepy-sneeze' : index === 1 ? (handle ? 'rising-cart' : 'book-stairs') : 'sailing-page';
    document.body.dataset.sceneAnimation = animation;
    const motion = { value: 0 };
    const duration = index === 0 ? 1000 : 1250;
    // A short illustrated before/after dissolve leaves the settled picture still
    // for reading. Prop-specific trails make the direction of change visible.
    this.tweens.add({ targets: this.previous, alpha: 0, delay: 220, duration: duration - 220, ease: 'Sine.easeInOut' });
    if (index !== 1 && this.textures.exists('page')) {
      if (!this.page) this.page = this.add.image(512, 550, 'page').setDepth(2);
      this.page.setDisplaySize(index === 0 ? 130 : 100, index === 0 ? 130 : 70)
        .setPosition(index === 0 ? 430 : 545, index === 0 ? 610 : 530).setAngle(-15).setAlpha(0).setVisible(true);
      this.tweens.add({ targets: this.page, x: index === 0 ? 820 : 830, y: index === 0 ? 138 : 630,
        angle: index === 0 ? 20 : -4, duration, ease: 'Sine.easeInOut' });
    }
    this.tweens.add({ targets: motion, value: 1, duration, ease: 'Sine.easeInOut',
      onUpdate: () => {
        const t = motion.value;
        const glow = Math.sin(t * Math.PI);
        this.page?.setAlpha(index === 1 ? 0 : glow * .9);
        const graphics = this.magic!;
        graphics.clear().lineStyle(3, 0xffeab2, glow * .75);
        if (index === 0 || index === 2) {
          // Sneeze curls upward; the fan's three breezes sweep across the desk.
          for (let i = 0; i < 3; i++) {
            const x = (index === 0 ? 390 : 300) + t * 370;
            const y = (index === 0 ? 440 - t * 220 : 435 + t * 80) + i * 22;
            graphics.beginPath().moveTo(x - 90, y + 14).lineTo(x - 40, y).lineTo(x, y + 7).strokePath();
          }
        } else {
          // A bell pulse and ascending stair sparkles differ from the cart's
          // vertical lift, reinforcing the branch the child actually chose.
          if (!handle) graphics.strokeCircle(155, 490, 15 + t * 70);
          for (let i = 0; i < 7; i++) {
            const step = Math.max(0, Math.min(1, t - i * .06));
            const x = handle ? 658 + (i % 2 ? 112 : -112) : 340 + step * 400;
            const y = 700 - step * 430;
            graphics.lineStyle(3, 0xffdf83, glow * (1 - i / 9));
            graphics.lineBetween(x - 6, y, x + 6, y).lineBetween(x, y - 6, x, y + 6);
          }
        }
      }, onComplete: () => this.finishReaction(),
    });
  }
}

export function createGame(parent: HTMLElement, controller: AppController, bus: EventBus,
  manifest: Readonly<GameManifestV1>, resolveAsset: (path: string) => string, callbacks: GameCallbacks): Phaser.Game {
  return new Phaser.Game({ type: Phaser.AUTO, parent, width: APP_CONFIG.internalWidth, height: APP_CONFIG.internalHeight,
    pixelArt: false, antialias: true, backgroundColor: '#e9d3a3',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: new StorybookScene(controller, bus, manifest, resolveAsset, callbacks),
    input: { activePointers: 3 }, render: { antialias: true }, });
}
