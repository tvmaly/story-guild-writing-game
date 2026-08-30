# The Story Guild — Milestones 0 and 1 Completion Report — 2026-08-29

Summary: The strict TypeScript/Phaser foundation and the complete Quest 1 vertical slice are implemented. Automated unit, build, browser self-test, persistence, responsive-layout, Parent Area, and print-preview gates pass.

Status: automated gates passed; physical iPad Safari gate remains manual

Keywords: Story Guild Milestone 0; Story Guild Milestone 1; Quest 1 vertical slice; ALL PASS; iPad Safari manual verification; npm run verify; browser self-test; GitHub Pages

## Completed: Engineering Foundation

Implemented: Vite, strict TypeScript, Phaser 3.90.0, typed events, serialized actions, explicit state transitions, deterministic randomness, canonical word counting, runtime-validated configuration, localStorage backup/recovery, escaped print exporting, and isolated browser test mode.

Implemented: `public/config/game.json` configures character names, local sprite sheets, frame geometry, tint, scale, animation frames, and local sound cues. Sound is mute-first, requires a user gesture, persists its setting, supports source fallback, and makes no audio requests with the default empty cue map.

Implemented: The GitHub Pages workflow verifies the repository, builds `dist`, uploads the Pages artifact, and deploys from `main` after GitHub Pages is configured to use Actions.

## Completed: Quest 1 Vertical Slice

Implemented: onboarding, local profile, walkable Guild Hall, Quest Board, deterministic Archive Gate map, six-tablet story classification, retry feedback, two-attempt hints, event-based reflection, five-part planning, child-authored 6–12-word story entry, exact review, handwriting-copy mode, recovered page, replay preservation, resume, Parent Area, and printable Quest 1 portfolio.

Educational constraint: The application records and displays the child's wording but never generates, joins, or rewrites the final story sentence.

## Verification: Automated Results

Command: `npm run verify`

Expected and observed: 8 Vitest files passed with 26 tests; strict TypeScript passed; Vite 7.3.6 produced the production build. Vite reports a non-failing large-chunk warning because Phaser is bundled locally.

Command: `npm audit`

Expected and observed: 0 vulnerabilities after pinning patched Vite 7.3.6 and Vitest 3.2.7. Runtime-only audit also reports 0 vulnerabilities.

Procedure: The production build was served at `http://127.0.0.1:4173/`. Opening `/?test=1` set `document.body.dataset.testStatus` to `pass`, displayed `ALL PASS`, rendered a 320×240 WebGL Phaser canvas, loaded the runtime manifest, completed Quest 1, persisted copy completion, built exact print data, and left normal save keys untouched.

Observed: Browser error output was empty. Every application request returned HTTP 200, including `config/game.json` and the local sprite sheet. No favicon request or remote runtime asset request occurred.

Observed: A sequential UI walkthrough verified D-pad movement, Quest Board interaction, one incorrect classification, the hint after two incorrect attempts, correct recovery, reload/resume with seed `24680`, exact preservation of a nine-word draft, review, copy, completion, the 1.2-second Parent Area hold, print content, and the Print button handler.

Observed responsive layouts: 1024×768 landscape, 768×1024 portrait, and 390×844 narrow portrait had no horizontal overflow. Exploration/puzzle layouts kept controls visible; writing and copy modes hid game motion and fit without scrolling at 390×844.

## Manual Gate: Physical iPad Safari

Outstanding: Record the iPad model and iPadOS version, then verify portrait/landscape launch, D-pad touch reliability, action taps, no page scroll during exploration, rotation state retention, software-keyboard visibility, lack of input zoom, background/resume, tab close/reopen, print/share page breaks, reduced motion, large text, and normal-lesson performance/temperature.

Constraint: Desktop Chromium automation does not prove physical Safari touch, audio unlock, browser-chrome resizing, or print/share behavior.

## Deferred by Approved Scope

Deferred: Quest 2 through Quest 12 gameplay, bundled sound effects or music, PWA/offline installation, and parent-facing character editing remain outside Milestones 0 and 1.
