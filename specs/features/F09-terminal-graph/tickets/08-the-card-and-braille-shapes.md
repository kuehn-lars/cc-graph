# 08: The card and braille shapes

**What to build:** The graph moves from one-cell glyphs and half-block staircases to braille dots on a dark card. The `Raster` becomes the card: rounded half-block corners, the card colour behind every cell, a sparse grid in the empty cells. Inside it each file node is a shape that says its state (filled disc, half disc, dotted circle, outline, exclamation mark, cross), sized by its tokens, with a ring in its change's colour and a white ring when selected. Import edges are dotted lines from rim to rim, all in the plain edge colour for now (focus comes in 11). The graph's bounding box is fitted to the card, so a small graph fills it. Memory files leave the raster; 12 names them under the card, and the list still shows them meanwhile.

Prefactor first: the renderer's single paint pass splits into a dot canvas (set a dot with a colour and a priority; encode cells as braille, U+2800 plus the prototype's bits `[[0x01, 0x08], [0x02, 0x10], [0x04, 0x20], [0x40, 0x80]][dotRow][dotColumn]`, each cell in its most important dot's colour), the shapes and edges drawn onto it, and the card around it. The existing labels (selected, changed, 5 largest) move to two columns right of a node's outermost ring, so AC6 and AC11 stay green until 10 replaces them. The palette is R22's.

Requirements: F09-R12, R14, R15, R16 (dotted import edges only), R22.

**Blocked by:** None (can start immediately)

**Touches:** `render` (dot canvas, braille encoder, card, shapes, edges, fit to view).

**Status:** ready-for-agent

- [ ] F09-AC13 an 84 × 24 `Raster`: corner rows `▗▄…▖` and `▝▀…▘` in `#14161b` on the default background, card background everywhere else, no half block outside those rows
- [ ] F09-AC14 `src/a.ts` `read`, 400 tokens, alone: its centre cell is `⣿` in `#7aa7ff`, its dots a disc of radius 9
- [ ] F09-AC15 a `compacted` node is an outline in `#5f6672` with an empty centre; a `ghost` is a cross in `#7d8590`
- [ ] F09-AC27 one node is drawn at the centre of the dot area; two nodes 10 units apart on one row sit symmetric about it
- [ ] A test helper decodes a braille cell back into its lit dots
- [ ] The step-3 test of AC4 checks shapes, not the glyphs `◐`, `●`, `◌`
- [ ] F09-AC4, AC5, AC7, AC6 and AC11 still pass; NFR-P3 still holds for 60 nodes and 120 edges
- [ ] The check command passes
