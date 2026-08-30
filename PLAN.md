# PLAN.md — The Story Guild: Quest for the Lost Pages

**Status:** Agent-ready implementation specification  
**Primary target:** iPad Safari  
**Secondary target:** Current desktop browsers for development and automated verification  
**Delivery model:** Static web application with local-only persistence  
**Course:** Twelve lessons based on *Tiny Tales: A Third-Grade Course in 100-Word Stories*

Summary: This plan defines the accepted product, curriculum, architecture, milestone gates, and verification contract for The Story Guild writing game.

Status: Milestones 0 and 1 implemented; automated gates pass; physical iPad Safari verification remains outstanding.

Keywords: Story Guild; micro stories; third-grade writing; iPad Safari; Phaser 3.90.0; Quest 1; runtime sprite configuration; configurable audio; GitHub Pages

### Accepted implementation decisions — 2026-08-29

Decision: Milestones 0 and 1 deliver the engineering foundation and complete Quest 1 vertical slice before work begins on Quest 2.

Decision: `public/config/game.json` is a runtime-validated, deeply frozen manifest for developer-configurable character names, sprite sheets, animation frames, tint, scale, and local audio cues. Editing sprite or sound configuration does not require a TypeScript change.

Decision: Milestones 0 and 1 include mute-first audio configuration hooks, persistent sound settings, and iPad user-gesture unlock behavior, but no sound files or music are bundled. This narrow configuration support is an exception to the general P1 placement of finished sound and music.

Decision: The first deployment target is the repository's GitHub Pages project site. The Vite build uses relative asset paths and a GitHub Actions workflow publishes `dist` from `main`.

Decision: Current and immediately previous major iPad Safari releases are the compatibility target. Physical iPad validation remains a separate manual gate.

Disambiguation: `NOTES.md` contains historical engineering guidance from the Block Blaster project. It informs testability and browser-risk mitigation, but it is not Story Guild curriculum content. `tiny_tales_third_grade_homeschool.md` is the curriculum source.

---

## 1. Purpose

Build a top-down, original pixel-art adventure game that teaches the complete twelve-lesson writing course to an average eight-year-old third-grade homeschool student.

The player joins **The Story Guild** and enters twelve short quests to recover pages from a lost storybook. Each quest creates an experience the child can remember and write about. Recurring non-player characters ask short questions that help the child identify the character, goal, problem, actions, result, details, dialogue, and revisions.

Every lesson ends with a distraction-free **Copy into Your Adventure Journal** screen. It shows the child’s own work in large, sentence-sized sections so the child can hand-copy the assignment onto paper.

This document is an execution contract for an implementation agent and its verification harness. Implement one milestone at a time. Do not compress the complete product into one shallow pass.

---

## 2. Resolved Product Decisions

These decisions are fixed for the first complete release:

1. Use **The Story Guild: Twelve Quests** as the core structure, wrapped in a light **Lost Pages of Storyland** course-long story.
2. Use **exploration and puzzles only**. Do not include combat, weapons, health, damage, enemies, lives, or violent failure animations.
3. The student creates original wording by **typing short phrases and sentences** into real HTML inputs.
4. Lesson 9 uses the **shorter six-part copying exercise**, not the full 120–180-word first draft, for handwriting practice.
5. Player choices and deterministic randomized story seeds make each adventure somewhat different on replay.
6. A parent can export the completed work as a **printable portfolio document**.
7. Use local device storage. Do not require an account, server, cloud database, analytics service, advertisement system, or external AI service.
8. Use original pixel art and original names. The visual language may evoke early top-down console role-playing games, but no Nintendo artwork, maps, characters, music, dialogue, logos, or other protected assets may be copied.

The remaining technical choices in this plan are reversible implementation defaults, not open product questions.

---

## 3. Source Material and Content License

The implementation must use these project inputs as the content source of truth:

- `tiny_tales_third_grade_homeschool.md`
- `NOTES.md`
- this `PLAN.md`

The writing-course adaptation states that its course-derived content is shared under **CC BY-NC-SA 4.0**. Preserve attribution in an in-game Credits screen and in the printable portfolio footer. Keep code licensing separate from course-content licensing.

Required credit text:

> Writing-course framework adapted from openly licensed materials by Laura Gibbs. Course-derived content is shared under CC BY-NC-SA 4.0.

Do not silently replace course concepts, lesson order, word-count rules, or student goals with a different writing curriculum.

---

## 4. Educational Contract

The game succeeds only when the child does the thinking and wording.

### 4.1 The game may

- remember what happened during the quest;
- ask one short question at a time;
- offer two or three idea choices when the child is stuck;
- show sentence frames from the course;
- provide curated verb, transition, dialogue, and title choices;
- join fields that the child already typed into a review page;
- count words;
- point out a missing story part;
- let the child edit, undo, and approve every change;
- preserve before-and-after drafts.

### 4.2 The game must not

- generate a polished story for the child;
- invent sentences and present them as the child’s work;
- automatically rewrite the child’s prose;
- score imagination, spelling, or grammar during early drafting;
- punish mistakes with lost progress;
- lock progress behind speed, perfect spelling, or repeated failure;
- use a chatbot or remote language model;
- turn the lesson into a multiple-choice quiz with little writing.

### 4.3 Child-facing language

- One question per dialogue screen.
- Usually no more than 20 words per NPC speech bubble.
- No more than two short sentences in one bubble.
- Prefer concrete words and direct verbs.
- The NPC asks; the child answers.
- Hints appear only after the child requests help or makes two unsuccessful attempts.

### 4.4 Word-count rules

Use one shared `WordCountService` everywhere:

1. The title does not count.
2. A nonempty token separated by whitespace counts as one word.
3. A contraction such as `can't` counts as one word.
4. A number such as `12` counts as one word.
5. Newlines and repeated spaces do not create extra words.
6. The author’s note does not count.
7. Lesson 10 and the final story require exactly 100 story words.

---

## 5. Scope Labels

Every requirement uses one of these labels:

- **MUST:** Implement completely. No placeholder is acceptable.
- **MVP-SIMPLE:** Implement a complete but deliberately small version.
- **PLACEHOLDER-OK:** A clearly labeled, functional placeholder is acceptable.
- **P1:** Do not implement until all complete-release acceptance tests pass.

### 5.1 MUST

- A complete deterministic test harness.
- A complete vertical slice before building all quests.
- Twelve course-aligned quests in the complete release.
- Exploration and puzzles without combat.
- Typed student responses.
- Per-lesson review and handwriting-copy screen.
- Deterministic random seeds and replay.
- Save, reload, and interrupted-session recovery.
- Printable parent portfolio.
- iPad portrait and landscape layouts.
- Original local assets and no runtime CDN dependency.
- Course attribution and credits.

### 5.2 MVP-SIMPLE

- One compact guild hub.
- One to three small rooms per quest.
- Fixed map topology with randomized characters, clue placement, object placement, choices, and story seeds.
- A small set of reusable puzzle types.
- Simple two-frame walking animation.
- Limited original palette and tilesets.
- Basic progress display using twelve recovered pages.

### 5.3 PLACEHOLDER-OK

- Rich character portraits.
- Advanced sprite animation.
- Music and sound effects.
- Decorative particle effects.
- Multiple map layouts for the same lesson.
- Elaborate ending sequence.

### 5.4 Explicitly excluded from MVP and complete release

Do not add these without a later product decision:

- combat or simulated combat;
- shop, currency, loot, equipment, levels, or experience points;
- streaks, daily scheduling, mastery charts, grades, or adaptive lesson scheduling;
- online accounts, leaderboards, social sharing, telemetry, or advertising;
- procedural text generation or generative AI;
- multiplayer;
- a large open world;
- a custom map editor;
- speech recognition;
- handwriting recognition.

---

## 6. Milestones and Gates

The implementation agent must complete, test, and report each milestone before proceeding to the next.

### Milestone 0 — Engineering Foundation

**Goal:** Establish modular architecture, deterministic tests, storage, and a renderable shell.

**MUST deliver:**

- TypeScript project with strict type checking.
- Vite static build.
- Phaser loaded from the local package, not a CDN.
- Frozen configuration object.
- Typed event bus.
- Explicit application state machine.
- Dependency-injected clock, random-number generator, storage adapter, and exporter.
- `?test=1` browser self-test mode.
- Unit tests for word counting, seeded randomness, state transitions, and save defaults.
- Responsive shell with an empty game canvas and DOM side panel.
- Inline empty favicon: `<link rel="icon" href="data:,">`.
- No console errors or failed asset requests.

**Gate:** `npm run verify` passes and `/?test=1` displays `ALL PASS`.

### Milestone 1 — Complete Vertical Slice

**Goal:** Prove one complete learning loop with Quest 1.

**MUST deliver:**

- Onboarding and local profile.
- Walkable guild hub.
- Quest board with Quest 1 unlocked.
- Quest 1 exploration and classification puzzle.
- NPC reflection prompts.
- Student text inputs.
- Review screen.
- handwriting-copy screen.
- Completion and first recovered page.
- Save and reload from every phase.
- Printable preview containing Quest 1.
- Sequential browser acceptance test.

**Gate:** All Milestone 1 acceptance tests pass in a production build served over HTTP.

### Milestone 2 — Lessons 2 Through 8

**Goal:** Complete the foundational writing and remix quests using the same architecture.

**MUST deliver:**

- Quests 2–8.
- Reusable puzzle registry.
- Earlier-story selection for revision and remix quests.
- Multiple attempts preserved rather than overwritten.
- Deterministic replay with a new seed.
- Portfolio output for all completed lessons.

**Gate:** Course-definition tests confirm Lessons 1–8 have complete content, artifacts, copy policies, prerequisites, and automated state-path coverage.

### Milestone 3 — Capstone Lessons 9 Through 12

**Goal:** Complete drafting, cutting, editing, publishing, and final portfolio export.

**MUST deliver:**

- Shared capstone artifact across Lessons 9–12.
- Lesson 9 long draft and six-part handwriting summary.
- Lesson 10 exact 100-word revision.
- Lesson 11 editing, title, listener feedback, and author’s note.
- Lesson 12 final copy, reflection, completion certificate, and printable portfolio.
- Recovery from corrupted primary save using last-known-good backup.

**Gate:** The test harness fast-completes all twelve lessons, generates a valid portfolio, and verifies all required fields and counts.

### P1 — Only after complete-release approval

- Installable PWA and offline service worker.
- Optional sound and music with a mute-first setting.
- More seed packs and map variants.
- More original sprite animation and portraits.
- Downloadable JSON backup and restore UI.
- Additional accessibility modes.
- Optional 6-word challenge gallery.

---

## 7. Core Player Loop

Every lesson follows the same recognizable loop:

1. **Choose a quest.** The player walks to the Guild Board.
2. **Receive a briefing.** An NPC states the mission in one or two short screens.
3. **Explore.** The player moves through a compact top-down map.
4. **Solve a puzzle.** The puzzle creates or reveals story information.
5. **Recall the adventure.** An NPC asks what happened, one question at a time.
6. **Write.** The child types short phrases and sentences.
7. **Review.** The game shows the exact child-created text and word count.
8. **Copy to paper.** The child hand-copies the highlighted lesson assignment.
9. **Complete the quest.** A lost page returns to the Guild’s book.
10. **Return to the hub.** The next quest unlocks.

Recommended session proportions:

- Exploration and puzzle: 5–10 minutes.
- Conversation and planning: 3–5 minutes.
- Typing and revision: 10–15 minutes.
- Handwriting: flexible; may continue off-screen with the copy page left open.

No puzzle is timed. No puzzle permanently fails. An incorrect attempt produces a short clue and allows another attempt.

---

## 8. Application State Machine

All state changes must pass through a single controller. Phaser scenes and DOM components must not mutate save data directly.

```text
BOOT
  -> ONBOARDING | HUB | RESUME_PROMPT

ONBOARDING
  -> HUB

HUB
  -> QUEST_BRIEFING
  -> PARENT_AREA

QUEST_BRIEFING
  -> EXPLORE
  -> HUB

EXPLORE
  -> PUZZLE
  -> REFLECTION
  -> PAUSED

PUZZLE
  -> EXPLORE
  -> REFLECTION

REFLECTION
  -> WRITING

WRITING
  -> REVIEW
  -> PAUSED

REVIEW
  -> WRITING
  -> COPY

COPY
  -> COMPLETE
  -> REVIEW

COMPLETE
  -> HUB

PAUSED
  -> previous phase
  -> HUB with resumable session
```

Requirements:

- Persist after every phase transition.
- Persist text after a 500 ms debounce and again on blur, `pagehide`, and `visibilitychange`.
- Serialize transitions through one async dispatch queue.
- Disable the triggering control until the transition and save complete.
- Never coordinate critical behavior using arbitrary `setTimeout` delays alone.
- Store the active random seed and generated seed object so reload never rerolls the quest.

---

## 9. World and Narrative

### 9.1 Guild hub

The hub is a small top-down map with these locations:

- **Quest Board:** start or replay lessons.
- **Mapkeeper’s Desk:** review quest facts and active story seed.
- **Wordsmith’s Table:** revisit verbs, dialogue, and titles.
- **Hall of Pages:** see recovered pages and completed lessons.
- **Parent Alcove:** open progress, print, and reset tools using a deliberate press-and-hold control.

The hub must feel explorable, not like a static menu. It may still use DOM panels after the player interacts with an object.

### 9.2 Recurring NPC roles

Use original names and designs. The initial names below are defaults:

- **Rowan, Quest Keeper:** gives a short mission and reminds the player of the lesson goal.
- **Pip, Mapkeeper:** asks who, where, what was wanted, and what happened.
- **Mira, Wordsmith:** helps with verbs, sensory details, dialogue, and titles.
- **Tink, Story Surgeon:** helps cut, combine, move, and replace words.
- **Sage, Archivist:** helps publish, reflect, and prepare the printable portfolio.

NPCs must not supply complete student sentences. They may offer a small word bank or two starter choices.

### 9.3 Lost-page wrapper

- The Guild’s book has twelve missing pages.
- Completing one lesson restores one page.
- The restored page visually records the lesson title and one short excerpt from the child’s work.
- Lesson 12 restores the cover or final binding and unlocks the completion certificate.
- There is no villain or violent threat. The pages were scattered by a magical story storm.

---

## 10. Curriculum and Quest Specifications

The lesson order and objectives are fixed. Each quest definition must include its goal, prerequisite, map template, puzzle type, randomization axes, writing prompts, artifact schema, copy policy, and completion validator.

### Quest 1 — The Gate of Change

**Course goal:** Tell whether a group of words is a story.  
**Student statement:** “I can tell whether a group of words is a story.”

- **Adventure:** Explore the Archive Gate and examine six scene tablets.
- **Puzzle:** Sort tablets into `STORY` and `NOT YET A STORY`. A story must contain an event and a change.
- **Content:** Include the course’s robot/tree, dragon/map, goalie/duck, drum/hidden-door style examples plus seeded equivalents.
- **NPC prompts:** Who is it about? What happened? What changed?
- **Writing fields:** `somebody`, `wanted`, `but`, `so`, `then`.
- **Artifact:** One complete 6–12-word story created from the child’s answers.
- **Copy assignment:** The complete 6–12-word story.
- **Randomization:** Character, wanted object, problem, action, result, and tablet order.
- **Completion validation:** Classification solved; all five fields nonempty; story word count from 6 through 12.

### Quest 2 — The Four Rune Trail

**Course goal:** Build a story idea from a character, place, goal, and problem.

- **Adventure:** Find four runes labeled `WHO`, `WHERE`, `WANT`, and `TROUBLE` in a small outdoor map.
- **Puzzle:** At each rune, choose one of three compatible seeded options. Arrange the four runes at the Story Forge.
- **NPC prompts:** Who is there? Where are they? What do they want? What goes wrong? What do they do next?
- **Writing fields:** `somebody`, `wanted`, `but`, `so`, `then`.
- **Artifact:** A three-to-five-sentence story.
- **Copy assignment:** The complete three-to-five-sentence story.
- **Randomization:** Rune options, clue locations, helper NPC, and final choice.
- **Completion validation:** All four seed axes selected; five planning fields present; three through five nonempty sentences.

### Quest 3 — The Bridge of Wants

**Course goal:** Create a character who wants something and must solve a problem.

- **Adventure:** Interview a quest character, then guide that character through three nonviolent obstacles.
- **Puzzle:** The first obstacle is simple, the second requires a new idea, and the third causes the ending.
- **NPC prompts:** What is your character’s name? What do they want? Why does it matter? What are they good at? What do they fear? What could stop them?
- **Artifact:** Character interview plus a four-to-seven-sentence story.
- **Copy assignment:** The complete story. The interview remains visible but is not required for copying.
- **Randomization:** Character strengths, fears, obstacle order, tool choices, and ending result.
- **Completion validation:** Want, importance, problem, action, and result are present; four through seven sentences.

### Quest 4 — The Three Doors of Time

**Course goal:** Put beginning, middle, and ending events in a clear order.

- **Adventure:** Enter three connected rooms: Want, Trouble-and-Try, and Result-and-Change.
- **Puzzle:** Collect three illustrated scene cards, arrange them in order, then pass a “missing middle” and “missing ending” check.
- **NPC prompts:** What happens first? What makes the middle necessary? What changed at the end?
- **Writing aid:** Optional transition bank: `At first`, `One morning`, `Suddenly`, `Next`, `But`, `Because`, `So`, `A moment later`, `At last`, `In the end`.
- **Artifact:** Six-to-eight-sentence ordered story.
- **Copy assignment:** The complete six-to-eight-sentence story.
- **Randomization:** Scene images, middle complication, first attempt, and ending change.
- **Completion validation:** Three scene sections present; clear order; six through eight sentences.

### Quest 5 — The Sensory Caverns

**Course goal:** Choose strong verbs and a few useful sensory details.

- **Adventure:** Examine hidden objects and follow a trail through a cavern by touch, sound, shape, and movement clues.
- **Puzzle:** Choose the one or two clues that matter most and replace weak action phrases with strong verbs.
- **Required verb contrasts:** walked/marched/crept/raced/stumbled; looked/stared/peeked/searched/spotted; said/whispered/shouted/groaned/cheered; held/grabbed/carried/dragged/tossed.
- **Writing task:** Reopen the Quest 4 story. Replace at least one weak verb, add one useful sensory detail, and remove one detail that does not help.
- **Artifact:** Full revised story plus a structured change set showing before and after text.
- **Copy assignment:** Every sentence the child changed or added, with a minimum of two sentences. Show the full revised story above the copy assignment.
- **Randomization:** Hidden object, sensory clues, weak phrases, and path order.
- **Completion validation:** At least one verb replacement, one sensory addition, one child-approved removal, and a saved revised artifact.

### Quest 6 — The Echo Bridge

**Course goal:** Use a short line of dialogue that changes the story.

- **Adventure:** Cross a bridge by learning what two characters know and choosing dialogue that reveals a clue or causes an action.
- **Puzzle:** Distinguish useful dialogue from greetings or filler. No more than three spoken lines appear in a puzzle scene.
- **Dialogue jobs:** show a want, reveal a clue, start a problem, show a feeling, or cause the next action.
- **Writing task:** Add one or two short lines of dialogue to an earlier story and compare the story with and without them.
- **Artifact:** Revised story, dialogue lines, and the child’s reason for keeping each line.
- **Copy assignment:** The dialogue line or lines plus one surrounding action sentence.
- **Randomization:** Speakers, clue, emotion, bridge problem, and useful/filler dialogue order.
- **Completion validation:** One or two lines use quotation marks and end punctuation; at least one line performs a stated story job.

### Quest 7 — The Remix Ruins

**Course goal:** Retell a known story with a new choice.

- **Adventure:** Revisit a transformed version of a previous quest or choose a short public-domain fable summary supplied in the game.
- **Puzzle:** Spin or select one remix axis: main character, setting, problem/ending, point of view, format/style, or before/after scene.
- **Writing task:** State what stays the same and what changes, then write five to eight sentences.
- **Source choices:** Prefer one of the child’s earlier stories. Optional built-in sources may include public-domain fables identified in the course.
- **Artifact:** Original source reference, remix axis, stay/change notes, five-to-eight-sentence remix, and source note.
- **Copy assignment:** Complete remix and one-line source note.
- **Randomization:** Offered remix axes, transformed map decoration, point of view, and optional ending twist.
- **Completion validation:** Source identified; at least one meaningful change; five through eight sentences; source note present when required.

### Quest 8 — The Shrinking Tower

**Course goal:** Keep the heart of a story while making it shorter.

- **Adventure:** Carry story details through four nesting rooms labeled 100, 50, 25, and 6.
- **Puzzle:** Decide which details fit in every room and which only belong in longer versions.
- **Writing task:** Choose an earlier story, complete “This story is really about…”, write an approximately 50-word version and an exactly 25-word version. A 6-word version is optional.
- **Artifact:** Story-heart statement, 50-word version, 25-word version, optional 6-word version, titles, and reflection.
- **Copy assignment:** The 50-word and 25-word versions. Include the optional 6-word version when created.
- **Randomization:** Earlier-story suggestions, removable detail cards, room order decoration, and title prompts.
- **Completion validation:** Heart statement present; 50-word version is 45–55 words; 25-word version is exactly 25 words; optional 6-word version is exactly 6 words.

### Quest 9 — The Drafting Plains

**Course goal:** Tell the full story before worrying about the 100-word limit.

- **Adventure:** Complete six quest milestones that correspond to the six-part first-draft plan.
- **Six parts:** character and setting; what the character wants; problem; first attempt; important action or decision; result and change.
- **Writing task:** First type one short planning sentence for each of the six parts. Then write 8–12 sentences. A 120–180-word first draft is recommended but not a hard failure condition.
- **Artifact:** Seed, adventure event log, six planning sentences, full first draft, sentence count, and word count.
- **Copy assignment:** Only the six short planning sentences, one per card. Do not require hand-copying the full first draft in this lesson.
- **Randomization:** Capstone seed, milestone order within logical constraints, clue, helper, first attempt, key decision, and ending twist.
- **Persistence:** This quest may span two sessions and must resume at the exact sentence and cursor-safe field state.
- **Completion validation:** Six planning parts present; 8–12 sentences; full draft saved; word count displayed without forcing edits.

### Quest 10 — The Word-Weed Maze

**Course goal:** Remove or replace words without hurting the story.

- **Adventure:** Navigate a maze made from the Lesson 9 sentence strips.
- **Puzzle:** Mark each sentence `MUST KEEP`, `MAY SHORTEN`, or `MAY CUT`, then reorder when needed.
- **Revision tools:** Remove repetition; replace a phrase with one strong word; begin closer to the action; remove filler; combine sentences; add only needed goal, cause, action, detail, dialogue, or ending information.
- **Writing task:** Manually edit the Lesson 9 draft to exactly 100 words. Every change must be child-approved and undoable.
- **Artifact:** Original draft, revision operations, final 100-word draft, and before/after counts.
- **Copy assignment:** The exact 100-word draft.
- **Randomization:** Presentation order of suggested edits and optional NPC hints. The underlying child draft must never be randomly altered.
- **Completion validation:** Story is exactly 100 words and still contains character/situation, goal, problem, action/choice, and result/change.

### Quest 11 — The Editor’s Forge

**Course goal:** Improve clarity, sound, spelling, and punctuation while preserving 100 words.

- **Adventure:** Visit four forge stations: Read Aloud, Listener, Four-Color Edit, and Title Bench.
- **Read-aloud station:** The child reads the story; the app lets the child mark confusing, breathless, repeated, or weak-ending locations. Speech synthesis is not required.
- **Listener station:** A parent or listener types three short responses: `I pictured`, `I wondered`, and `My favorite word or moment was`.
- **Edit station:** Mark capitals, end punctuation, dialogue punctuation, and spelling checks. The child chooses changes.
- **Title station:** Create a title and a two-to-four-sentence author’s note.
- **Artifact:** Final 100-word edited story, title, listener feedback, edit marks, author’s note, and revision history.
- **Copy assignment:** Title, author’s note, and each sentence changed since Lesson 10. Show the full final story for context.
- **Completion validation:** Story remains exactly 100 words; title present; author’s note has two through four sentences; required convention checks acknowledged.

### Quest 12 — The Hall of Tales

**Course goal:** Present a story so another person can enjoy it.

- **Adventure:** Place the final page in the Guild’s book and prepare a story exhibit.
- **Publishing choices:** Illustrated story page, accordion-book plan, story-scene plan, audio-reading plan, or tiny-story-museum plan. The game stores the choice but does not need to create physical art.
- **Reflection prompts:** `I learned that tiny stories…`; `I am proud of…`; `The best word in my story is… because…`; `Next time I want to write about…`.
- **Artifact:** Final story package, selected publishing project, final reflection, companion short version, and completion date.
- **Copy assignment:** The complete polished 100-word final story. The 25- or 6-word companion version may be added as an optional second page.
- **Parent output:** Unlock the complete printable portfolio and certificate.
- **Randomization:** Decorative exhibit arrangement only. Do not alter the final writing.
- **Completion validation:** Final story is exactly 100 words; title and author’s note present; reflection complete; final copy screen acknowledged.

---

## 11. Randomization and Choice Design

Randomization should change the adventure while preserving a coherent, testable lesson.

### 11.1 Deterministic seed

Use a small deterministic PRNG such as `mulberry32` or an equivalent tested implementation.

```text
seedKey = profileId + lessonId + attemptNumber + optionalDebugSeed
```

Persist both:

- the numeric PRNG seed;
- the fully generated `StorySeed` object.

A reload resumes the same generated quest. A deliberate replay increments `attemptNumber` and creates a new attempt without overwriting prior work.

### 11.2 Do not generate arbitrary combinations

Use compatibility tags and curated candidate pools.

```ts
interface SeedItem {
  id: string;
  label: string;
  tags: string[];
  requires?: string[];
  excludes?: string[];
}
```

The generator must:

1. filter candidates using required and excluded tags;
2. choose from the valid pool using the seeded PRNG;
3. return a known-safe fallback bundle if the pool is empty;
4. expose the selected bundle to tests;
5. never loop indefinitely while searching for a combination.

### 11.3 Initial seed catalog

Use the course’s starting set:

**Characters**

- robot who dislikes water;
- young drummer with a strange rhythm;
- goalie who notices tiny clues;
- dog who thinks it is a detective;
- inventor whose machine has one odd flaw;
- chess knight who can leave the board.

**Settings**

- dark attic;
- space-station garden;
- empty sports stadium;
- block-built game world;
- beach before a storm;
- workshop at midnight.

**Goals**

- find a missing object;
- help a smaller character;
- win fairly;
- get home before dark;
- repair a broken machine;
- learn who sent a secret message.

**Trouble**

- power goes out;
- map gives the wrong direction;
- an object starts talking;
- time is running out;
- a rival needs help too;
- the safest path disappears.

**Ending twists**

- the apparent opponent was trying to help;
- the lost object was nearby all along;
- the character succeeds by giving something up;
- the mistake becomes the solution;
- a tiny character saves the group;
- the mystery opens a bigger mystery.

Use child-friendly wording such as “apparent opponent” or “other character,” not combat language.

### 11.4 Adventure variation policy

For the complete release:

- Keep map topology fixed per lesson.
- Randomize valid NPC identity, clue placement, collectible placement, offered choices, puzzle order, and story seed.
- Let the child choose among two or three seeded options at major story points.
- Record every consequential choice in an `AdventureEventLog`.
- Reflection prompts must reference the actual event log, not a generic script.

P1 may add alternate room layouts after all fixed-layout quests are reliable.

---

## 12. Puzzle System

Build a registry of small reusable puzzle controllers rather than twelve unrelated minigames.

```ts
interface PuzzleController {
  readonly id: string;
  start(context: PuzzleContext): PuzzleState;
  apply(action: PuzzleAction, state: PuzzleState): PuzzleResult;
  isComplete(state: PuzzleState): boolean;
  getHint(state: PuzzleState): string | null;
  serialize(state: PuzzleState): unknown;
  restore(data: unknown): PuzzleState;
}
```

Required reusable puzzle types:

1. **Classification Puzzle:** sort story/not-story or useful/filler items.
2. **Collection Puzzle:** locate ordered or unordered runes/clues.
3. **Sequence Puzzle:** arrange beginning, middle, and ending.
4. **Choice-and-Consequence Puzzle:** choose an action and record the resulting event.
5. **Observation Puzzle:** inspect several details and select the useful one or two.
6. **Text-Transformation Puzzle:** revise child text using explicit, undoable operations.

Puzzle rules:

- No timer.
- No lives.
- No damage.
- No permanent failure.
- Two unsuccessful attempts unlock a hint.
- A parent-assist action may reveal the next step but must record that assistance was used.
- Puzzle completion emits a semantic event; it must not directly unlock lessons or write storage.

---

## 13. Writing Workbench

Use DOM controls layered beside or above the Phaser canvas. Do not implement text entry inside the canvas.

### 13.1 Input behavior

- Real `<input>` and `<textarea>` elements.
- Input font size of at least 16 CSS pixels to avoid iOS focus zoom.
- `autocapitalize="sentences"` and appropriate spellcheck.
- One short prompt per screen for Lessons 1–8.
- One sentence box at a time for Lesson 9.
- Back, next, save, and review controls.
- Character or sentence guidance, not strict creative length caps except where the course requires them.
- Autosave after 500 ms of inactivity, on blur, and on phase change.
- Never erase text when orientation changes or the keyboard opens.

### 13.2 Review behavior

The review screen must:

- display exactly what the child entered;
- show labels for each story part;
- show live word count where relevant;
- let the child edit any section;
- show any automatic joining punctuation separately and transparently;
- require child approval before finalizing;
- preserve revisions for Lessons 5, 6, 10, and 11.

### 13.3 Writing support

Curated support may include:

- story frame: `Somebody wanted something, but a problem happened, so the character acted, and then something changed.`
- strong-verb bank;
- transition bank;
- dialogue punctuation examples;
- story-heart themes such as courage, friendship, curiosity, fairness, patience, teamwork, honesty, kindness, problem solving, and learning from a mistake;
- title patterns from the course;
- revision operations from Lesson 10.

A support choice inserts only the selected word or frame. It must not fill a complete story automatically.

---

## 14. Copy into Your Adventure Journal

Every lesson must end with this screen before completion.

### 14.1 Required behavior

- Use a DOM-only, distraction-free view.
- Pause or hide active game motion.
- Display the child’s full lesson artifact for context.
- Highlight the exact handwriting assignment defined by the lesson’s `CopyPolicy`.
- Show one sentence or short line per card.
- Use large high-contrast text.
- Provide `Previous`, `Next`, `Show All`, and `I Copied This` controls.
- Display progress such as `Sentence 2 of 6`.
- Save `copyStartedAt`, `copyCompletedAt`, and optional parent-review status.
- Allow reopening any previous copy page from the Parent Area.
- Do not claim to verify physical handwriting.

### 14.2 Lesson 9 special rule

The copy assignment is the child’s six planning sentences, not the 120–180-word draft.

### 14.3 Repeated-draft policy

To avoid unnecessary copying fatigue while still ending every lesson with handwriting:

- Lessons 1–4 and 7–10 copy the stated complete assignment.
- Lesson 5 copies changed or added sentences.
- Lesson 6 copies dialogue plus surrounding action.
- Lesson 11 copies title, author’s note, and sentences changed after Lesson 10.
- Lesson 12 copies the final polished 100-word story.

The full child-created artifact must always remain visible even when the highlighted copy assignment is a subset.

---

## 15. Parent Area and Printable Export

The Parent Area is entered with a deliberate press-and-hold button. This is an accidental-entry guard, not security.

### 15.1 Parent features for the complete release

- View lesson status and attempts.
- Open any saved artifact.
- Reopen any handwriting-copy screen.
- Select which attempts appear in the portfolio.
- Print one lesson or the complete portfolio.
- Edit the student display name.
- Reset progress only after a typed confirmation.
- View storage-recovery messages.

Do not add charts, grades, mastery scores, or daily streaks.

### 15.2 Printable portfolio

Generate a self-contained print-preview DOM document using only local styles and escaped child text.

Required sections:

1. Cover page with student name and course title.
2. Twelve-lesson progress summary.
3. Each selected lesson’s goal, adventure seed, child writing, word count, and copy-completion date.
4. Revision before/after sections for Lessons 5, 6, 10, and 11.
5. Lesson 9 six-part plan and long first draft.
6. Final 100-word story, title, author’s note, and companion version.
7. Final reflection.
8. Completion certificate.
9. Attribution footer.
10. Optional handwriting sheets with the child text followed by blank ruled lines.

Implementation requirements:

- Provide an in-app print preview before calling `window.print()`.
- Call `window.print()` only from a direct user tap.
- Use `@media print` and explicit page breaks.
- Use system fonts and no remote assets.
- Escape all child-entered text and titles.
- Exclude incomplete blank lessons unless the parent selects them.
- Show title and author’s note outside the 100-word count.
- Unit-test generated HTML and print data before browser testing.

A PDF-generation library is not required. The browser print sheet may be used to print or save as PDF.

---

## 16. Technical Stack

Use a small static application with no runtime backend.

### Required stack

- TypeScript with `strict: true`.
- Vite.
- Phaser `3.90.0`, installed locally and pinned in the lockfile.
- Plain HTML and CSS for application panels and forms.
- Vitest for pure unit tests.
- Browser self-tests through `?test=1`.
- Static production output in `dist/`.

### Dependency rules

- Pin exact dependency versions in the lockfile.
- Do not use CDN scripts, remote fonts, or remote images at runtime.
- Do not introduce React, Vue, a state-management library, a UI kit, or a database unless a later decision approves it.
- Keep the runtime dependency list small.

### Suggested scripts

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "npm run typecheck && vite build",
    "verify": "npm run test && npm run build"
  }
}
```

---

## 17. Rendering and iPad Layout

### 17.1 Phaser configuration

Use these defaults unless an implementation constraint is demonstrated:

- Internal game resolution: `320 × 240`.
- Tile size: `16 × 16`.
- Renderer: `Phaser.AUTO`.
- `pixelArt: true`.
- `antialias: false`.
- `roundPixels: true`.
- Scale mode: `FIT`.
- Center mode: `CENTER_BOTH`.
- Original, local textures.

Do not assume Phaser uses Canvas 2D. Rendering tests must be WebGL-safe.

### 17.2 Responsive layouts

**Landscape iPad**

- Game canvas on the left.
- Dialogue, writing, or controls on the right.
- Virtual D-pad and action button under or beside the canvas.

**Portrait iPad**

- Game canvas at the top.
- Dialogue/writing panel below.
- Controls below the canvas and above the browser safe area.

### 17.3 Input

- Desktop: arrow keys or WASD plus Space/Enter.
- iPad: large virtual D-pad and one context-sensitive action button.
- Minimum target size: 48 CSS pixels.
- No hover-only controls.
- `touch-action: none` on the active game surface.
- Writing views may scroll; exploration views must not scroll the page.
- Use `env(safe-area-inset-*)` padding.
- Use `visualViewport` when available to keep focused inputs visible above the software keyboard.

### 17.4 Movement and interaction

- Four-direction movement.
- Collision with walls and objects.
- Interaction marker appears near an NPC or object.
- One action button starts conversation or manipulation.
- No attack button.
- No physics-heavy effects.
- Pause movement while a DOM dialogue or writing panel is open.

---

## 18. Modular Architecture

Use one-way data flow:

```text
User Input
  -> UI or Phaser Scene emits intent
  -> AppController dispatches action
  -> Domain service computes new state
  -> SaveRepository persists
  -> EventBus announces committed state
  -> UI and scene render from state
```

### 18.1 Required modules

- **Config:** frozen constants and feature flags.
- **AppController:** state transitions and orchestration.
- **EventBus:** typed semantic events.
- **StateMachine:** legal phases and transition guards.
- **CourseCatalog:** twelve data-driven lesson definitions.
- **SeedGenerator:** deterministic compatible story seeds.
- **QuestEngine:** event log, objectives, and puzzle sequence.
- **PuzzleRegistry:** reusable puzzle controllers.
- **WordCountService:** one canonical count implementation.
- **ArtifactService:** creates and validates lesson artifacts.
- **SaveRepository:** serialization, validation, migration, backup, and recovery.
- **ExportService:** safe printable portfolio model and HTML.
- **Phaser scenes:** rendering and spatial interaction only.
- **DOM UI:** onboarding, dialogue, writing, review, copy, parent, and print preview.
- **SelfTestRunner:** browser integration tests.

### 18.2 Suggested repository structure

```text
/
├─ index.html
├─ package.json
├─ package-lock.json
├─ tsconfig.json
├─ vite.config.ts
├─ README.md
├─ PLAN.md
├─ NOTES.md
├─ LICENSE-CONTENT.md
├─ public/
│  └─ assets/
│     ├─ tiles/
│     ├─ sprites/
│     └─ ui/
├─ src/
│  ├─ main.ts
│  ├─ config.ts
│  ├─ app/
│  │  ├─ AppController.ts
│  │  ├─ AppStateMachine.ts
│  │  └─ AppViewModel.ts
│  ├─ core/
│  │  ├─ EventBus.ts
│  │  ├─ SeededRng.ts
│  │  ├─ Clock.ts
│  │  ├─ ActionQueue.ts
│  │  └─ Result.ts
│  ├─ domain/
│  │  ├─ models.ts
│  │  ├─ WordCountService.ts
│  │  ├─ ArtifactService.ts
│  │  ├─ CourseValidator.ts
│  │  └─ CopyPolicyService.ts
│  ├─ content/
│  │  ├─ courseCatalog.ts
│  │  ├─ seedCatalog.ts
│  │  ├─ dialogueCatalog.ts
│  │  ├─ verbBank.ts
│  │  └─ maps/
│  ├─ quest/
│  │  ├─ QuestEngine.ts
│  │  ├─ QuestFactory.ts
│  │  ├─ PuzzleRegistry.ts
│  │  └─ puzzles/
│  ├─ game/
│  │  ├─ createGame.ts
│  │  ├─ scenes/
│  │  │  ├─ BootScene.ts
│  │  │  ├─ HubScene.ts
│  │  │  └─ QuestScene.ts
│  │  ├─ PlayerController.ts
│  │  └─ InteractionSystem.ts
│  ├─ services/
│  │  ├─ SaveRepository.ts
│  │  ├─ LocalStorageAdapter.ts
│  │  ├─ SeedGenerator.ts
│  │  └─ ExportService.ts
│  ├─ ui/
│  │  ├─ AppShell.ts
│  │  ├─ screens/
│  │  └─ components/
│  ├─ styles/
│  │  └─ app.css
│  └─ test/
│     ├─ SelfTestRunner.ts
│     └─ TestApi.ts
└─ tests/
   ├─ wordCount.test.ts
   ├─ rng.test.ts
   ├─ courseCatalog.test.ts
   ├─ stateMachine.test.ts
   ├─ puzzleRegistry.test.ts
   ├─ artifacts.test.ts
   ├─ copyPolicy.test.ts
   ├─ storage.test.ts
   └─ export.test.ts
```

### 18.3 Architecture rules

- No mutable global game state.
- No scene may call `localStorage` directly.
- No UI component may unlock a lesson directly.
- Domain modules must not import Phaser.
- Pure domain tests must run without a browser or canvas.
- Store content as typed data rather than duplicating lesson logic across scenes.
- Use one generic `QuestScene` configured by lesson data unless a documented exception is required.
- All controls receive stable `data-testid` values.
- Major actions resolve through promises or committed-state events so browser automation can wait deterministically.

---

## 19. Domain Data Contracts

The exact types may evolve, but preserve these boundaries.

```ts
type LessonId =
  | 'L01' | 'L02' | 'L03' | 'L04' | 'L05' | 'L06'
  | 'L07' | 'L08' | 'L09' | 'L10' | 'L11' | 'L12';

type QuestPhase =
  | 'briefing'
  | 'explore'
  | 'puzzle'
  | 'reflection'
  | 'writing'
  | 'review'
  | 'copy'
  | 'complete';

interface LessonDefinition {
  id: LessonId;
  order: number;
  title: string;
  studentGoal: string;
  prerequisiteIds: LessonId[];
  questTemplateId: string;
  puzzleIds: string[];
  randomAxes: string[];
  writingSteps: WritingStepDefinition[];
  artifactDefinition: ArtifactDefinition;
  copyPolicy: CopyPolicyDefinition;
  completionRules: CompletionRule[];
}

interface StorySeed {
  numericSeed: number;
  character: SeedChoice;
  setting: SeedChoice;
  goal: SeedChoice;
  trouble: SeedChoice;
  twist?: SeedChoice;
  helper?: SeedChoice;
  clue?: SeedChoice;
}

interface AdventureEvent {
  id: string;
  sequence: number;
  actorId: string;
  actionId: string;
  objectId?: string;
  resultId: string;
  childChoiceId?: string;
}

interface LessonAttempt {
  attemptId: string;
  lessonId: LessonId;
  attemptNumber: number;
  seed: StorySeed;
  phase: QuestPhase;
  questState: unknown;
  adventureEvents: AdventureEvent[];
  inputs: Record<string, string>;
  artifact: LessonArtifact | null;
  copyStatus: CopyStatus;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

interface LessonArtifact {
  lessonId: LessonId;
  title?: string;
  sections: ArtifactSection[];
  storyText?: string;
  wordCount?: number;
  sentenceCount?: number;
  revisions?: RevisionOperation[];
  sourceNote?: string;
  authorNote?: string;
  reflection?: Record<string, string>;
}
```

Use runtime validators for loaded save data. TypeScript types alone are not sufficient for corrupted or older JSON.

---

## 20. Persistence, Recovery, and Privacy

### 20.1 MVP storage strategy

The course’s text data is small enough for a simple localStorage-backed repository. Hide the browser API behind `StorageAdapter` so IndexedDB can be added later without changing domain logic.

Required keys:

```text
storyGuild.save.v1
storyGuild.backup.v1
storyGuild.test.save.v1
storyGuild.test.backup.v1
```

Test mode must never read or alter the real save keys.

### 20.2 Save schema

```ts
interface SaveDataV1 {
  schemaVersion: 1;
  profile: {
    profileId: string;
    studentName: string;
    createdAt: string;
    updatedAt: string;
  };
  settings: {
    textScale: 'normal' | 'large';
    reducedMotion: boolean;
    soundEnabled: boolean;
    inputHand: 'left' | 'right';
  };
  progress: {
    highestUnlockedLesson: LessonId;
    recoveredPages: LessonId[];
    selectedAttemptByLesson: Partial<Record<LessonId, string>>;
  };
  activeAttemptId?: string;
  attempts: Record<string, LessonAttempt>;
}
```

### 20.3 Write procedure

1. Validate the candidate state.
2. Serialize to JSON.
3. Copy the current valid primary save to the backup key.
4. Write the new primary save.
5. Read it back and validate.
6. Emit `SAVE_COMMITTED` only after successful validation.
7. If any step fails, keep the previous state active and show a clear save-error message.

### 20.4 Load procedure

1. Try the primary key.
2. Parse and validate.
3. If invalid, try the backup key.
4. If backup is valid, restore it to primary and display a recovery notice.
5. If both are invalid, preserve the raw values under diagnostic keys and start a new default save only after parent confirmation.

### 20.5 Privacy

- No network requests after local assets load.
- No telemetry.
- No analytics.
- No advertising.
- No child data leaves the device through the application.
- Child-entered text must be escaped before rendering in print HTML.
- Do not store images or audio in MVP.

---

## 21. Testability Features for the Agent Harness

### 21.1 Browser test mode

Opening `/?test=1` must:

- use isolated test storage keys;
- run browser integration tests automatically;
- render a readable pass/fail report;
- set `document.body.dataset.testStatus` to `running`, `pass`, or `fail`;
- expose structured results as `window.__STORY_GUILD_TEST_RESULTS__`;
- display the exact text `ALL PASS` only when every test passes;
- leave normal user data untouched.

### 21.2 Test API

In development or `?test=1` only, expose:

```ts
window.__STORY_GUILD_TEST_API__ = {
  resetTestSave,
  createProfile,
  getState,
  startQuest,
  applyPuzzleAction,
  submitWritingField,
  moveToPhase,
  completeCopy,
  fastCompleteLesson,
  openPrintPreview,
  getPrintModel,
  corruptPrimarySave,
  reloadFromStorage,
  setDebugSeed
};
```

Production mode must not expose mutation helpers.

### 21.3 Stable observability

- Set `document.body.dataset.appPhase` to the current application phase.
- Set `document.body.dataset.lessonId` while in a quest.
- Give every DOM control a stable `data-testid`.
- Expose the current committed state through a read-only test method.
- Emit `STATE_COMMITTED` after persistence finishes.
- The harness must wait for committed state, not animation duration.

---

## 22. Automated Test Requirements

### 22.1 Unit tests

#### Word counting

- Empty string returns 0.
- Repeated spaces and newlines do not add words.
- `can't` returns one word.
- `12` returns one word.
- Punctuation attached to a token does not add words.
- Title and author’s note are excluded by artifact count logic.
- Known fixtures at 6, 25, 50, and 100 words return exact counts.

#### Seeded randomization

- Same numeric seed produces identical output.
- Different seeds can produce different valid output.
- Generated choices satisfy compatibility tags.
- Empty candidate pool returns a documented safe fallback.
- Generator terminates within a fixed number of operations.
- Resume uses persisted seed and never rerolls.

#### Course catalog

- Exactly twelve unique lesson IDs exist.
- Orders are 1–12 without gaps.
- Every lesson has goal, quest template, puzzle, writing steps, artifact definition, copy policy, and completion rules.
- Prerequisites form an acyclic graph.
- Lessons 9–12 reference the shared capstone artifact correctly.
- Lesson 9 copy policy is `sixPartSummary`, not `fullDraft`.
- Lesson 10 and Lesson 12 require exactly 100 words.
- Every NPC bubble stays under the configured child-reading limit.
- No course definition includes combat, damage, weapon, health, or life mechanics.

#### State machine

- Every legal transition succeeds.
- Illegal phase jumps fail without changing state.
- A save occurs before `STATE_COMMITTED`.
- Duplicate taps while a transition is pending create only one transition.
- Resume returns to the saved phase.
- Completing a quest unlocks only the expected next lesson.

#### Artifacts and copy policies

- Required fields are enforced per lesson.
- Earlier-story references remain valid after replay.
- A replay creates a new attempt and preserves the old attempt.
- Lesson 5 copy text contains changed/added sentences only.
- Lesson 6 copy text contains dialogue and context.
- Lesson 9 copy text contains six planning sentences and excludes the long draft.
- Lesson 11 copy text contains title, author note, and changed sentences.
- Lesson 12 copy text contains the final 100-word story.

#### Storage

- Default save is complete and valid.
- Round-trip serialization preserves state.
- Primary corruption recovers from backup.
- Corrupt primary and backup do not silently discard data.
- Test mode uses isolated keys.
- Quota/write failure does not mark progress complete.
- Migration rejects unsupported future schema versions with a clear message.

#### Export

- Child text is HTML-escaped.
- Blank incomplete lessons are excluded by default.
- Selected attempts appear in lesson order.
- Word counts match `WordCountService`.
- Title and author note are outside the story count.
- Portfolio includes attribution and certificate.
- Print HTML contains local-only styles and no remote URLs.

### 22.2 Browser self-tests

`/?test=1` must also verify:

- Real localStorage read/write using test keys.
- App boot and shell rendering.
- A Phaser canvas exists and has nonzero dimensions.
- Renderer may be Canvas or WebGL; no test calls `getContext('2d')` unconditionally.
- Hub scene boots without console errors.
- Quest 1 can move through every phase using the test API.
- Mid-writing reload restores typed text.
- Copy completion persists.
- Print preview renders exact known fixture text.
- No missing favicon request.

A browser screenshot is the preferred render smoke test. A canvas `toDataURL()` length check may be used only as an additional signal and must not assume a Canvas 2D renderer.

### 22.3 Fast full-course test

The test API must be able to create valid fixture artifacts and fast-complete all twelve lessons without manually walking every map. This test verifies data and state integration, not puzzle usability.

Expected assertions:

- Twelve pages recovered.
- Twelve lessons selected for the portfolio.
- Capstone flows from Lesson 9 through Lesson 12.
- Final story is exactly 100 words.
- Lesson 9 copy assignment remains the six-part summary.
- Print model contains all required sections.
- No earlier attempt was overwritten.

---

## 23. Agent-Facing Acceptance Procedure

Use sequential browser actions. Do not click/type multiple gameplay actions in parallel.

### 23.1 Build and self-test

```text
1. Run: npm ci
2. Run: npm run verify
3. Expected: unit tests pass, typecheck passes, and production build succeeds.
4. Run: python3 -m http.server 4173 -d dist
5. If binding is denied or the port is occupied, use another available port and report it.
6. Do not open the project through file://.
7. Open: http://127.0.0.1:4173/?test=1
8. Wait until document.body.dataset.testStatus is pass or fail.
9. Expected: page displays ALL PASS.
10. Expected: browser console has no uncaught errors.
11. Expected: network log has no failed app assets and no favicon 404.
```

### 23.2 Vertical-slice interaction test

```text
1. Open the normal app with a deterministic debug seed.
2. Expected: first-launch screen shows student-name input and Start button.
3. Enter a test name, submit, and wait for STATE_COMMITTED.
4. Expected: guild hub appears and Quest 1 is unlocked.
5. Open the Quest Board, select Quest 1, and start it.
6. Move to each tablet sequentially; interact; verify the displayed tablet before submitting a classification.
7. Submit one incorrect classification.
8. Expected: supportive retry text appears and progress is not lost.
9. Submit the correct classification and wait for committed state.
10. Complete the remaining classification puzzle.
11. Enter each writing field one at a time.
12. After each entry, verify the input value and wait for autosave or blur-save completion.
13. Reload during writing.
14. Expected: the same seed, quest phase, prompt, and text return.
15. Finish the story and open Review.
16. Expected: review text exactly matches the child-entered fixture text.
17. Open Copy mode.
18. Expected: the exact 6–12-word story appears one line at a time.
19. Mark copying complete.
20. Expected: Quest 1 completes, one page is recovered, and Quest 2 unlocks.
21. Reload.
22. Expected: completion persists and no active-session corruption appears.
```

### 23.3 Replay and persistence test

```text
1. Replay Quest 1 with a new seed.
2. Expected: new seed differs from the first attempt.
3. Expected: the original completed attempt remains in the Parent Area.
4. Reload mid-puzzle.
5. Expected: the replay resumes with the same second seed and puzzle state.
```

### 23.4 Print test

```text
1. Open the Parent Area with the deliberate hold action.
2. Open Print Preview for completed work.
3. Expected: student name, Quest 1 goal, seed summary, exact story text, word count, copy date, and attribution appear.
4. Expected: child text is rendered as text, not interpreted as HTML.
5. Stub or observe window.print from a direct Print button tap.
6. Expected: print action is invoked only from that user gesture.
```

### 23.5 Full-course integration test

```text
1. Open /?test=1.
2. Use the test API to fast-complete Lessons 1–12 with valid fixtures.
3. Expected: all twelve pages are recovered.
4. Expected: final capstone story count is exactly 100.
5. Expected: Lesson 9 copy data contains six planning sentences, not the long draft.
6. Generate the complete print model.
7. Expected: all required lesson, revision, reflection, certificate, and attribution sections exist.
8. Expected: no test writes to the normal user save keys.
```

### 23.6 Responsive browser checks

Capture separate screenshots at:

- `1024 × 768` landscape;
- `768 × 1024` portrait;
- one narrower desktop-emulated portrait size.

Expected:

- no clipped buttons;
- no overlapping canvas and writing inputs;
- touch controls visible during exploration;
- controls hidden or de-emphasized during writing;
- copy text readable without horizontal scrolling;
- no browser-page scrolling during active exploration.

---

## 24. Manual Physical iPad Safari Verification

Desktop automation cannot prove these behaviors. Record pass/fail and the iPad/iPadOS version used.

- Launch in Safari, not Private Browsing.
- Complete onboarding in portrait.
- Move with every D-pad direction and use the action button.
- Confirm touch targets do not require repeated taps.
- Confirm the page does not scroll during exploration.
- Rotate during exploration; state and player position remain intact.
- Rotate during writing; text remains intact and the focused field stays visible.
- Open and close the software keyboard repeatedly.
- Confirm inputs do not trigger unwanted page zoom.
- Background Safari during an active quest, return, and verify exact resume.
- Close and reopen the tab, then verify local progress.
- Reload during Lesson 9 and verify the same seed and draft.
- Complete the copy screen using sentence navigation.
- Open Parent Area and Print Preview.
- Invoke the iPad print/share sheet and verify page breaks and readable text.
- Verify both portrait and landscape print preview.
- Play continuously for at least one normal lesson and note any visible frame drops or overheating.
- Verify reduced-motion and large-text settings.
- When P1 audio exists: verify sound begins only after a user gesture and mute persists.

Manual test results must be listed separately from automated results. Do not claim iPad compatibility solely from desktop Chrome checks.

---

## 25. Content and UX Validation Checklist

Before declaring a quest complete, verify:

- [ ] The adventure gives the child concrete events to remember.
- [ ] The puzzle practices the lesson skill rather than an unrelated reflex task.
- [ ] No combat, damage, weapon, enemy, health, or life system appears.
- [ ] The NPC asks one short question at a time.
- [ ] The child types original wording.
- [ ] The game does not silently rewrite the child’s work.
- [ ] The artifact records the actual random seed and choices.
- [ ] Reload resumes the same quest.
- [ ] The review shows exact child-created text.
- [ ] The copy screen matches the lesson’s copy policy.
- [ ] Completion persists.
- [ ] The lesson appears correctly in print preview.
- [ ] Automated tests cover the lesson’s special rule.

---

## 26. Art and Asset Direction

### 26.1 Required visual language

- Original top-down pixel art.
- 16×16 tile grid.
- Limited palette.
- Strong silhouettes.
- Clearly distinct walkable ground, walls, water, doors, and interactive objects.
- Small expressive NPC portraits or icons are optional.
- Quest items such as pages, runes, cards, speech bubbles, and word tokens must be visually clear.

### 26.2 Asset scope control

For Milestones 0–1, a script-generated original placeholder tileset is acceptable if it is coherent and readable. Commit all generated assets to the repository so production does not depend on a generator or network call.

For the complete release:

- reuse a small number of tilesets;
- recolor and recombine them for variety;
- add one unique landmark or object set per quest;
- avoid a bespoke animation system per lesson;
- keep the player sprite and core NPC sprites reusable.

### 26.3 Prohibited resemblance

Do not reproduce recognizable Zelda or Final Fantasy maps, characters, monsters, sprites, UI frames, title treatments, music, sound effects, item names, or story elements. The inspiration is the broad historical format: top-down exploration, tile-based rooms, pixel art, concise dialogue, and simple quest progression.

---

## 27. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| The agent attempts the whole product in one pass and produces shallow systems. | Enforce milestone gates and do not proceed until tests pass. |
| A single large file tangles game, UI, storage, and tests. | Use TypeScript modules, one-way data flow, and domain modules independent of Phaser. |
| Browser automation races clicks and saves. | Serialize actions, disable pending controls, emit committed-state events, and test sequentially. |
| Phaser selects WebGL and breaks Canvas-2D assumptions. | Use renderer-neutral checks, screenshots, canvas existence, and dimensions. |
| Random combinations create nonsense or impossible puzzles. | Use compatibility tags, curated bundles, bounded selection, and a safe fallback. |
| Reload changes the adventure. | Persist numeric seed and generated seed object before quest play. |
| iPad keyboard covers inputs or loses text. | Use DOM inputs, `visualViewport`, frequent saves, and physical-device checks. |
| localStorage is corrupted or evicted. | Maintain last-known-good backup, provide recovery behavior, and support printable output. |
| The child spends more time navigating than writing. | Keep maps compact and cap exploration at roughly 5–10 minutes. |
| Hand-copying becomes repetitive. | Use per-lesson copy policies and the shorter Lesson 9 six-part assignment. |
| The game writes for the student. | Keep all prose transformations explicit, child-approved, and undoable. |
| Printable output interprets child text as HTML. | Escape all values and test malicious fixture strings. |
| Visual inspiration becomes copyright copying. | Use only original assets, names, maps, music, and text. |
| Desktop tests are treated as iPad proof. | Maintain a separate mandatory physical iPad checklist. |

---

## 28. Definition of Done

The complete release is done only when all conditions below are true.

### Product

- [ ] The child can complete all twelve quests in order.
- [ ] Every quest contains exploration, a nonviolent puzzle, guided reflection, writing, review, and handwriting copy.
- [ ] The twelve recovered pages visibly track course progress.
- [ ] Replays vary through deterministic seeds and choices.
- [ ] Prior attempts are preserved.
- [ ] Lessons 9–12 produce one continuous capstone story.
- [ ] Lesson 10 and final story contain exactly 100 words.
- [ ] Lesson 9 handwriting uses six planning sentences.
- [ ] Parent can print the complete portfolio and certificate.

### Engineering

- [ ] `npm run verify` passes.
- [ ] `/?test=1` displays `ALL PASS` in the production build.
- [ ] Browser console has no uncaught errors.
- [ ] Production network log has no failed app assets or favicon 404.
- [ ] Test mode never touches real save keys.
- [ ] Corrupted primary save recovers from backup.
- [ ] Mid-phase reload works for exploration, writing, review, and copy.
- [ ] Full-course fast integration test passes.
- [ ] Print escaping tests pass.
- [ ] Code remains modular and no Phaser import exists in domain modules.

### Device

- [ ] Physical iPad Safari portrait checklist passes.
- [ ] Physical iPad Safari landscape checklist passes.
- [ ] Rotation does not lose state.
- [ ] Software keyboard does not obscure the active field.
- [ ] Touch movement and action controls are reliable.
- [ ] Print preview and print/share sheet are usable.

### Documentation

- [ ] README contains build, test, serve, and manual iPad instructions.
- [ ] Credits screen and portfolio attribution are present.
- [ ] Content license file is included.
- [ ] Agent completion report lists exact commands run, automated results, and outstanding manual checks.

---

## 29. Agent Execution Rules

1. Read `PLAN.md`, `NOTES.md`, and the full course file before editing code.
2. Implement only the current milestone.
3. Treat `MUST` requirements as acceptance criteria, not suggestions.
4. Do not replace a difficult requirement with a visual mockup.
5. Do not implement P1 features early.
6. Add tests before or with each domain feature.
7. Run unit tests before browser automation.
8. Run `?test=1` before long UI walkthroughs.
9. Use HTTP serving, never `file://`.
10. Use sequential browser interactions and wait for committed state after each action.
11. Fix every reproducible failure before proceeding.
12. Preserve user data during migrations and recovery.
13. Never claim physical iPad behavior was verified unless it was tested on a physical iPad.
14. When a new decision materially changes child experience, privacy, licensing, persistence, or product scope and this plan does not resolve it, stop and ask the product owner before implementing that decision.
15. For reversible low-level details, use the defaults in this plan and document deviations.
16. At the end of each milestone, report:
    - files added or changed;
    - requirements completed;
    - commands run;
    - test results;
    - screenshots or observations;
    - known limitations;
    - manual checks still required.

---

## 30. Recommended First Implementation Task

Build Milestone 0 and the narrowest possible Milestone 1 vertical slice:

1. Static shell and responsive layout.
2. Deterministic unit tests.
3. Save repository and recovery tests.
4. One walkable hub room.
5. One Quest 1 room.
6. One classification puzzle.
7. One reflection sequence.
8. One 6–12-word writing artifact.
9. One copy screen.
10. One printable Quest 1 preview.
11. Sequential browser verification.
12. Physical iPad smoke test before building Quest 2.

Do not start by implementing dashboards, all maps, rich animation, audio, multiple seed packs, or the final publishing sequence.
