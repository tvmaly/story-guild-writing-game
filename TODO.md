# The Story Guild — Resume TODO — 2026-09-04

Summary: The approved Quest 1 illustrated redesign is implemented. Complete the physical-iPad and child playtests before extending the course; deploy only when requested. Earlier milestone and deployment tasks remain historical context below.

Status: current; approved artwork, logic, UI, browser checks, and two-device Simulator checks complete; hands-on acceptance pending

Keywords: Story Guild TODO; resume session; next steps; Milestone 2; Lessons 2–8; physical iPad Safari test; GitHub Pages deployment; Quest 1; npm run verify; PLAN.md

## Current Priority: Playtest Pip and the Runaway Page

Source of truth: [QUEST_01_REDESIGN.md](QUEST_01_REDESIGN.md) and the 2026-09-04 accepted decision in `PLAN.md` supersede the old Quest 1 implementation instructions below.

- [x] Implement three connected scene activities and the bell/handle branch.
- [x] Replace movement controls with direct taps and illustrated-scene controls.
- [x] Add optional planning, exact story review, celebration before copying, and saved stories.
- [x] Import v1 saves into separate v2 storage while preserving originals and unfinished work.
- [x] Add local-voice narration and reproducible local sound effects.
- [x] Generate the first sleepy-book sample and display it in the real interface for owner review.
- [x] Pass 48 automated tests, strict TypeScript, and the production build.
- [x] Update the browser self-test and iPad Simulator runner for the new flow.
- [x] Receive the owner's artwork and interface approval on 2026-09-04.
- [x] Generate the nine remaining manifest images using the approved sample as the visual reference.
- [x] Finish scene reactions and visually align each hotspot with its generated prop.
- [x] Require `/?test=1` to show `ALL PASS` with every image loaded and zero runtime diagnostics.
- [x] Run the updated Simulator suite with `--local-only`; retain results and screenshots.
- [ ] Verify local voice playback, keyboard placement, rotation, resume, and printing on the physical iPad.
- [ ] Observe the child playtest: independent navigation, explaining two changes, original writing, pacing, and enjoyment.

Constraint: Do not treat the older August Simulator report as verification of the redesign. Current evidence is in `QUEST_01_REDESIGN.md`. Do not begin Quest 2 before the child playtest and physical-iPad gate; do not deploy without an explicit request.

## Historical Resume Procedure: Original Milestones 0–1 Baseline

Procedure: Read `TODO.md`, `PLAN.md`, `MILESTONE_01_REPORT.md`, and `tiny_tales_third_grade_homeschool.md` before changing code. Treat `NOTES.md` only as historical engineering guidance from another game.

Procedure: Inspect the uncommitted workspace before editing. At the time this TODO was created, the implementation and most supporting files were untracked; preserve all existing user and implementation work.

```sh
git status --short
npm ci
npm run verify
npm audit
npm run preview -- --port 4173
```

Expected: `npm run verify` passes 9 Vitest files and 28 tests, strict TypeScript passes, and the production build succeeds. `npm audit` reports zero vulnerabilities. Opening `http://127.0.0.1:4173/?test=1` displays `ALL PASS` with `document.body.dataset.testStatus === "pass"`.

Constraint: Use HTTP serving, not `file://`. Keep test data isolated under `storyGuild.test.*`; do not alter `storyGuild.save.v1` or `storyGuild.backup.v1` during automated tests.

## Historical TODO: Review, Commit, and Deploy Milestones 0–1

- [ ] Review the current diff and generated sprite asset before committing.
- [ ] Commit and push the Milestones 0–1 implementation and source documents to `main` when the owner approves the changes.
- [ ] In GitHub Settings → Pages, select **GitHub Actions** as the publishing source.
- [ ] Confirm `.github/workflows/pages.yml` completes its verify, build, upload, and deploy jobs.
- [ ] Open `https://tvmaly.github.io/story-guild-writing-game/?test=1` and confirm `ALL PASS`, no console errors, and no failed or remote runtime asset requests.
- [ ] Open the normal deployed URL and complete a Quest 1 smoke test without using the test API.

Expected: GitHub Pages serves the same relative-path build tested locally. The deployed runtime loads `config/game.json` and `assets/sprites/adventurer.png` from the repository subpath.

## Simulator Gate: Finish Deployment and Visual Checks

Completed evidence: On 2026-08-30, `npm run test:ios-sim` passed the complete local flow on `iPad (A16)` and the constrained-layout suite on `iPad mini (A17 Pro)`, using Xcode 26.6 and iOS Simulator 26.5. Evidence is in the ignored run directory `test-results/ios-simulator/2026-08-30T04-29-05Z/`.

Historical blocker: The August run failed only deployment parity because GitHub Pages did not contain `assets/index-B3WkWkjx.js`. This is historical evidence, not authorization to publish the current redesign.

- [x] Automate both required Simulator form factors through one npm command.
- [x] Verify onboarding, touch controls, Quest 1 classification and hints, reflection, writing, review, copy, completion, replay, deterministic state, reload/resume, background/resume, Parent Area hold behavior, accessibility persistence, and the native print sheet.
- [x] Save screenshots, JSON results, Markdown results, and Appium logs per run.
- [ ] Rerun `npm run test:ios-sim` after Pages deployment and require artifact parity plus Pages smoke tests on both devices.
- [ ] Manually tap the writing field in portrait and landscape and inspect software-keyboard placement and focus zoom; Appium text injection cannot prove keyboard appearance.
- [ ] Manually close and reopen the Safari tab and confirm the resume prompt restores the exact phase.
- [ ] Manually inspect portrait and landscape print-sheet page breaks and readability.
- [ ] Complete one normally paced Simulator lesson and note visible frame drops or touch delays.

Expected: A post-deployment run reports all automated checks passing, and the dated manual Simulator observations are added to `MILESTONE_01_REPORT.md` or a separate test report.

## Blocking Gate Before Quest 2: Physical iPad Safari Verification

Needs evidence: Record the physical iPad model, iPadOS version, Safari version, test date, and pass/fail result. Desktop Chromium and responsive emulation are not evidence for this gate.

- [ ] Launch the deployed game in normal Safari, not Private Browsing.
- [ ] Complete onboarding in portrait and confirm 16-pixel inputs do not trigger focus zoom.
- [ ] Tap each illustrated prop and its matching HTML button; test bell and handle on separate attempts.
- [ ] Confirm scrolling never accidentally activates a scene prop or learning choice.
- [ ] Rotate during exploration and verify the same scene, chosen branch, activity, and phase remain.
- [ ] Rotate during writing and verify the typed text remains and the focused field stays above the software keyboard.
- [ ] Background Safari during exploration and writing, then return and verify exact resume.
- [ ] Close and reopen the tab and verify the resume prompt restores the saved phase.
- [ ] Complete review and handwriting-copy navigation.
- [ ] Hold Grown-ups for 1.2 seconds and verify accidental taps do not enter Parent Area.
- [ ] Tap Hear it using a downloaded local English voice; verify mute-first effects and silent fallback.
- [ ] Open Print Preview and inspect the iPad print/share sheet, page breaks, story text, word count, and attribution.
- [ ] Test a complete normal lesson for visible frame drops, overheating, or touch delays.
- [ ] Record defects in `TODO.md` or a dated iPad test report, fix reproducible defects, and rerun `npm run verify` plus the affected device checks.

Decision: Do not start Quest 2 until the physical iPad smoke-test defects are resolved or the product owner explicitly changes this gate.

## Pre-Milestone-2 Hardening TODO

- [x] Add automated controller coverage proving a save commits before `STATE_COMMITTED` and duplicate pending taps produce only one transition.
- [ ] Add the remaining browser acceptance coverage for reload/resume specifically from reflection, review, and copy phases. The Simulator runner now covers deterministic reload/resume during puzzle, writing, and completion.
- [ ] Add browser coverage for corrupted-primary recovery and the unrecoverable primary-plus-backup confirmation flow.
- [x] Complete the development test API phase helpers needed for deterministic Quest 1 Simulator coverage.
- [x] Add Parent Area controls for 20% larger text and reduced motion, persist both settings, and cover them in unit and Simulator tests.
- [ ] Evaluate the non-failing Vite large-chunk warning for the locally bundled Phaser code. Optimize only if iPad loading or memory measurements show a real problem.

## Milestone 2 TODO: Implement Lessons 2–8

Dependency: Milestone 2 begins only after the physical iPad gate and the relevant hardening fixes pass.

### Milestone 2 Architecture and Shared Systems

- [ ] Replace Quest 1-specific orchestration with the data-driven `CourseCatalog`, generic `QuestEngine`, and reusable `PuzzleRegistry` boundaries required by `PLAN.md`.
- [ ] Implement and serialize reusable collection, sequence, choice-and-consequence, observation, and text-transformation puzzle controllers alongside classification.

### Milestone 2 Lessons 2–4

- [ ] Implement Quest 2, **The Four Rune Trail**, including compatible WHO/WHERE/WANT/TROUBLE choices and a three-to-five-sentence artifact.
- [ ] Implement Quest 3, **The Bridge of Wants**, including the character interview, three nonviolent obstacles, and four-to-seven-sentence artifact.
- [ ] Implement Quest 4, **The Three Doors of Time**, including ordered scene cards, missing-middle/ending checks, and a six-to-eight-sentence artifact.

### Milestone 2 Lessons 5–8

- [ ] Implement Quest 5, **The Sensory Caverns**, reopening Quest 4 work and preserving explicit verb replacement, sensory addition, and child-approved removal history.
- [ ] Implement Quest 6, **The Echo Bridge**, adding one or two useful dialogue lines with punctuation, surrounding action, and the child's reason for keeping each line.
- [ ] Implement Quest 7, **The Remix Ruins**, preserving source attribution, stay/change notes, remix axis, and a five-to-eight-sentence retelling.
- [ ] Implement Quest 8, **The Shrinking Tower**, including the story-heart statement, 45–55-word version, exact 25-word version, and optional exact six-word version.

### Milestone 2 Cross-Lesson Acceptance Work

- [ ] Preserve earlier attempts and allow the child to choose an earlier artifact for revision/remix without overwriting it.
- [ ] Add each lesson's exact copy policy, printable portfolio data, deterministic seeds, fixed-layout map, event-log reflection, hints, parent assist, reload coverage, and fast-completion fixture.
- [ ] Expand course-definition tests so Lessons 1–8 have complete prerequisites, writing steps, artifact schemas, validators, copy policies, and automated state paths.
- [ ] Run the complete Milestone 2 gate and write a dated completion report before starting Lesson 9.

## Milestone 3 TODO: Implement Capstone Lessons 9–12

- [ ] Implement one shared capstone artifact flowing from Lesson 9 through Lesson 12 without overwriting earlier drafts.
- [ ] Implement Lesson 9's six-part plan, 8–12-sentence long draft, displayed word count, exact resume, and six-planning-sentence copy policy.
- [ ] Implement Lesson 10's undoable, child-approved revision operations and exact 100-word validator.
- [ ] Implement Lesson 11's read-aloud marks, listener feedback, convention checks, title, two-to-four-sentence author's note, and continued exact 100-word validator.
- [ ] Implement Lesson 12's publishing choice, complete reflection, final copy, companion short version, restored book, portfolio, and certificate.
- [ ] Fast-complete all twelve lessons in isolated test storage and verify all pages, attempts, capstone links, copy policies, revisions, print sections, attribution, and backup recovery.
- [ ] Repeat desktop responsive checks and the complete physical iPad Safari checklist before declaring the complete release done.

## Deferred P1 TODO: Only After Complete-Release Approval

- [x] Add original sound effects through `public/config/game.json`; the accepted Quest 1 redesign moved effects into scope. Music remains deferred.
- [ ] Add PWA installation and an offline service worker.
- [ ] Add more seed packs, map variants, sprite animation, and portraits.
- [ ] Add downloadable JSON backup/restore and approved accessibility modes.
- [ ] Add the optional six-word challenge gallery.

Constraint: Do not add combat, weapons, enemies, health, lives, currency, loot, accounts, analytics, advertising, multiplayer, remote AI, speech recognition, handwriting recognition, a large open world, or a custom map editor.

## Current Configuration and Documentation Anchors

- Runtime character and sound manifest: `public/config/game.json`
- Runtime manifest schema: `public/config/game.schema.json`
- Primary implementation specification: `PLAN.md`
- Curriculum source: `tiny_tales_third_grade_homeschool.md`
- Completed automated evidence: `MILESTONE_01_REPORT.md`
- Build, test, deployment, and configuration instructions: `README.md`

Open decisions: None currently recorded. Ask the product owner and wait whenever a new implementation choice has more than one materially different outcome.
