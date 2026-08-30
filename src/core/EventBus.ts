import type { AppState } from '../domain/models';

export interface StoryGuildEvents {
  STATE_COMMITTED: Readonly<AppState>;
  SAVE_COMMITTED: Readonly<AppState>;
  REQUEST_INTERACTION: undefined;
  REQUEST_MOVE: 'up' | 'down' | 'left' | 'right';
}

export class EventBus {
  private readonly target = new EventTarget();

  on<K extends keyof StoryGuildEvents>(type: K, listener: (detail: StoryGuildEvents[K]) => void): () => void {
    const wrapped = (event: Event): void => listener((event as CustomEvent<StoryGuildEvents[K]>).detail);
    this.target.addEventListener(type, wrapped);
    return () => this.target.removeEventListener(type, wrapped);
  }

  emit<K extends keyof StoryGuildEvents>(type: K, detail: StoryGuildEvents[K]): void {
    this.target.dispatchEvent(new CustomEvent(type, { detail }));
  }
}
