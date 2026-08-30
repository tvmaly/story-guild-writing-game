import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '../src/app/AppController';
import type { EventBus } from '../src/core/EventBus';
import { MemoryStorageAdapter, SaveRepository } from '../src/services/SaveRepository';

describe('persisted accessibility settings', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('saves larger text and reduced motion through controller mutations', async () => {
    vi.stubGlobal('document', { body: { dataset: {} } });
    const repository = new SaveRepository(new MemoryStorageAdapter(), { primary: 'primary', backup: 'backup' });
    const bus = { emit: vi.fn() } as unknown as EventBus;
    const controller = new AppController({ repository, bus, clock: { now: () => new Date('2026-08-29T12:00:00.000Z') } });

    controller.boot();
    await controller.createProfile('Reader');
    await controller.setTextScale('large');
    await controller.setReducedMotion(true);

    expect(controller.getState().save?.settings).toMatchObject({ textScale: 'large', reducedMotion: true });
    expect(repository.load()).toMatchObject({
      status: 'loaded',
      save: { settings: { textScale: 'large', reducedMotion: true } },
    });
  });
});
