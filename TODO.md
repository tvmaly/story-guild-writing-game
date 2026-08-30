# The Story Guild — Resume TODO — 2026-08-29

Summary: Resume The Story Guild by preserving the completed Milestones 0–1 vertical slice, deploying and testing it on a physical iPad, then implementing Milestone 2 Lessons 2–8 before starting the capstone. This file lists unfinished work in required order.

Status: current; Milestones 0–1 automated checks pass, but the physical iPad and GitHub Pages gates remain unfinished

Keywords: Story Guild TODO; resume session; next steps; Milestone 2; Lessons 2–8; physical iPad Safari test; GitHub Pages deployment; Quest 1; npm run verify; PLAN.md

## Resume Procedure: Establish the Current Baseline

Procedure: Read `TODO.md`, `PLAN.md`, `MILESTONE_01_REPORT.md`, and `tiny_tales_third_grade_homeschool.md` before changing code. Treat `NOTES.md` only as historical engineering guidance from another game.

Procedure: Inspect the uncommitted workspace before editing. At the time this TODO was created, the implementation and most supporting files were untracked; preserve all existing user and implementation work.

```sh
git status --short
npm ci
npm run verify
npm audit
npm run preview -- --port 4173
```

Expected: `npm run verify` passes 8 Vitest files and 26 tests, strict TypeScript passes, and the production build succeeds. `npm audit` reports zero vulnerabilities. Opening `http://127.0.0.1:4173/?test=1` displays `ALL PASS` with `document.body.dataset.testStatus === "pass"`.

Constraint: Use HTTP serving, not `file://`. Keep test data isolated under `storyGuild.test.*`; do not alter `storyGuild.save.v1` or `storyGuild.backup.v1` during automated tests.

## Immediate TODO: Review, Commit, and Deploy Milestones 0–1

- [ ] Review the current diff and generated sprite asset before committing.
- [ ] Commit and push the Milestones 0–1 implementation and source documents to `main` when the owner approves the changes.
- [ ] In GitHub Settings → Pages, select **GitHub Actions** as the publishing source.
- [ ] Confirm `.github/workflows/pages.yml` completes its verify, build, upload, and deploy jobs.
- [ ] Open `https://tvmaly.github.io/story-guild-writing-game/?test=1` and confirm `ALL PASS`, no console errors, and no failed or remote runtime asset requests.
- [ ] Open the normal deployed URL and complete a Quest 1 smoke test without using the test API.

Expected: GitHub Pages serves the same relative-path build tested locally. The deployed runtime loads `config/game.json` and `assets/sprites/adventurer.png` from the repository subpath.

## Blocking Gate Before Quest 2: Physical iPad Safari Verification

Needs evidence: Record the physical iPad model, iPadOS version, Safari version, test date, and pass/fail result. Desktop Chromium and responsive emulation are not evidence for this gate.

- [ ] Launch the deployed game in normal Safari, not Private Browsing.
- [ ] Complete onboarding in portrait and confirm 16-pixel inputs do not trigger focus zoom.
- [ ] Test every D-pad direction and the ACTION button with touch.
- [ ] Confirm the page does not scroll during hub or quest exploration.
- [ ] Rotate during exploration and verify the same player position, seed, tablet state, and phase remain.
- [ ] Rotate during writing and verify the typed text remains and the focused field stays above the software keyboard.
- [ ] Background Safari during exploration and writing, then return and verify exact resume.
- [ ] Close and reopen the tab and verify the resume prompt restores the saved phase.
- [ ] Complete review and handwriting-copy navigation.
- [ ] Hold the Parent Alcove control for 1.2 seconds and verify accidental taps do not enter.
- [ ] Open Print Preview and inspect the iPad print/share sheet, page breaks, story text, word count, and attribution.
- [ ] Test a complete normal lesson for visible frame drops, overheating, or touch delays.
- [ ] Record defects in `TODO.md` or a dated iPad test report, fix reproducible defects, and rerun `npm run verify` plus the affected device checks.

Decision: Do not start Quest 2 until the physical iPad smoke-test defects are resolved or the product owner explicitly changes this gate.

## Pre-Milestone-2 Hardening TODO

- [ ] Add automated controller coverage proving a save commits before `STATE_COMMITTED` and duplicate pending taps produce only one transition.
- [ ] Add browser acceptance coverage for reload/resume from puzzle, reflection, review, and copy phases; writing reload was manually verified but should become deterministic automation.
- [ ] Add browser coverage for corrupted-primary recovery and the unrecoverable primary-plus-backup confirmation flow.
- [ ] Complete the development test API phase helpers instead of leaving `moveToPhase` limited to the current Quest 1 shortcuts.
- [ ] Decide with the product owner whether the existing `large` text and `reducedMotion` save settings need user-facing controls before Milestone 2. Do not invent the UI without asking.
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

- [ ] Add original sound effects or music files through `public/config/game.json`; keep mute-first behavior and test iPad gesture unlocking.
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

Open decision: The only known product decision to ask before Milestone 2 is whether large-text and reduced-motion settings require user-facing controls in the next milestone. Ask the product owner and wait for the answer before implementing that UI.
