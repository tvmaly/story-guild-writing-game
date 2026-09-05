# The Story Guild: Twelve Quests

Summary: The Story Guild is a local-first iPad Safari game that helps an eight-year-old write micro stories. The current development branch redesigns Quest 1 as **Pip and the Runaway Page**, an illustrated adventure with direct taps and optional writing support.

Status: Quest 1 implemented with owner-approved artwork. All 48 automated tests, strict TypeScript, production build, browser self-tests, and both local iPad Simulator suites pass. Physical-iPad and child playtests remain; the redesign has not been deployed.

Keywords: Story Guild writing game; micro stories; Quest 1; iPad Safari; Phaser; Vite; TypeScript; GitHub Pages; sprite configuration; audio configuration

## Current Quest 1 Redesign

Decision: The current specification and evidence are in [QUEST_01_REDESIGN.md](QUEST_01_REDESIGN.md). The redesign introduces three connected library puzzles, an optional five-part planner beside the story box, local English read-aloud, gentle sound effects, and an illustrated celebration before handwriting.

Artwork: All ten illustrations are bundled locally, with distinct before/after scenes and both bookshelf choices. [STORYBOOK_ARTWORK.md](STORYBOOK_ARTWORK.md) records the built-in imagegen prompts and saved asset paths. The game does not call generative AI during play. Quest 1 is ready for a supervised first child playtest.

Persistence: Normal saves use `storyGuild.save.v2` and `storyGuild.backup.v2`. On first use, a valid v1 primary or backup is imported while both original v1 values remain intact. Existing unfinished attempts resume through card-based legacy views. Resetting v2 progress suppresses re-import; it does not erase the preserved v1 originals.

## Development Setup and Verification

Requirement: Use a current Node.js LTS release and npm.

```sh
npm ci
npm run verify
npm run dev
```

Open the URL printed by Vite. Browser self-tests run automatically at `/?test=1` and display `ALL PASS` only after every browser test succeeds.

For deterministic manual harness work without autorunning the suite, use `/?test=1&autorun=0`. This mode still uses only the isolated `storyGuild.test.*` storage keys.

For a production check:

```sh
npm run build
python3 -m http.server 4173 -d dist
```

Open `http://127.0.0.1:4173/?test=1`. Do not open `dist/index.html` with `file://`.

## iPad Simulator Verification

Purpose: `npm run test:ios-sim` runs the current Quest 1 production build through Mobile Safari on two Xcode simulators. It covers the complete local quest lifecycle on `iPad (A16)`, constrained portrait/landscape behavior on `iPad mini (A17 Pro)`, and GitHub Pages smoke tests only after the deployed files match the local `dist` files byte for byte.

Requirement: Install Xcode with an iOS Simulator runtime, Node.js, Appium, and Appium's XCUITest driver. The verified toolchain on 2026-08-30 was Xcode 26.6, iOS Simulator 26.5, Appium 3.7.0, and XCUITest driver 12.8.2.

```sh
npm install --global appium
appium driver install xcuitest
appium driver list --installed
xcrun simctl list devices available
npm run test:ios-sim
```

Expected devices: The default simulator names are `iPad (A16)` and `iPad mini (A17 Pro)`. Override them when equivalent installed devices use different names:

```sh
IOS_SIM_PRIMARY="iPad (A16)" IOS_SIM_SECONDARY="iPad mini (A17 Pro)" npm run test:ios-sim
```

Expected result before deployment: Both local device suites pass, while the command exits nonzero at the GitHub Pages artifact-parity gate if the current build has not been committed, pushed, and deployed. After deployment finishes, rerun the same command; parity and the two Pages smoke suites must also pass.

Artifacts: Each run writes an ignored directory under `test-results/ios-simulator/` containing `results.md`, `results.json`, screenshots, and process logs. The runner shuts down only simulators that it booted, uses isolated `storyGuild.test.*` storage for mutation helpers, and never exposes those helpers at the normal URL.

Manual simulator checks: Use the saved screenshots as checkpoints, then manually tap the writing field to inspect actual software-keyboard placement, close and reopen a Safari tab, inspect portrait and landscape print page breaks, and complete one normally paced lesson for visible frame drops. WebDriver text injection does not itself summon the iPadOS software keyboard.

Constraint: Simulator evidence is useful preflight evidence, but it does not replace the physical-iPad Safari checklist below.

Redesign verification: The runner now exercises direct scene taps, both learning activity types, the bookshelf choice, optional planning, celebration before handwriting, and v2 persistence. Historical 2026-08-30 passes apply to the earlier game only. Run the updated local suite before deployment:

```sh
npm run test:ios-sim -- --local-only
```

Decision: `--local-only` explicitly omits deployment parity and Pages smoke checks. Without the flag, deployment parity remains required.

## Character and Sound Configuration

Decision: Developer-editable character sprites and audio cues live in `public/config/game.json`. Paths are relative to the application root and must point to local files under `public/`.

Character entries define the display name, sprite-sheet URL, frame size, scale, optional tint, and directional animation frame arrays. Audio cue entries accept one or more local source files, volume, and optional looping. Sound is mute-first and begins only after the user taps the sound control.

Implementation: The manifest includes original local WAV effects. Reproduce them with `node scripts/generate-storybook-audio.mjs`. Tap-to-hear uses a separate service that selects only local English speech voices; missing or unavailable speech never blocks writing.

Implementation: `storybook.images` maps scene backgrounds, reaction pictures, Pip, and the moving page to local image paths. Every required picture must exist before the browser asset gate passes. Images contain no instructional text; the interface uses real HTML controls and inputs.

Expected: Invalid manifest data falls back to safe built-in character defaults and appears as a configuration notice in the Parent Area.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` runs verification, builds `dist`, and deploys it from `main`. In repository Settings → Pages, select **GitHub Actions** as the publishing source.

Expected project URL: `https://tvmaly.github.io/story-guild-writing-game/`

## Physical iPad Safari Checklist

Manual verification must record the iPad model and iPadOS version. Check portrait and landscape onboarding, all picture hotspots, both bookshelf branches, local read-aloud and effects, rotation without state loss, software-keyboard visibility, input zoom, background/resume, reload recovery, copy navigation, Parent Area hold entry, and print/share preview.

Constraint: Desktop screenshots and browser automation do not prove physical iPad compatibility.

## Code and Course-Content Licensing

Source code uses the MIT license in `LICENSE`. Course-derived content uses CC BY-NC-SA 4.0 as documented in `LICENSE-CONTENT.md`.
