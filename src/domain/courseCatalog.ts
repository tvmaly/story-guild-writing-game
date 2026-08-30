import type { CourseLessonSummary, StorySeed, TabletDefinition } from './models';
import { SeededRng } from '../core/SeededRng';

export const COURSE_SUMMARIES: CourseLessonSummary[] = [
  ['L01', 'The Gate of Change', 'I can tell whether a group of words is a story.'],
  ['L02', 'The Four Rune Trail', 'I can make a story idea from a character, place, goal, and problem.'],
  ['L03', 'The Bridge of Wants', 'I can create a character who wants something and must solve a problem.'],
  ['L04', 'The Three Doors of Time', 'I can place story events in a clear order.'],
  ['L05', 'The Sensory Caverns', 'I can choose strong verbs and a few useful sensory details.'],
  ['L06', 'The Echo Bridge', 'I can use a short line of dialogue that changes the story.'],
  ['L07', 'The Remix Ruins', 'I can take a known story and change it in a new way.'],
  ['L08', 'The Shrinking Tower', 'I can keep the heart of a story while making it shorter.'],
  ['L09', 'The Drafting Plains', 'I can tell the full story first and worry about 100 words later.'],
  ['L10', 'The Word-Weed Maze', 'I can remove or replace words without hurting the story.'],
  ['L11', "The Editor's Forge", 'I can improve clarity, sound, spelling, and punctuation.'],
  ['L12', 'The Hall of Tales', 'I can present my story so another person can enjoy it.'],
].map(([id, title, studentGoal], index) => ({
  id: id as CourseLessonSummary['id'],
  order: index + 1,
  title: title as string,
  studentGoal: studentGoal as string,
}));

export const CANONICAL_TABLETS: TabletDefinition[] = [
  { id: 'robot-tree-description', text: 'A silver robot stood beside a tree.', isStory: false, canonical: true },
  { id: 'robot-tree-story', text: 'A silver robot lost its key, searched the tree, and woke a sleeping owl.', isStory: true, canonical: true, change: 'The robot woke an owl.' },
  { id: 'dragon-map-description', text: 'A green dragon slept under a bridge.', isStory: false, canonical: true },
  { id: 'dragon-map-story', text: 'A green dragon sneezed fire and burned his own map.', isStory: true, canonical: true, change: 'The map burned.' },
  { id: 'goalie-duck-description', text: 'The goalie wore red shoes and blue gloves.', isStory: false, canonical: true },
  { id: 'goalie-duck-story', text: 'The goalie missed the ball, chased it downhill, and saved a duck.', isStory: true, canonical: true, change: 'The goalie saved a duck.' },
  { id: 'drum-door-description', text: 'A drum sat in the attic.', isStory: false, canonical: true },
  { id: 'drum-door-story', text: 'Mia tapped the old drum, and a hidden door opened.', isStory: true, canonical: true, change: 'A hidden door opened.' },
];

export const EQUIVALENT_TABLETS: TabletDefinition[] = [
  { id: 'dog-stadium-description', text: 'A spotted dog waited in an empty stadium.', isStory: false, canonical: false },
  { id: 'dog-stadium-story', text: 'A spotted dog followed wet footprints and found the missing whistle.', isStory: true, canonical: false, change: 'The dog found the whistle.' },
  { id: 'knight-board-description', text: 'A wooden knight rested on a chessboard.', isStory: false, canonical: false },
  { id: 'knight-board-story', text: 'The wooden knight leaped off the board and unlocked a tiny gate.', isStory: true, canonical: false, change: 'The knight unlocked a gate.' },
  { id: 'inventor-workshop-description', text: 'An inventor worked beside a blinking machine.', isStory: false, canonical: false },
  { id: 'inventor-workshop-story', text: 'The inventor pressed the wrong button, and the machine fixed the lights.', isStory: true, canonical: false, change: 'The lights were fixed.' },
];

export const ALL_TABLETS = [...CANONICAL_TABLETS, ...EQUIVALENT_TABLETS];

const characters = ['a rain-shy robot', 'a clue-finding goalie', 'a detective dog', 'a young drummer'];
const goals = ['find a missing key', 'help a lost duck', 'open a hidden door', 'repair the Guild map'];
const troubles = ['the lights went out', 'the map pointed backward', 'a bridge disappeared', 'the key began talking'];
const actions = ['followed a tiny clue', 'asked a new friend for help', 'tried the mistake again', 'listened for a secret sound'];
const results = ['the missing page returned', 'a hidden path opened', 'everyone reached home', 'the mistake became the answer'];

export function generateStorySeed(numericSeed: number): StorySeed {
  const rng = new SeededRng(numericSeed);
  return {
    numericSeed,
    character: rng.pick(characters),
    goal: rng.pick(goals),
    trouble: rng.pick(troubles),
    action: rng.pick(actions),
    result: rng.pick(results),
  };
}

export function selectQuestOneTablets(numericSeed: number, attemptNumber: number): TabletDefinition[] {
  const rng = new SeededRng(numericSeed);
  if (attemptNumber === 1) {
    const canonicalSix = CANONICAL_TABLETS.filter((tablet) => !tablet.id.startsWith('robot-tree'));
    return rng.shuffle(canonicalSix);
  }
  const stories = rng.shuffle(ALL_TABLETS.filter((tablet) => tablet.isStory));
  const descriptions = rng.shuffle(ALL_TABLETS.filter((tablet) => !tablet.isStory));
  let selected = [...stories.slice(0, 3), ...descriptions.slice(0, 3)];
  if (!selected.some((tablet) => tablet.canonical)) {
    selected = [CANONICAL_TABLETS[0] as TabletDefinition, ...selected.slice(1)];
  }
  return rng.shuffle(selected);
}

export function tabletById(id: string): TabletDefinition | undefined {
  return ALL_TABLETS.find((tablet) => tablet.id === id);
}

export const REFLECTION_PROMPTS = [
  { key: 'reflectionWho', prompt: 'Who was in a story tablet?' },
  { key: 'reflectionHappened', prompt: 'What happened in that story?' },
  { key: 'reflectionChanged', prompt: 'What changed at the end?' },
] as const;

export const WRITING_PROMPTS = [
  { key: 'somebody', label: 'Somebody', prompt: 'Who is your tiny story about?' },
  { key: 'wanted', label: 'Wanted', prompt: 'What did the character want?' },
  { key: 'but', label: 'But', prompt: 'What problem happened?' },
  { key: 'so', label: 'So', prompt: 'What did the character do?' },
  { key: 'then', label: 'Then', prompt: 'What changed at the end?' },
] as const;
