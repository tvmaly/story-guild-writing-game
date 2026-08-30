import type { AppPhase } from '../domain/models';

const legal: Readonly<Record<AppPhase, readonly AppPhase[]>> = {
  boot: ['onboarding', 'hub', 'resumePrompt', 'storageError'],
  onboarding: ['hub'],
  resumePrompt: ['hub', 'questBriefing', 'explore', 'puzzle', 'reflection', 'writing', 'review', 'copy', 'complete'],
  hub: ['questBriefing', 'explore', 'puzzle', 'reflection', 'writing', 'review', 'copy', 'complete', 'parent'],
  questBriefing: ['explore', 'hub'],
  explore: ['puzzle', 'reflection', 'hub'],
  puzzle: ['explore', 'reflection'],
  reflection: ['writing', 'hub'],
  writing: ['review', 'hub'],
  review: ['writing', 'copy', 'hub'],
  copy: ['review', 'complete', 'hub'],
  complete: ['hub', 'parent'],
  parent: ['hub', 'printPreview', 'copy'],
  printPreview: ['parent'],
  storageError: ['onboarding'],
};

export class AppStateMachine {
  canTransition(from: AppPhase, to: AppPhase): boolean {
    return legal[from].includes(to);
  }

  transition(from: AppPhase, to: AppPhase): AppPhase {
    if (!this.canTransition(from, to)) {
      throw new Error(`Illegal application transition: ${from} -> ${to}`);
    }
    return to;
  }
}
