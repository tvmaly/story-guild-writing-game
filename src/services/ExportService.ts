import { APP_CONFIG } from '../config';
import { COURSE_SUMMARIES } from '../domain/courseCatalog';
import type { LessonAttempt, StoredSave } from '../domain/models';
import { SCENE_IDS, storyScene } from '../domain/storybook';

export interface QuestOnePrintModel {
  studentName: string;
  lessonTitle: string;
  studentGoal: string;
  seedSummary: string;
  storyText: string;
  wordCount: number;
  copyDate: string;
  attribution: string;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/gu, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character] as string);
}

export function createQuestOnePrintModel(save: StoredSave, attempt: LessonAttempt): QuestOnePrintModel {
  const lesson = COURSE_SUMMARIES[0];
  if (!lesson || !attempt.artifact) throw new Error('Quest 1 must have an artifact before printing.');
  return {
    studentName: save.profile.studentName,
    lessonTitle: attempt.experience ? 'Pip and the Runaway Page' : lesson.title,
    studentGoal: lesson.studentGoal,
    seedSummary: attempt.experience ? SCENE_IDS.map((_, index) => storyScene(index, attempt.questState.storybook?.shelfChoice).memory).join('; ') : `${attempt.seed.character}; ${attempt.seed.goal}; ${attempt.seed.trouble}`,
    storyText: attempt.artifact.storyText,
    wordCount: attempt.artifact.wordCount,
    copyDate: attempt.copyStatus.completedAt ?? 'Not copied yet',
    attribution: APP_CONFIG.attribution,
  };
}

export function renderPrintHtml(model: QuestOnePrintModel): string {
  return `
    <article class="print-document">
      <section class="print-cover"><h1>The Story Guild</h1><p>${escapeHtml(model.studentName)}'s Adventure Portfolio</p></section>
      <section class="print-lesson">
        <h2>${escapeHtml(model.lessonTitle)}</h2>
        <p><strong>Goal:</strong> ${escapeHtml(model.studentGoal)}</p>
        <p><strong>Adventure seed:</strong> ${escapeHtml(model.seedSummary)}</p>
        <blockquote>${escapeHtml(model.storyText)}</blockquote>
        <p>${model.wordCount} story words · Copy completed: ${escapeHtml(model.copyDate)}</p>
        <div class="handwriting-lines" aria-label="Handwriting practice lines">${'<span aria-hidden="true"></span>'.repeat(5)}</div>
      </section>
      <footer>${escapeHtml(model.attribution)}</footer>
    </article>`;
}
