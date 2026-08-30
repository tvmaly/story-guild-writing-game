import Phaser from 'phaser';
import { APP_CONFIG } from '../config';
import type { AppController } from '../app/AppController';
import type { EventBus } from '../core/EventBus';
import type { AppState, CharacterId, Direction, GameManifestV1 } from '../domain/models';

export type InteractionTarget =
  | { kind: 'questBoard' }
  | { kind: 'parentAlcove' }
  | { kind: 'npc'; characterId: CharacterId }
  | { kind: 'tablet'; tabletId: string }
  | { kind: 'hall' };

export interface GameCallbacks {
  onInteract(target: InteractionTarget): void;
}

const questTabletPositions = [
  { x: 4, y: 3 }, { x: 10, y: 3 }, { x: 16, y: 3 },
  { x: 4, y: 10 }, { x: 10, y: 10 }, { x: 16, y: 10 },
] as const;

class GuildScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Sprite | undefined;
  private worldObjects: Phaser.GameObjects.GameObject[] = [];
  private currentState!: Readonly<AppState>;
  private hubPosition = { x: 10, y: 11 };
  private moving = false;

  constructor(
    private readonly controller: AppController,
    private readonly bus: EventBus,
    private readonly manifest: Readonly<GameManifestV1>,
    private readonly resolveAsset: (path: string) => string,
    private readonly callbacks: GameCallbacks,
  ) {
    super({ key: 'GuildScene' });
    this.currentState = controller.getState();
  }

  preload(): void {
    (Object.keys(this.manifest.characters) as CharacterId[]).forEach((id) => {
      const character = this.manifest.characters[id];
      this.load.spritesheet(`character-${id}`, this.resolveAsset(character.spriteUrl), {
        frameWidth: character.frameWidth,
        frameHeight: character.frameHeight,
      });
    });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#18243c');
    this.input.keyboard?.on('keydown-UP', () => void this.move('up'));
    this.input.keyboard?.on('keydown-W', () => void this.move('up'));
    this.input.keyboard?.on('keydown-DOWN', () => void this.move('down'));
    this.input.keyboard?.on('keydown-S', () => void this.move('down'));
    this.input.keyboard?.on('keydown-LEFT', () => void this.move('left'));
    this.input.keyboard?.on('keydown-A', () => void this.move('left'));
    this.input.keyboard?.on('keydown-RIGHT', () => void this.move('right'));
    this.input.keyboard?.on('keydown-D', () => void this.move('right'));
    this.input.keyboard?.on('keydown-SPACE', () => this.interact());
    this.input.keyboard?.on('keydown-ENTER', () => this.interact());
    this.bus.on('REQUEST_MOVE', (direction) => void this.move(direction));
    this.bus.on('REQUEST_INTERACTION', () => this.interact());
    this.bus.on('STATE_COMMITTED', (state) => {
      this.currentState = state;
      this.renderWorld();
    });
    this.renderWorld();
  }

  private clearWorld(): void {
    this.worldObjects.forEach((object) => object.destroy());
    this.worldObjects = [];
    this.player?.destroy();
    this.player = undefined;
  }

  private keep<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.worldObjects.push(object);
    return object;
  }

  private renderWorld(): void {
    if (!this.add) return;
    this.clearWorld();
    const attempt = this.controller.getActiveAttempt();
    const questVisible = attempt && ['questBriefing', 'explore', 'puzzle', 'reflection', 'writing', 'review', 'copy', 'complete'].includes(this.currentState.phase);
    if (questVisible) this.renderQuest();
    else this.renderHub();
  }

  private drawRoom(floorColor: number, wallColor: number): void {
    const graphics = this.keep(this.add.graphics());
    graphics.fillStyle(floorColor).fillRect(16, 16, 288, 208);
    graphics.fillStyle(wallColor)
      .fillRect(16, 16, 288, 16)
      .fillRect(16, 208, 288, 16)
      .fillRect(16, 16, 16, 208)
      .fillRect(288, 16, 16, 208);
    for (let x = 32; x < 288; x += 32) graphics.fillRect(x, 18, 16, 4);
  }

  private renderHub(): void {
    this.drawRoom(0x314f4f, 0x9a6b45);
    this.keep(this.add.text(160, 24, 'THE STORY GUILD', { fontFamily: 'monospace', fontSize: '12px', color: '#fff3c4' }).setOrigin(0.5));
    this.drawObject(5, 4, 0xe9c46a, 'QUEST\nBOARD');
    this.drawObject(15, 11, 0x8ecae6, 'PARENT');
    this.drawObject(4, 11, 0xf4a261, 'HALL OF\nPAGES');
    this.addCharacter('rowan', 10, 7);
    const recovered = this.currentState.save?.progress.recoveredPages.length ?? 0;
    this.keep(this.add.text(160, 198, `Recovered pages: ${recovered}/12`, { fontFamily: 'monospace', fontSize: '9px', color: '#ffffff' }).setOrigin(0.5));
    this.addPlayer(this.hubPosition.x, this.hubPosition.y);
    this.renderInteractionMarker();
  }

  private renderQuest(): void {
    this.drawRoom(0x3d405b, 0x6d597a);
    this.keep(this.add.text(160, 24, 'ARCHIVE GATE', { fontFamily: 'monospace', fontSize: '12px', color: '#f6e8c8' }).setOrigin(0.5));
    const attempt = this.controller.getActiveAttempt();
    if (!attempt) return;
    attempt.questState.tabletIds.forEach((id, index) => {
      const position = questTabletPositions[index];
      if (!position) return;
      const solved = id in attempt.questState.classifications;
      this.drawObject(position.x, position.y, solved ? 0x84a98c : 0xe0b1cb, solved ? '✓' : '?');
    });
    this.addCharacter('pip', 10, 7);
    this.keep(this.add.text(160, 198, `${Object.keys(attempt.questState.classifications).length}/6 tablets sorted`, { fontFamily: 'monospace', fontSize: '9px', color: '#ffffff' }).setOrigin(0.5));
    this.addPlayer(attempt.questState.playerX, attempt.questState.playerY);
    this.renderInteractionMarker();
  }

  private drawObject(tileX: number, tileY: number, color: number, label: string): void {
    const graphics = this.keep(this.add.graphics());
    graphics.fillStyle(0x111827, 0.35).fillRect(tileX * 16 - 1, tileY * 16 + 2, 18, 16);
    graphics.fillStyle(color).fillRect(tileX * 16 + 2, tileY * 16, 12, 14);
    this.keep(this.add.text(tileX * 16 + 8, tileY * 16 + 7, label, {
      align: 'center', fontFamily: 'monospace', fontSize: label.length > 2 ? '5px' : '10px', color: '#17202a',
    }).setOrigin(0.5));
  }

  private addCharacter(id: CharacterId, tileX: number, tileY: number): void {
    const visual = this.manifest.characters[id];
    const sprite = this.keep(this.add.sprite(tileX * 16 + 8, tileY * 16 + 8, `character-${id}`, visual.animations.idleDown[0] ?? 0));
    if (visual.tint) sprite.setTint(Number.parseInt(visual.tint.slice(1), 16));
    sprite.setScale(visual.scale);
    this.keep(this.add.text(tileX * 16 + 8, tileY * 16 - 4, visual.displayName, { fontFamily: 'monospace', fontSize: '6px', color: '#ffffff' }).setOrigin(0.5));
  }

  private addPlayer(tileX: number, tileY: number): void {
    const visual = this.manifest.characters.player;
    const direction = (this.controller.getActiveAttempt()?.inputs.lastDirection ?? 'down') as Direction;
    const animationKey = `idle${direction[0]?.toUpperCase()}${direction.slice(1)}` as keyof typeof visual.animations;
    this.player = this.add.sprite(tileX * 16 + 8, tileY * 16 + 8, 'character-player', visual.animations[animationKey][0] ?? 0);
    if (visual.tint) this.player.setTint(Number.parseInt(visual.tint.slice(1), 16));
    this.player.setScale(visual.scale);
  }

  private position(): { x: number; y: number } {
    const attempt = this.controller.getActiveAttempt();
    const questVisible = attempt && this.currentState.phase !== 'hub' && this.currentState.phase !== 'parent' && this.currentState.phase !== 'printPreview';
    return questVisible ? { x: attempt.questState.playerX, y: attempt.questState.playerY } : this.hubPosition;
  }

  private canMove(): boolean {
    return this.currentState.phase === 'hub' || this.currentState.phase === 'explore';
  }

  private async move(direction: Direction): Promise<void> {
    if (!this.canMove() || this.moving) return;
    const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction] as [number, number];
    const current = this.position();
    const next = { x: Math.max(2, Math.min(17, current.x + delta[0])), y: Math.max(2, Math.min(12, current.y + delta[1])) };
    this.moving = true;
    try {
      if (this.currentState.phase === 'explore') await this.controller.updatePlayerPosition(next.x, next.y, direction);
      else {
        this.hubPosition = next;
        this.renderWorld();
      }
    } finally {
      this.moving = false;
    }
  }

  private nearbyTarget(): InteractionTarget | null {
    const position = this.position();
    const near = (x: number, y: number): boolean => Math.abs(position.x - x) + Math.abs(position.y - y) <= 1;
    if (this.currentState.phase === 'hub') {
      if (near(5, 4)) return { kind: 'questBoard' };
      if (near(15, 11)) return { kind: 'parentAlcove' };
      if (near(4, 11)) return { kind: 'hall' };
      if (near(10, 7)) return { kind: 'npc', characterId: 'rowan' };
      return null;
    }
    if (this.currentState.phase === 'explore') {
      const attempt = this.controller.getActiveAttempt();
      if (!attempt) return null;
      for (let index = 0; index < attempt.questState.tabletIds.length; index += 1) {
        const tabletId = attempt.questState.tabletIds[index];
        const tabletPosition = questTabletPositions[index];
        if (tabletId && tabletPosition && near(tabletPosition.x, tabletPosition.y) && !(tabletId in attempt.questState.classifications)) {
          return { kind: 'tablet', tabletId };
        }
      }
      if (near(10, 7)) return { kind: 'npc', characterId: 'pip' };
    }
    return null;
  }

  private renderInteractionMarker(): void {
    if (!this.nearbyTarget()) return;
    const position = this.position();
    this.keep(this.add.text(position.x * 16 + 8, position.y * 16 - 7, '!', { fontFamily: 'monospace', fontSize: '11px', color: '#ffe66d' }).setOrigin(0.5));
  }

  private interact(): void {
    if (!this.canMove()) return;
    const target = this.nearbyTarget();
    if (target) this.callbacks.onInteract(target);
  }
}

export function createGame(
  parent: HTMLElement,
  controller: AppController,
  bus: EventBus,
  manifest: Readonly<GameManifestV1>,
  resolveAsset: (path: string) => string,
  callbacks: GameCallbacks,
): Phaser.Game {
  const scene = new GuildScene(controller, bus, manifest, resolveAsset, callbacks);
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: APP_CONFIG.internalWidth,
    height: APP_CONFIG.internalHeight,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    backgroundColor: '#18243c',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene,
    input: { activePointers: 3 },
    render: { pixelArt: true, antialias: false, roundPixels: true },
  });
}
