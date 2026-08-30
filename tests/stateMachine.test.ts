import { describe, expect, it } from 'vitest';
import { AppStateMachine } from '../src/app/AppStateMachine';

describe('AppStateMachine', () => {
  const machine = new AppStateMachine();

  it('accepts the complete Quest 1 path', () => {
    const path = ['boot', 'onboarding', 'hub', 'questBriefing', 'explore', 'puzzle', 'reflection', 'writing', 'review', 'copy', 'complete', 'hub'] as const;
    for (let index = 0; index < path.length - 1; index += 1) {
      expect(machine.transition(path[index]!, path[index + 1]!)).toBe(path[index + 1]);
    }
  });

  it('rejects illegal phase jumps', () => {
    expect(() => machine.transition('hub', 'printPreview')).toThrow(/illegal/i);
  });

  it('resumes a paused writing phase from the hub', () => {
    expect(machine.transition('hub', 'writing')).toBe('writing');
  });
});
