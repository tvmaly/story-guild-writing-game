import { APP_CONFIG } from '../config';
import { COURSE_SUMMARIES } from '../domain/courseCatalog';
import type { LessonAttempt, SaveDataV1 } from '../domain/models';

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

export function createQuestOnePrintModel(save: SaveDataV1, attempt: LessonAttempt): QuestOnePrintModel {
  const lesson = COURSE_SUMMARIES[0];
  if (!lesson || !attempt.artifact) throw new Error('Quest 1 must have an artifact before printing.');
  return {
    studentName: save.profile.studentName,
    lessonTitle: lesson.title,
    studentGoal: lesson.studentGoal,
    seedSummary: `${attempt.seed.character}; ${attempt.seed.goal}; ${attempt.seed.trouble}`,
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
        <div class="handwriting-lines" aria-label="Handwriting practice lines"></div>
      </section>
      <footer>${escapeHtml(model.attribution)}</footer>
    </article>`;
}
