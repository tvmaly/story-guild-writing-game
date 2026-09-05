import type { LessonAttempt, ShelfChoice, StorySceneId } from './models';
import { SeededRng } from '../core/SeededRng';

export interface SceneOption { id: string; label: string; x: number; y: number }
export interface StoryScene {
  id: StorySceneId;
  title: string;
  instruction: string;
  before: string;
  after: string;
  memory: string;
  outcome: string;
  hint: string;
  imageBefore: string;
  imageAfter: string;
  actions: SceneOption[];
  changes: SceneOption[];
  changedId: string;
}

export const SCENE_IDS: StorySceneId[] = ['sleepy-book', 'bookshelf', 'paper-boat'];

export function storyScene(index: number, choice?: ShelfChoice): StoryScene {
  if (index === 0) return {
    id: 'sleepy-book', title: 'The sleepy book',
    instruction: 'Our page is stuck! Try tickling that feather bookmark.',
    before: 'A sleepy book lay on a page.',
    after: 'Pip tickled the book. Its sneeze blew the page onto a shelf.',
    memory: 'Feather → sneeze → flying page',
    outcome: 'ACHOO! The page is free… and flying up to the shelf!',
    hint: 'The book was resting. Then a sneeze moved the page!',
    imageBefore: 'sleepy-book-before', imageAfter: 'sleepy-book-after',
    actions: [{ id: 'feather', label: 'Tickle the feather', x: 50, y: 72 }],
    changes: [{ id: 'page', label: 'The page flew up', x: 80, y: 18 }, { id: 'window', label: 'The window stayed put', x: 16, y: 22 }],
    changedId: 'page',
  };
  if (index === 1) return {
    id: 'bookshelf', title: 'The tall bookshelf',
    instruction: 'The page is too high! Try the bell or the winding handle.',
    before: 'The page rested on a tall shelf.',
    after: choice === 'handle' ? 'Pip turned the handle. A book cart lifted him to the page.' : 'Pip rang the bell. Books unfolded into stairs to the page.',
    memory: choice === 'handle' ? 'Handle → rising book cart' : 'Bell → magical book stairs',
    outcome: 'We reached it! Whoosh… now the page is floating into the ink puddle.',
    hint: choice === 'handle' ? 'The cart was low. Turning the handle lifted it up.' : 'The books were on shelves. Ringing the bell made stairs!',
    imageBefore: 'bookshelf-before', imageAfter: choice === 'handle' ? 'bookshelf-handle' : 'bookshelf-bell',
    actions: [{ id: 'bell', label: 'Ring the bell', x: 15, y: 64 }, { id: 'handle', label: 'Turn the handle', x: 88, y: 76 }],
    changes: [{ id: 'path', label: choice === 'handle' ? 'The cart lifted Pip' : 'The books made stairs', x: 63, y: 50 }, { id: 'shelf', label: 'The shelf stayed tall', x: 90, y: 31 }],
    changedId: 'path',
  };
  return {
    id: 'paper-boat', title: 'The paper boat',
    instruction: 'The page folded into a boat! Use the fan to bring it home.',
    before: 'A paper boat floated in an ink puddle.',
    after: 'Pip waved a fan. The paper boat sailed to the dry desk.',
    memory: 'Fan → sailing boat → dry page',
    outcome: 'Safe and dry! Now this page needs a tiny story. Your story.',
    hint: 'The boat was in the puddle. The fan helped it reach the dry desk.',
    imageBefore: 'paper-boat-before', imageAfter: 'paper-boat-after',
    actions: [{ id: 'fan', label: 'Wave the fan', x: 24, y: 76 }],
    changes: [{ id: 'boat', label: 'The boat reached the desk', x: 81, y: 82 }, { id: 'bottle', label: 'The ink bottle stayed still', x: 85, y: 47 }],
    changedId: 'boat',
  };
}

export function currentScene(attempt: LessonAttempt): StoryScene {
  return storyScene(attempt.questState.storybook?.sceneIndex ?? 0, attempt.questState.storybook?.shelfChoice);
}

export function comparisonChoices(attempt: LessonAttempt): Array<{ id: 'before' | 'after'; text: string }> {
  const scene = currentScene(attempt);
  return new SeededRng(attempt.seed.numericSeed + (attempt.questState.storybook?.sceneIndex ?? 0)).shuffle([
    { id: 'before' as const, text: scene.before }, { id: 'after' as const, text: scene.after },
  ]);
}

export function sceneImage(attempt: LessonAttempt, id?: StorySceneId): string {
  const progress = attempt.questState.storybook;
  const scene = id ? storyScene(SCENE_IDS.indexOf(id), progress?.shelfChoice) : currentScene(attempt);
  return id || progress?.activity !== 'interact' ? scene.imageAfter : scene.imageBefore;
}

export const STORYBOOK_IMAGES = {
  library: 'assets/storybook/library.png',
  'sleepy-book-before': 'assets/storybook/sleepy-book-before.png',
  'sleepy-book-after': 'assets/storybook/sleepy-book-after.png',
  'bookshelf-before': 'assets/storybook/bookshelf-before.png',
  'bookshelf-bell': 'assets/storybook/bookshelf-bell.png',
  'bookshelf-handle': 'assets/storybook/bookshelf-handle.png',
  'paper-boat-before': 'assets/storybook/paper-boat-before.png',
  'paper-boat-after': 'assets/storybook/paper-boat-after.png',
  pip: 'assets/storybook/pip.png',
  page: 'assets/storybook/page.png',
};
