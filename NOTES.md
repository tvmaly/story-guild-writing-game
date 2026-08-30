# Block Blaster Multiplication — Single-Page 2D Game Build Notes

Summary: These notes capture issues encountered while turning `PLAN.md` into a single-file 2D Phaser game in `index.html`. Use this document to improve future prompts for AI agents building static browser games in one HTML file.

Status: current

Keywords: Block Blaster Multiplication; single page game; single HTML game; Phaser 3.90.0; static GitHub Pages; browser self-test; iPad Safari; localStorage; 2D game implementation notes; AI agent prompt guidance

## Constraint: A Large Product Plan Is Hard To Finish As A True MVP In One Pass

Issue: The original `PLAN.md` specified a full game, adaptive learning engine, mastery model, shop, maps, dashboard, responsive UI, audio, storage recovery, interrupted-session recovery, and deterministic tests. That is a large scope for one single-page implementation pass.

Effect: The implementation can satisfy the broad shape of the plan, but details risk becoming shallow. Complex systems such as adaptive scheduling, delayed mastery, charts, recovery, and Phaser effects need focused iteration after the first build.

Recommendation: For future games, split the plan into explicit MVP and P1 sections. Mark each requirement as `must implement fully`, `simple MVP version acceptable`, or `placeholder allowed`. This prevents an AI agent from over-compressing deep mechanics into thin code.

## Constraint: Single-File HTML Makes Code Organization Fragile

Issue: Keeping all HTML, CSS, and JavaScript in `index.html` avoids a build system and works well for GitHub Pages, but it creates a long file where UI, storage, tests, rendering, and game logic are tightly packed.

Effect: Small mistakes in event ordering, global state, or screen transitions are harder to isolate. Browser-only bugs are also harder to unit test without exporting modules.

Recommendation: Future single-file plans should still require internal structure: one IIFE, a frozen config object, named classes, an event bus, and a `?test=1` test harness. The prompt should also require comments that identify major sections such as config, storage, mastery, scheduler, UI, Phaser scene, and tests.

## Issue: Browser Automation Can Race Touch And Click Interactions

Issue: During verification, parallel browser commands for keypad click and FIRE click raced each other. The answer display looked filled, but the retrieval counters did not change until the interaction was repeated sequentially.

Effect: A test can falsely suggest a game logic bug when the real issue is automation timing.

Recommendation: Future verification instructions should require sequential interaction tests: wait for prompt, click/type answer, verify answer display, click FIRE, wait for animation, then inspect storage and feedback. Avoid parallel browser actions for gameplay input.

## Issue: Phaser May Use WebGL Instead Of Canvas 2D

Issue: A canvas pixel check attempted to call `getContext("2d")`, but Phaser selected WebGL through `Phaser.AUTO`, so the 2D context was unavailable.

Effect: A naive canvas test failed even though the Phaser scene was rendered.

Recommendation: Future game plans should specify WebGL-safe rendering checks. Good checks include confirming a canvas exists, checking its dimensions, taking a screenshot, or using `canvas.toDataURL()` length as a nonblank smoke signal. Do not assume `getContext("2d")` works when Phaser uses WebGL.

## Issue: Local Static Server May Need Environment Permission

Issue: Starting `python3 -m http.server 4173` initially failed with a port binding permission error in the managed sandbox.

Effect: Verification required rerunning the same local server command with approval.

Recommendation: Future instructions should name a static-server command and allow the agent to use an alternate port or request permission when sandboxed networking prevents binding. The plan should not rely on opening `file://` URLs because CDN loading, localStorage origins, and browser behavior differ from HTTP serving.

## Issue: Missing Favicon Creates Avoidable 404 Noise

Issue: Browser verification produced `/favicon.ico` 404 requests even though the app itself loaded correctly.

Effect: The 404 noise can distract from real broken asset requests.

Recommendation: For single-file games with no asset folder, include `<link rel="icon" href="data:,">` in the HTML head. This avoids a missing favicon request while preserving the no-assets constraint.

## Issue: Test Mode Needs To Cover Edge Cases The UI May Not Reach Quickly

Issue: The built-in `?test=1` suite found a scheduler edge case: a new profile could exhaust the quick-mission new-family limit during a tight deterministic loop and leave no candidates.

Effect: The normal UI might not expose this immediately, but the scheduler could fail under unusual or long-running sessions.

Recommendation: Require `?test=1` before complex UI verification. Include tests for empty candidate pools, repetition rules, new-item limits, storage default completeness, and state transitions that need multiple sessions or multiple calendar days.

## Issue: Physical iPad Safari Testing Cannot Be Replaced By Desktop Chrome

Issue: The project target is iPad Safari, but the available automated verification used desktop Chrome through `agent-browser`.

Effect: Desktop checks can verify layout breakpoints, console health, storage, and basic gameplay, but they do not prove Safari touch behavior, audio unlock behavior, browser chrome resizing, or real iPad performance.

Recommendation: Future plans should separate `automated verification` from `manual device verification`. The README or checklist should explicitly say which iPad Safari checks remain manual: portrait, landscape, rotation, touch targets, no scroll during mission, audio after tap, hidden-tab timing, and reload recovery.

## Recommendation: Add Agent-Facing Acceptance Tests To The Plan

Procedure: Include concrete acceptance commands and expected observations in future `PLAN.md` files.

Example:

```text
1. Serve with python3 -m http.server 4173.
2. Open http://127.0.0.1:4173/?test=1.
3. Expected: page shows ALL PASS and browser page errors are empty.
4. Open http://127.0.0.1:4173/.
5. Expected: first-launch screen shows callsign input and Start Recon Mission button.
6. Start recon, answer one prompt correctly, and verify localStorage activeSession.retrievalAttempts increments.
7. Submit one wrong answer, verify copy says "Almost — A × B = C", then enter C and verify correction does not increment retrievalAttempts.
```

Rationale: Explicit command-level acceptance criteria reduce ambiguity and make it easier for an AI agent to find implementation defects before final response.

## Recommendation: Keep Future Game Specs Smaller At The First Milestone

Decision: A future first milestone should prioritize one playable loop, persistence, and tests before adding dashboards, shops, unlock trees, and long-term progression.

Suggested MVP order: static shell, deterministic tests, one mission type, one target scene, one correct path, one wrong/correction path, localStorage persistence, then responsive hardening.

Suggested P1 order: adaptive scheduler, mastery dashboard, shop/economy, map unlocks, interrupted-session recovery, charts, and richer procedural effects.
