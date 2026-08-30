# The Story Guild: Twelve Quests

Summary: The Story Guild is a local-first iPad Safari adventure game that helps a third-grade student write complete micro stories. The current release contains the engineering foundation and the complete Quest 1 vertical slice.

Status: Milestones 0 and 1 implementation

Keywords: Story Guild writing game; micro stories; Quest 1; iPad Safari; Phaser; Vite; TypeScript; GitHub Pages; sprite configuration; audio configuration

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

## Character and Sound Configuration

Decision: Developer-editable character sprites and audio cues live in `public/config/game.json`. Paths are relative to the application root and must point to local files under `public/`.

Character entries define the display name, sprite-sheet URL, frame size, scale, optional tint, and directional animation frame arrays. Audio cue entries accept one or more local source files, volume, and optional looping. Sound is mute-first and begins only after the user taps the sound control.

Constraint: The default audio cue map is empty, so the application makes no audio requests. Add local files under `public/assets/audio/` before adding cue paths.

Expected: Invalid manifest data falls back to safe built-in character defaults and appears as a configuration notice in the Parent Area.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` runs verification, builds `dist`, and deploys it from `main`. In repository Settings → Pages, select **GitHub Actions** as the publishing source.

Expected project URL: `https://tvmaly.github.io/story-guild-writing-game/`

## Physical iPad Safari Checklist

Manual verification must record the iPad model and iPadOS version. Check portrait and landscape onboarding, D-pad movement, the action button, rotation without state loss, keyboard visibility, input zoom, background/resume, reload recovery, copy navigation, Parent Area hold entry, and print/share preview.

Constraint: Desktop screenshots and browser automation do not prove physical iPad compatibility.

## Code and Course-Content Licensing

Source code uses the MIT license in `LICENSE`. Course-derived content uses CC BY-NC-SA 4.0 as documented in `LICENSE-CONTENT.md`.
