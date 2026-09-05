# Story Guild — Pip and the Runaway Page — Quest 1 Redesign

Summary: This document records the approved Quest 1 redesign, implemented behavior, artwork review checkpoint, and remaining acceptance work.

Status: Quest 1 implemented with approved artwork; browser and two-device Simulator checks pass. Physical-iPad and child playtests remain before release. No deployment performed.

Keywords: Story Guild; Pip and the Runaway Page; illustrated adventure; Quest 1; optional planning; six to twelve words; local narration; save migration; iPad Safari; artwork approval; child playtest

## Accepted Product Decisions — 2026-09-04

Decision: Build one connected illustrated magical-library adventure before extending the twelve-lesson course. The child is eight, plays mostly independently, and should spend approximately 10–15 minutes playing and writing before copying onto paper.

Decision: Use original generated illustrations, device read-aloud, gentle local effects, optional five-part planning, and a child-authored 6–12-word story. Celebrate the child's approved words immediately; award the recovered page only after the child confirms handwriting.

Constraint: The game does not generate or rewrite student sentences, evaluate creativity, punish incorrect answers, impose a timer, or use runtime AI. Keep the source curriculum's educational objectives, word-count policy, attribution, local saving, and print export.

## Implemented Adventure and Writing Flow

| Scene | Interaction | Consequence and memory |
|---|---|---|
| The sleepy book | Tickle the feather bookmark. | The book sneezes; the trapped page flies onto a shelf. |
| The tall bookshelf | Ring the bell or turn the handle. | The bell unfolds book stairs; the handle lifts a book cart. The page flutters into an ink puddle. |
| The paper boat | Wave the fan. | The folded page sails to the dry desk and opens for writing. |

Implementation: Each scene moves through interaction, description/story comparison, identifying the changed object, and a resolved scene. The chosen bookshelf branch controls its teaching text, remembered events, image key, and print summary. Comparisons have deterministic choice order. Help is available on request and after two errors; demonstrations record assistance without displaying grades.

Implementation: Writing uses a real HTML textarea with live word counting and 500-ms autosave. The picture recap stays available. Five planning fields are optional and editable. Final review, celebration, copying, saved stories, and printing preserve the child's exact story, including whitespace. Completed stories cannot be overwritten through the edit flow.

Implementation: Real HTML buttons mirror scene hotspots. The interface uses warm paper backgrounds, teal controls, prominent headings, direct instructions, and a reduced-motion setting. Phaser renders a 1024×768 illustrated stage and reuses its scene objects instead of rebuilding the world after each save.

## Approved Artwork and Scene Reactions

Decision: The approved plan requires owner feedback on one sample in the actual interface before producing the remaining images. The sample is `public/assets/storybook/sleepy-book-before.png`. It was generated with the built-in imagegen tool and copied into the project; the original remains at `/Users/tmaly/.codex/generated_images/01a06e6e-1649-74b1-8154-aa27d56ce1ef/exec-dafb0ce1-bdf6-4a58-bf6f-1e6718662801.png`.

Evidence: The first sample was shown in the real 1180×820 interface at `/tmp/storybook-sample-ipad.png`. That historical preview used a temporary crop for the Pip badge; the finished interface uses the generated transparent portrait `public/assets/storybook/pip.png`.

Generation prompt: Create one polished hand-painted gouache illustration for an eight-year-old's iPad story adventure. Show a cozy golden wooden library, a sleepy expressive plum book trapping a blank page, a clearly visible coral feather bookmark, and Pip: a small teal library dragon with amber glasses, tiny wings, and a mustard satchel. Keep Pip and the book large, preserve a tall bookshelf on the right, use crisp rounded silhouettes, and leave uncrowded margins. Compose for a 4:3 stage. Include no text, interface controls, watermark, pixel art, or recognizable copyrighted characters.

Decision: On 2026-09-04 the owner approved the sample and interface: “yes the artwork and design work for me”. The remaining nine images were generated only after this approval.

Implementation: All ten PNGs are now bundled in `public/assets/storybook/`. The eight 4:3 scenes share the approved gouache library and Pip design; `pip.png` and `page.png` have alpha transparency. [STORYBOOK_ARTWORK.md](STORYBOOK_ARTWORK.md) records the saved paths and generation prompts. Hotspots were aligned to the painted props. Recap, picture choice, and keepsake views show whole scenes so the changed objects are not cropped away.

Implementation: Each freshly tapped scene action has a short before/after dissolve with a directional reaction: sneeze curls and a rising page, a bell pulse and ascending book-stair sparkles, vertical cart-lift sparkles, or fan breezes and a sailing/unfolding page. Final pictures visibly change the book's expression, Pip's pose and height, or the boat's position. Motion settles for reading, stops on navigation, and is disabled by either the game or system reduced-motion setting. Resume and help do not replay reactions.

## Persistence, Narration, and Compatibility

Implementation: `SaveRepository` writes `storyGuild.save.v2` and `storyGuild.backup.v2`. When v2 is absent, the repository imports a valid v1 primary or backup, leaving the original values intact. A migration marker prevents a deliberate reset from resurrecting old progress. Corrupt v2 data follows v2 backup recovery rather than silently replacing current work with an older v1 save.

Implementation: Existing legacy attempts preserve their phase, classifications, text, and copying status. Refreshed card-based views remove the need for walking. Legacy reflection selects an actual correctly classified story, rather than whichever card happened to be sorted last. Parent Area can resume any unfinished saved attempt.

Implementation: `NarrationService` explicitly selects an available local English voice and handles delayed voice lists, cancellation, and unavailable speech. Narration is requested by tapping Hear it. No remote default voice is used. The text remains visible if speech fails. Sound effects are original, local WAV files reproducible with `node scripts/generate-storybook-audio.mjs`.

## Verification Evidence and Remaining Gates

Evidence: `npm run verify` passed 48 tests across 12 files, strict TypeScript checking, and a production build on 2026-09-04. The existing non-failing Phaser bundle-size warning remains. `npm install` audited 57 packages with zero vulnerabilities. Node type definitions were added for the asset-file tests.

Evidence: Chromium's `/?test=1` passed all 11 checks, including all ten illustrated assets and zero runtime diagnostics. A separate direct-control walkthrough followed the feather, bell, and fan through all three scenes, typed an original story with leading/trailing/repeated spaces, reviewed the exact text, selected the boat illustration, celebrated, reloaded, and resumed the exact celebration. Normal-mode boot exposes no test mutation API.

Automated coverage: Both bookshelf branches; correct memories and export; optional planning; word-count boundaries; whitespace preservation; assistance; concurrent scene taps; save-before-event ordering; failed-save rollback; celebration reload; handwriting completion; replay preservation; legacy continuation; resuming earlier attempts; delayed/missing/local-only voices; safe configuration paths; v1 import and reset behavior.

Evidence: The browser suite confirms both current and legacy normal save keys remain untouched. Added regression coverage verifies repeated self-test runs resume safely and reopening a copied page preserves the original completion dates.

Evidence: The final `--local-only` Simulator suite passed on iPad (A16) and iPad mini (A17 Pro), Xcode 26.6 / iOS Simulator 26.5. The run at `test-results/ios-simulator/2026-09-05T01-36-35Z/` covers direct controls, hints, the handle branch, branch reload, writing autosave, rotation, background/resume, celebration before award, copying, replay preservation, Parent Area hold, larger text, reduced motion, exact print text, and the native print sheet. UTC report dates are September 5; local test date is September 4.

Evidence: Native print screenshots exposed extra pages and dark gradient practice lines. After correction, the complete Simulator suite passed again; the native preview shows two clean pages, with ruled borders and credits beside the story. Screenshots wait for Safari's rendered frame and page-reveal animation, rather than recording the previous screen immediately after a DOM transition.

Evidence: A Chromium reaction check observed `sleepy-sneeze` settling to `idle`, a single persistent canvas before/after the action, and zero diagnostics. With system reduced motion enabled, choosing the handle retained the branch and stayed `idle` throughout.

Constraint: One earlier run lost its browser/Simulator connections when the laptop slept. That run is not passing evidence. Later runs use `caffeinate -i` only for the duration of the test process. Deployment parity and Pages smoke checks were intentionally omitted; no deployment was requested or performed.

Needs evidence: Physically verify iPad touch targets, local voice playback, keyboard visibility, rotation, background/resume, reload, reduced motion, larger text, and print/share layout. Existing device tests for the earlier game do not establish compatibility of this redesign.

Constraint: WebDriver typing checks focus, scale, persistence, and layout; it does not summon or verify the actual iPadOS software keyboard. The Simulator screenshots are visual preflight evidence, not a substitute for the physical-device and child observations.

Acceptance: Observe the child finding the next action with no more than two adult navigation prompts, explaining changes in at least two scenes, writing an original 6–12-word story with optional support, reaching handwriting in roughly 10–15 minutes without rushing, and identifying an enjoyable part plus any confusing part. Adjust Quest 1 from those observations before implementing further lessons.
