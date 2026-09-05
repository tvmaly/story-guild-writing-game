# Story Guild — Approved Artwork and Generation Prompts

Summary: This record identifies the ten bundled illustrations, their reference images, generation prompts, and owner approval for Pip and the Runaway Page.

Status: current; artwork style and interface approved by the owner on 2026-09-04; all ten PNG assets generated and integrated.

Keywords: Story Guild artwork; Pip; gouache; imagegen; transparent sprites; generated illustrations; prompt provenance; public/assets/storybook

## Approval, Tool, and Saved Assets

Decision: The owner approved the sleepy-book sample and actual interface with “yes the artwork and design work for me” before the remaining nine images were generated.

Implementation: All images were generated using the built-in imagegen tool, not the CLI/API fallback. Final project assets are in `public/assets/storybook/`; the runtime uses only these local copies. Original generation outputs were retained under `/Users/tmaly/.codex/generated_images/01a06e6e-1649-74b1-8154-aa27d56ce1ef/`.

Evidence: Eight scenes are 1448×1086 (4:3). Pip and the page are square PNGs with alpha transparency. The bundled-artwork tests verify file signatures, dimensions, alpha format, and manifest alignment. Hotspots were adjusted to the actual generated prop locations rather than the requested coordinates.

Constraint: Generated illustrations contain no instructional text. Prompts and original file paths are development provenance only; no generation or network AI call occurs during play. The first sample prompt below is the recorded normalized brief; remaining entries preserve the submitted prompts.

## sleepy-book-before.png

Asset: `public/assets/storybook/sleepy-book-before.png`. Reference: `No image reference; original style sample`.

Prompt: Create one polished hand-painted gouache illustration for an eight-year-old's iPad story adventure. Show a cozy golden wooden library, a sleepy expressive plum book trapping a blank page, a clearly visible coral feather bookmark, and Pip: a small teal library dragon with amber glasses, tiny wings, and a mustard satchel. Keep Pip and the book large, preserve a tall bookshelf on the right, use crisp rounded silhouettes, and leave uncrowded margins. Compose for a 4:3 stage. Include no text, interface controls, watermark, pixel art, or recognizable copyrighted characters.

## sleepy-book-after.png

Asset: `public/assets/storybook/sleepy-book-after.png`. Reference: `sleepy-book-before.png`.

Prompt: Use case: precise-object-edit. Asset type: 4:3 children's illustrated game scene AFTER an action. Input image is the edit target. Preserve the exact camera, warm gouache style, wood library, rounded window left, large plum book lower left, and Pip the small teal dragon with round amber glasses and mustard satchel at right. Change the action: Pip holds the coral feather up and tickles the plum book; the book is now sneezing comically with eyes scrunched and a big open mouth, a gentle curling puff of air. The single blank cream page that was trapped UNDER the book has been blown free and is floating near the upper-right bookshelf at 74% across and 22% down. Remove the formerly trapped page under the book. Keep the feather, book, Pip, shelves and window in the same general positions. Playful, friendly, no frightening expression. Same 4:3 dimensions/composition. No writing, letters, UI, logos, watermark.

## bookshelf-before.png

Asset: `public/assets/storybook/bookshelf-before.png`. Reference: `sleepy-book-before.png`.

Prompt: Use case: illustration-story. Asset type: 4:3 illustrated iPad game scene, one image only. Input image is a STYLE and CHARACTER reference, not the scene to copy. Make a closer view of the tall curving bookshelves in the same warm magical library. Preserve Pip exactly: small teal library dragon, round amber glasses, tiny wings, mustard leather satchel, friendly hand-painted gouache texture. Pip stands near lower center looking wistfully up at a single blank cream page perched on a tall shelf at 74% across, 22% down. Two clear tappable props: a large brass hand bell resting on a low book stack at 24% across,60% down; a large round winding crank with wooden grip attached to a low wheeled book cart at 76% across,73% down. The empty cart is low to the floor ready to lift Pip; books remain neatly on shelves; NO book stairs yet. Leave open space through the middle for stairs in a later frame. Shelves extend on right, golden afternoon light from left, cream gold teal coral palette. Large clear props and charming thoughtful Pip, no text, labels, interface, logos or watermark. Match reference illustration fidelity. 4:3 landscape.

## paper-boat-before.png

Asset: `public/assets/storybook/paper-boat-before.png`. Reference: `sleepy-book-before.png`.

Prompt: Use case: illustration-story. Asset type: one 4:3 iPad game scene. Input image is a style and character reference. New close view of the writing desk in this same cozy golden magical wooden library, hand-painted gouache, warm cream, gold, teal and coral. Keep Pip exactly the same small teal dragon with amber round spectacles, tiny wings, mustard satchel. Show a very shallow teal-blue ink puddle spreading across the middle of a wide wooden DESKTOP. One little clean cream paper boat floats in the puddle at 46% across,66% down. Pip stands to the left of the desk watching it; beside his paw is a large obvious coral folding hand-fan centered 24% across,62% down, ready to pick up. At right, the desk is clean and DRY, clear space around 73% across,60% down for the boat to arrive in a later image. A squat dark teal ink bottle rests still on the desk at 88% across,37% down. Golden shelves softly behind. No other loose pages or boats. All action on one tabletop, not a dangerous flood. Same childlike funny mood and polished storybook rendering as reference, large clear props, eye level three-quarter diorama camera. No text, letters, labels, logos, interface or watermark.

## library.png

Asset: `public/assets/storybook/library.png`. Reference: `sleepy-book-before.png`.

Prompt: Use case: illustration-story. Asset type: one 4:3 welcome illustration for an 8-year-old's iPad game. Reference is the approved art style and Pip character design. Draw a welcoming wider view of this magical wooden library with rounded sunlit window left, golden curved bookshelves right and cozy desk centered. Pip, exactly the same charming teal small dragon, round amber glasses, tiny wings, mustard satchel, stands large in foreground right, smiling and waving toward the viewer inviting them to join. A blank open cream storybook sits on the desk to left. A coral feather bookmark rests beside it. Warm detailed hand-painted gouache, cream gold teal coral green palette, delightful but uncluttered. This is the same library, same Pip. No labels, writing, letters, logos, interface or watermark.

## pip.png

Asset: `public/assets/storybook/pip.png`. Reference: `sleepy-book-before.png`.

Prompt: Use case: background-extraction. Asset type: single transparent character portrait for an iPad game's guide badge. Input image is the character design reference. Show ONLY Pip, the friendly small teal library dragon with expressive warm green eyes behind round amber spectacles, tiny wings and mustard satchel strap, smiling directly at viewer, one little paw waving. Head and shoulders composition with face large and readable in a small circular badge; keep generous transparent margins so horns and ears fully fit. Match the reference's polished warm gouache painting and teal scales, cream belly, amber glasses exactly. Genuinely transparent alpha background; no library, no circle, no scenery, no floor or cast shadow. One character, no text, letters, UI, logos or watermark. Square canvas.

## bookshelf-bell.png

Asset: `public/assets/storybook/bookshelf-bell.png`. Reference: `bookshelf-before.png`.

Prompt: Use case: precise-object-edit. Asset type: one 4:3 illustrated game AFTER frame. Edit the referenced bookshelf scene. Preserve the exact library camera, perspective, shelves, window, bell on low book stack left, and crank/cart right. Keep precisely the same Pip, teal scales, amber spectacles, tiny wings, mustard satchel and gouache style. The bell has just rung. Change only the following action: many colorful books have magically unfolded and arranged themselves into a wonderful staircase rising diagonally through the MIDDLE from the floor near 38% across,88% down to the high page shelf at 74% across,25% down. Pip has climbed onto the upper part of the staircase near 62% across,39% down and reaches up joyfully. There is NO Pip left on the ground. The single blank cream page now flutters free just beyond Pip near 77% across,30% down. Add a few gentle golden magic curls between the stair books. Keep the cart LOW and EMPTY as in the before frame, this is the bell branch. Make the stairs obvious to a child. Do not add labels, writing, UI or watermark.

## bookshelf-handle.png

Asset: `public/assets/storybook/bookshelf-handle.png`. Reference: `bookshelf-before.png`.

Prompt: Use case: precise-object-edit. Asset type: one 4:3 illustrated game AFTER frame. Edit the referenced bookshelf scene; preserve EXACT camera, wooden shelves, window, brass bell left, all the background and same gouache rendering. Keep Pip the exact same teal dragon with round amber glasses and mustard satchel. The winding handle has just turned: the wheeled book cart on right is now an elevated wooden platform raised on a simple extended gold scissor-lift mechanism. Its platform is near the high page shelf at about 65% across,42% down; wheels remain on the ground and the scissor-lift structure extends continuously between wheels and platform. Pip now stands proudly ON THE RAISED PLATFORM near 63% across,29% down, reaching for the single blank cream page fluttering loose near77% across,22% down. No Pip on the floor. Books remain on shelves, NO book stairs anywhere. Brass bell left untouched. Clear changed cart height readable by child; cheerful magic, not technical diagram. No labels, writing, text, UI, logos or watermark.

## paper-boat-after.png

Asset: `public/assets/storybook/paper-boat-after.png`. Reference: `paper-boat-before.png`.

Prompt: Use case: precise-object-edit. Asset type: one 4:3 illustrated game AFTER frame. Edit referenced desktop scene. Preserve the EXACT desk, library shelves, perspective, lighting, ink puddle shape and ink bottle position. Preserve Pip's character: small teal dragon, round amber glasses, tiny wings, mustard satchel and warm gouache style. Change only the action: Pip now holds the coral folding fan in his paw, waving from left toward right with gentle curved air strokes. The SINGLE cream paper boat has sailed OUT of the middle of the puddle onto the clean dry wood at about 76% across,69% down. It is starting to open/unfold into a blank sheet, with one central fold still suggesting the boat. Remove the boat from the original puddle location, leave small fading ripples there. Pip looks delighted toward the rescued paper on the right. No extra boats or pages; bottle remains still, no new ink splashes, no writing, letters, UI, logos or watermark.

## page.png

Asset: `public/assets/storybook/page.png`. Reference: `sleepy-book-before.png`.

Prompt: Use case: illustration-story. Asset type: single transparent game sprite. Input is a style reference. Create just ONE blank cream parchment page floating slightly curled, a gentle S-bend suggesting a page fluttering through air. Warm hand-painted gouache texture matching the blank page in the reference; softly irregular edges, golden cream front with a slightly darker folded corner. Three-quarter frontal view readable as one sheet of paper, centered in a square canvas with generous empty margins. Genuinely transparent alpha background, no rectangular color background, no cast shadow, no scenery, no dragon, no book, no writing, no text, no letters, no interface, no watermark.

